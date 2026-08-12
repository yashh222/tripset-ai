from typing import Optional, List
from datetime import datetime
from langchain_groq import ChatGroq

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

INTENT_SCHEMA = {
    "title": "trip_intent",
    "type": "object",
    "properties": {
        "destination": {"type": "string", "description": "Destination city. MUST be empty string if NOT explicitly mentioned by the user."},
        "start_date": {"type": "string", "description": "Check-in date in YYYY-MM-DD format. MUST be empty string if NOT explicitly mentioned. Do NOT guess or hallucinate."},
        "end_date": {"type": "string", "description": "Check-out date in YYYY-MM-DD format. MUST be empty string if NOT explicitly mentioned. Do NOT guess or hallucinate."},
        "travelers": {"type": "number", "description": "Number of travelers. MUST be 0 if NOT explicitly mentioned by the user."},
        "budget_inr": {"type": "number", "description": "Total budget in INR. MUST be 0 if NOT explicitly mentioned by the user."},
        "interests": {"type": "array", "items": {"type": "string"}},
        "constraints": {"type": "array", "items": {"type": "string"}},
    },
    "required": [],
}

ANALYSIS_SCHEMA = {
    "title": "request_analysis",
    "type": "object",
    "properties": {
        "is_planning_request": {
            "type": "boolean",
            "description": "True if the user is asking to plan, schedule or build a travel trip. False if it is a general chat greeting, question, or informational inquiry."
        },
        "chat_response": {
            "type": "string",
            "description": "If is_planning_request is False, write a friendly and helpful response to the user's greeting or question here."
        },
        "destination": {"type": "string"},
        "duration_days": {"type": "number"},
        "travelers": {"type": "number"},
        "budget_inr": {"type": "number"},
        "interests": {"type": "array", "items": {"type": "string"}},
        "constraints": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["is_planning_request"],
}

CALL_SUMMARY_SCHEMA = {
    "title": "call_summary",
    "type": "object",
    "properties": {
        "final_price": {"type": "number"},
        "taxes": {"type": "string"},
        "breakfast_included": {"type": "boolean"},
        "cancellation_policy": {"type": "string"},
        "discounts": {"type": "string"},
        "amenities_confirmed": {"type": "array", "items": {"type": "string"}},
        "analysis_text": {
            "type": "string",
            "description": "A clear, comprehensive, and helpful 2-3 sentence analysis of the phone conversation with the hotel front desk for the user."
        }
    },
}


def analyze_user_prompt(raw_request: str, history: Optional[list] = None) -> dict:
    # 1. Format the conversation history
    conversation_str = ""
    if history:
        for msg in history:
            sender = "User" if msg.get("sender") == "user" else "Assistant"
            conversation_str += f"{sender}: {msg.get('text')}\n"
    conversation_str += f"User: {raw_request}\n"

    # 2. Classify the message intent using the history context
    classifier_prompt = (
        "You are parsing a chat transcript between a User and a travel assistant.\n"
        "Analyze the conversation and classify if the user wants to plan, schedule, search, or build a travel trip (e.g. searching hotels/activities in a destination, or providing travel dates, budget, etc. to continue a planning query).\n"
        "Reply with exactly 'PLANNING' if the user's intent is planning-related.\n"
        "Reply with exactly 'CHAT' if the user is just saying hello, greeting the assistant, asking general chat questions, or having general conversation unrelated to planning a concrete trip.\n\n"
        f"Conversation History:\n{conversation_str}\n\n"
        "Category (PLANNING or CHAT):"
    )
    classification = llm.invoke(classifier_prompt).content.strip().upper()
    
    if "PLANNING" not in classification:
        # Generate a general chat response
        chat_prompt = (
            "You are Tripset AI, an intelligent, helpful travel assistant. "
            "Reply to the user's greeting or general question in a friendly, conversational manner.\n"
            f"User message: {raw_request}\n"
            "Response:"
        )
        chat_res = llm.invoke(chat_prompt).content
        return {
            "is_planning_request": False,
            "chat_response": chat_res
        }
    
    # 3. It is planning! Invoke our structured extract schema
    current_date_ref = datetime.now().strftime("%Y-%m-%d")
    structured = llm.with_structured_output(INTENT_SCHEMA)
    extracted = structured.invoke(
        "You are a strict data extraction system. Identify ONLY the travel requirements that are explicitly mentioned in the conversation.\n"
        f"Today's date is {current_date_ref}. Resolve any relative check-in or check-out dates.\n"
        "CRITICAL RULES:\n"
        "1. The LAST message in the transcript is the user's latest prompt. If the user specifies a new destination in the latest message, ALWAYS extract that new destination, completely ignoring any old destination mentioned in prior history.\n"
        "2. Do NOT invent, guess, or hallucinate any parameters. If a field is not mentioned, leave it empty/null.\n"
        "3. Only extract values present in the conversation.\n\n"
        f"Conversation transcript:\n{conversation_str}"
    )
    
    # 4. Check if any required variables are missing
    missing_fields = []
    if not extracted.get("destination") or str(extracted.get("destination")).strip() == "":
        missing_fields.append("destination city")
    if not extracted.get("start_date") or str(extracted.get("start_date")).strip() == "":
        missing_fields.append("start/check-in date")
    if not extracted.get("end_date") or str(extracted.get("end_date")).strip() == "":
        missing_fields.append("end/check-out date")
    if not extracted.get("travelers") or extracted.get("travelers") == 0:
        missing_fields.append("number of travelers")
    if not extracted.get("budget_inr") or extracted.get("budget_inr") == 0:
        missing_fields.append("budget in INR")

    if missing_fields:
        # Prompt LLM to ask for these details in a friendly way
        query_missing_prompt = (
            "You are Tripset AI, an intelligent, helpful travel assistant.\n"
            f"The user wants to plan a trip, but we are missing the following details: {', '.join(missing_fields)}.\n"
            "Ask the user friendly, natural, and concise questions to provide this missing information.\n"
            f"Conversation History:\n{conversation_str}\n\n"
            "Assistant request for details:"
        )
        chat_res = llm.invoke(query_missing_prompt).content
        return {
            "is_planning_request": False,
            "chat_response": chat_res
        }

    try:
        s_dt = datetime.strptime(extracted.get("start_date"), "%Y-%m-%d")
        e_dt = datetime.strptime(extracted.get("end_date"), "%Y-%m-%d")
        duration_days = max(1, (e_dt - s_dt).days)
    except Exception:
        duration_days = 4

    return {
        "is_planning_request": True,
        "chat_response": "",
        "destination": extracted.get("destination"),
        "start_date": extracted.get("start_date"),
        "end_date": extracted.get("end_date"),
        "duration_days": duration_days,
        "travelers": int(extracted.get("travelers") or 2),
        "budget_inr": float(extracted.get("budget_inr") or 25000),
        "interests": extracted.get("interests", []),
        "constraints": extracted.get("constraints", [])
    }


def extract_intent(raw_request: str, history: Optional[list] = None) -> dict:
    analysis = analyze_user_prompt(raw_request, history)
    return {
        "destination": analysis.get("destination", "Goa"),
        "start_date": analysis.get("start_date"),
        "end_date": analysis.get("end_date"),
        "duration_days": int(analysis.get("duration_days") or 4),
        "travelers": int(analysis.get("travelers") or 2),
        "budget_inr": float(analysis.get("budget_inr") or 25000),
        "interests": analysis.get("interests", []),
        "constraints": analysis.get("constraints", []),
    }


def extract_call_summary(transcript: str, hotel_name: str = "") -> dict:
    if not transcript or not transcript.strip() or len(transcript.strip()) < 5:
        return {
            "final_price": 0,
            "taxes": "N/A",
            "breakfast_included": False,
            "cancellation_policy": "No conversation recorded",
            "discounts": "None",
            "amenities_confirmed": [],
            "analysis_text": f"Voice call with {hotel_name or 'the hotel'} completed, but no detailed transcript was available.",
            "raw": transcript or ""
        }

    try:
        structured = llm.with_structured_output(CALL_SUMMARY_SCHEMA)
        result = structured.invoke(
            f"You are analyzing a voice phone call transcript between Tripset AI agent and front-desk staff at {hotel_name or 'the hotel'}.\n"
            f"Extract all booking details (final_price, taxes, breakfast_included, cancellation_policy, discounts, amenities_confirmed) and write a clear, helpful analysis_text summarizing the conversation for the user.\n\n"
            f"Call Transcript:\n{transcript}"
        )
        if not isinstance(result, dict):
            result = {}
        result["raw"] = transcript
        if not result.get("analysis_text"):
            result["analysis_text"] = f"Voice verification call with {hotel_name or 'the hotel'} complete. Negotiated price: ₹{result.get('final_price', 'N/A')}."
        return result
    except Exception as e:
        print(f"Error extracting call summary: {e}")
        return {
            "final_price": 0,
            "taxes": "N/A",
            "breakfast_included": False,
            "cancellation_policy": "N/A",
            "discounts": "None",
            "amenities_confirmed": [],
            "analysis_text": f"Voice verification call with {hotel_name or 'the hotel'} complete.",
            "raw": transcript
        }