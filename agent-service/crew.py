import json
import os
import re
from datetime import datetime

os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"
os.environ["CREWAI_TRACING_ENABLED"] = "false"

from crewai import Agent, Task, Crew, Process, LLM
from tools import hotel_search_tool, maps_tool, activities_tool, get_fallback_hotels

llm = LLM(
    model="openai/llama-3.1-8b-instant",
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("GROQ_API_KEY"),
    temperature=0
)


hotel_scout = Agent(
    role="Hotel Scout",
    goal="Find hotels in {destination} matching the traveler's budget and dates",
    backstory="You are excellent at filtering hotel inventory by price, location, and rating.",
    tools=[hotel_search_tool],
    verbose=True,
    llm=llm,
)

local_expert = Agent(
    role="Local Expert",
    goal="Surface weather and nearby activities/nightlife matching the traveler's interests",
    backstory="You know {destination} well — what's near what, what's worth doing, what the weather will be like.",
    tools=[activities_tool, maps_tool],
    verbose=True,
    llm=llm,
)

scout_task = Task(
    description=(
        "Find 3-4 hotel candidates in {destination} from {start_date} to {end_date} ({duration_days} days), "
        "{travelers} travelers, under {budget_inr} INR total budget. "
        "Constraints to respect: {constraints}. "
        "Use start_date '{start_date}' and end_date '{end_date}' when calling hotel_search_tool. Do not guess or make up dates. "
        "Return ONLY a JSON array of objects with fields: "
        "hotel_id, name, price, rating, location, amenities."
    ),
    agent=hotel_scout,
    expected_output="A JSON array of hotel candidates, nothing else.",
)

local_task = Task(
    description=(
        "The traveler's interests are: {interests}. "
        "note any activities/nightlife/beaches "
        "matching their interests near {destination}. "
        "Return ONLY a JSON object: {{\"highlights\": [string, ...]}}."
    ),
    agent=local_expert,
    expected_output="A JSON object with highlights, nothing else.",
    context=[scout_task],
)

research_crew = Crew(
    agents=[hotel_scout, local_expert],
    tasks=[scout_task, local_task],
    process=Process.sequential,
)


def normalize_date(date_str: str) -> str:
    if not date_str or not isinstance(date_str, str):
        return ""
    date_str = date_str.strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        return date_str
    for fmt in ("%d %b %Y", "%d %B %Y", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str


def parse_json_markdown(text: str):
    text = text.strip()
    if text.startswith("```"):
        if text.endswith("```"):
            text = text[3:-3].strip()
        else:
            text = text[3:].strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    
    start_bracket = text.find("[")
    start_brace = text.find("{")
    
    if start_bracket != -1 and (start_brace == -1 or start_bracket < start_brace):
        start_idx = start_bracket
        end_idx = text.rfind("]")
    else:
        start_idx = start_brace
        end_idx = text.rfind("}")
        
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx:end_idx+1]
        
    return json.loads(text)


def run_research_crew(inputs: dict) -> dict:
    """Kicks off the crew and returns parsed results in the shape the graph expects."""
    # Normalize check-in / check-out dates to YYYY-MM-DD
    if inputs.get("start_date"):
        inputs["start_date"] = normalize_date(str(inputs["start_date"]))
    if inputs.get("end_date"):
        inputs["end_date"] = normalize_date(str(inputs["end_date"]))

    destination = inputs.get("destination", "Bangkok")
    budget_inr = inputs.get("budget_inr", 25000)
    interests = inputs.get("interests", [])
    
    # If no specific interests are explicitly requested by user, run ONLY Hotel Scout for fast execution speed
    if not interests:
        scout_crew = Crew(
            agents=[hotel_scout],
            tasks=[scout_task],
            process=Process.sequential,
        )
        crew_output = scout_crew.kickoff(inputs=inputs)
        raw_0 = crew_output.tasks_output[0].raw
        print("SCOUT TASK RAW OUTPUT:", repr(raw_0))
        
        try:
            hotel_candidates = parse_json_markdown(raw_0)
            if isinstance(hotel_candidates, dict) and "hotels" in hotel_candidates:
                hotel_candidates = hotel_candidates["hotels"]
            elif isinstance(hotel_candidates, dict):
                hotel_candidates = [hotel_candidates]
            if not isinstance(hotel_candidates, list) or len(hotel_candidates) == 0:
                hotel_candidates = get_fallback_hotels(destination, budget_inr)
        except Exception as e:
            print("Failed to parse scout task JSON:", e, "Raw:", raw_0)
            hotel_candidates = get_fallback_hotels(destination, budget_inr)

        return {
            "hotel_candidates": hotel_candidates,
            "weather_summary": "Pleasant, clear skies",
        }

    # If specific interests are requested, run both scout and local expert
    crew_output = research_crew.kickoff(inputs=inputs)

    raw_0 = crew_output.tasks_output[0].raw
    raw_1 = crew_output.tasks_output[1].raw
    print("TASK 0 RAW OUTPUT:", repr(raw_0))
    print("TASK 1 RAW OUTPUT:", repr(raw_1))

    try:
        hotel_candidates = parse_json_markdown(raw_0)
        if isinstance(hotel_candidates, dict) and "hotels" in hotel_candidates:
            hotel_candidates = hotel_candidates["hotels"]
        elif isinstance(hotel_candidates, dict):
            hotel_candidates = [hotel_candidates]
        if not isinstance(hotel_candidates, list) or len(hotel_candidates) == 0:
            hotel_candidates = get_fallback_hotels(destination, budget_inr)
    except Exception as e:
        print("Failed to parse task 0 JSON. Error:", e, "Raw value:", raw_0)
        hotel_candidates = get_fallback_hotels(destination, budget_inr)

    try:
        local_data = parse_json_markdown(raw_1)
    except Exception as e:
        print("Failed to parse task 1 JSON. Error:", e, "Raw value:", raw_1)
        local_data = {"weather_summary": "Sunny, 28-32°C", "highlights": []}

    return {
        "hotel_candidates": hotel_candidates,
        "weather_summary": local_data.get("weather_summary", "Sunny, 28-32°C"),
    }