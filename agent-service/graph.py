from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt

from state import TripState
from crew import run_research_crew
from tools import budget_calc_tool, vapi_call_tool, check_vapi_call_status
from llm_extract import extract_intent, extract_call_summary


def parse_intent(state: TripState):
    if state.get("destination") and state.get("start_date"):
        return {}
    return extract_intent(state["raw_request"])


import asyncio

async def research_crew_node(state: TripState):
    result = await asyncio.to_thread(
        run_research_crew, {
            "destination": state["destination"],
            "start_date": state["start_date"],
            "end_date": state["end_date"],
            "duration_days": state["duration_days"],
            "travelers": state["travelers"],
            "budget_inr": state["budget_inr"],
            "interests": state.get("interests", []),
            "constraints": state.get("constraints", []),
        }
    )
    return result


def rank_options(state: TripState):
    """This is the 'Budget Analyst' — pure arithmetic, no LLM."""
    if state.get("error") or not state.get("hotel_candidates"):
        return {
            "ranked_hotels": [],
            "error": state.get("error") or "Our server is currently experiencing high load. Please try again in a few moments."
        }

    scored = []
    for h in state["hotel_candidates"]:
        raw = budget_calc_tool.run(
            room_price=h["price"],
            duration_days=state["duration_days"],
        )
        import json
        est_total_cost = json.loads(raw)["est_total_cost"]
        scored.append({
            **h,
            "est_total_cost": est_total_cost,
            "within_budget": est_total_cost <= state["budget_inr"],
        })

    scored.sort(key=lambda h: (not h["within_budget"], -h["rating"]))
    top = scored[:4]
    for h in top:
        fit = "within" if h["within_budget"] else "slightly over"
        h["reason"] = f"{h['rating']}★, est ₹{h['est_total_cost']} total, {fit} your ₹{state['budget_inr']} budget"

    return {"ranked_hotels": top}


def present_options(state: TripState):
    """Pauses here if hotels are present. If error, passes through cleanly."""
    if state.get("error") or not state.get("ranked_hotels"):
        return {}
    chosen_hotel_id = interrupt({"type": "select_hotel", "ranked_hotels": state["ranked_hotels"]})
    return {"selected_hotel_id": chosen_hotel_id, "enquiry_approved": True}


def call_hotel(state: TripState):
    if state.get("error") or not state.get("ranked_hotels"):
        return {"call_status": "failed", "error": state.get("error") or "No hotels available to call"}

    ranked_hotels = state.get("ranked_hotels") or []
    selected_id = state.get("selected_hotel_id")

    hotel = next(
        (h for h in ranked_hotels if str(h.get("hotel_id")) == str(selected_id)),
        ranked_hotels[0] if ranked_hotels else {}
    )

    if not hotel or not hotel.get("name"):
        return {"call_status": "failed", "error": "Selected hotel details missing"}

    raw = vapi_call_tool.run(
        phone_number="+919420540017",  # Test phone number
        hotel_name=hotel.get("name", "Selected Hotel"),
        checklist=[
            "final price and taxes",
            "breakfast included",
            "cancellation policy",
            "discounts",
            "important amenities"
        ],
        check_in=state["start_date"],
        check_out=state["end_date"],
        travelers=int(state["travelers"]),
    )
    import json
    data = json.loads(raw)
    call_id = data.get("call_id")
    return {"call_status": "in_progress", "call_id": call_id, "call_transcript": ""}


def check_and_update_trip_call_status(trip_id: str, state_values: dict) -> dict:
    """If call is in_progress, check Vapi API. Once ended, analyze transcript with LLM."""
    if state_values.get("call_status") == "in_progress":
        call_id = state_values.get("call_id") or state_values.get("call_transcript")
        if call_id and not str(call_id).startswith("AI:") and not str(call_id).startswith("User:"):
            vapi_info = check_vapi_call_status(call_id)
            if vapi_info.get("ended"):
                transcript = vapi_info.get("transcript", "")
                selected_hotel_id = state_values.get("selected_hotel_id")
                ranked_hotels = state_values.get("ranked_hotels", [])
                selected_hotel = next(
                    (h for h in ranked_hotels if str(h.get("hotel_id")) == str(selected_hotel_id)),
                    None
                )
                hotel_name = selected_hotel.get("name") if selected_hotel else "the hotel"

                summary = extract_call_summary(transcript, hotel_name)

                config = {"configurable": {"thread_id": trip_id}}
                updates = {
                    "call_status": "completed",
                    "call_transcript": transcript,
                    "call_summary": summary
                }
                trip_graph.update_state(config, updates)
                state_values.update(updates)
    return state_values


builder = StateGraph(TripState)
builder.add_node("parse_intent", parse_intent)
builder.add_node("research_crew", research_crew_node)
builder.add_node("rank_options", rank_options)
builder.add_node("present_options", present_options)
builder.add_node("call_hotel", call_hotel)

builder.add_edge(START, "parse_intent")
builder.add_edge("parse_intent", "research_crew")
builder.add_edge("research_crew", "rank_options")
builder.add_edge("rank_options", "present_options")
builder.add_edge("present_options", "call_hotel")
builder.add_edge("call_hotel", END)

checkpointer = MemorySaver()
trip_graph = builder.compile(checkpointer=checkpointer)