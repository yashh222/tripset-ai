try:
    __import__('pysqlite3')
    import sys
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    pass

import os
import sys
import uuid
from pathlib import Path
from typing import Optional, Union

# Ensure agent-service directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langgraph.types import Command

# Load environment variables
load_dotenv()

# Import your LangGraph agent
from graph import trip_graph, check_and_update_trip_call_status
from llm_extract import analyze_user_prompt


app = FastAPI(
    title="Tripset AI Agent Service",
    version="1.0.0",
)


# ============================================================
# Request Models
# ============================================================

class CreateTripRequest(BaseModel):
    rawRequest: str
    userId: str
    history: Optional[list] = None


class ApproveEnquiryRequest(BaseModel):
    hotelId: Union[str, int]


class DecisionRequest(BaseModel):
    decision: str  # "proceed" | "reject" | "modify"
    note: Optional[str] = None


# ============================================================
# Health Check
# ============================================================

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Tripset AI Agent Service",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "tripset-agent",
    }


# ============================================================
# Create Trip
# ============================================================

@app.post("/trips")
async def create_trip(payload: CreateTripRequest):
    # Check whether the request is general chat
    # or an actual trip-planning request.
    analysis = analyze_user_prompt(
        payload.rawRequest,
        payload.history,
    )

    # General conversation
    if not analysis.get("is_planning_request"):
        return {
            "tripId": None,
            "status": "chat",
            "chatResponse": analysis.get(
                "chat_response",
                "Greetings! How can I help you plan a trip today?",
            ),
        }

    # Create unique trip ID
    trip_id = str(uuid.uuid4())

    # LangGraph thread configuration
    config = {
        "configurable": {
            "thread_id": trip_id
        }
    }

    # Start trip graph
    result = await trip_graph.ainvoke(
        {
            "trip_id": trip_id,
            "user_id": payload.userId,
            "raw_request": payload.rawRequest,
            "destination": analysis.get("destination"),
            "start_date": analysis.get("start_date"),
            "end_date": analysis.get("end_date"),
            "duration_days": analysis.get("duration_days"),
            "travelers": analysis.get("travelers"),
            "budget_inr": analysis.get("budget_inr"),
            "interests": analysis.get("interests", []),
            "constraints": analysis.get("constraints", []),
        },
        config,
    )

    if result.get("error") or not result.get("ranked_hotels"):
        err_msg = result.get("error") or "Our server is currently experiencing high load. Please try again in a few moments."
        return {
            "tripId": None,
            "status": "error",
            "error": err_msg,
            "chatResponse": err_msg,
        }

    return {
        "tripId": trip_id,
        "status": "awaiting_hotel_selection",
        **result,
    }


# ============================================================
# Get Trip
# ============================================================

@app.get("/trips/{trip_id}")
async def get_trip(trip_id: str):
    config = {
        "configurable": {
            "thread_id": trip_id
        }
    }

    state = trip_graph.get_state(config)

    if not state.values:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    values = dict(state.values)

    values = check_and_update_trip_call_status(
        trip_id,
        values,
    )

    return values


# ============================================================
# Approve Hotel Enquiry
# ============================================================

@app.post("/trips/{trip_id}/approve-enquiry")
async def approve_enquiry(
    trip_id: str,
    payload: ApproveEnquiryRequest,
):
    config = {
        "configurable": {
            "thread_id": trip_id
        }
    }

    result = await trip_graph.ainvoke(
        Command(
            resume=str(payload.hotelId)
        ),
        config,
    )

    return {
        "status": "awaiting_call_decision",
        **result,
    }


# ============================================================
# Submit Decision
# ============================================================

@app.post("/trips/{trip_id}/decision")
async def submit_decision(
    trip_id: str,
    payload: DecisionRequest,
):
    config = {
        "configurable": {
            "thread_id": trip_id
        }
    }

    # Validate decision
    if payload.decision not in ["proceed", "reject", "modify"]:
        raise HTTPException(
            status_code=400,
            detail="Decision must be proceed, reject, or modify",
        )

    # Modify trip
    if payload.decision == "modify":
        trip_graph.update_state(
            config,
            {
                "pending_modification": payload.note
            },
        )

        result = await trip_graph.ainvoke(
            Command(
                resume=payload.decision,
                goto="rank_options",
            ),
            config,
        )

        return {
            "status": "awaiting_hotel_selection",
            **result,
        }

    # Proceed / Reject
    result = await trip_graph.ainvoke(
        Command(
            resume=payload.decision
        ),
        config,
    )

    status = (
        "ready_for_booking"
        if payload.decision == "proceed"
        else "closed"
    )

    return {
        "status": status,
        **result,
    }