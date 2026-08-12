import uuid
import os
from typing import Optional, Union
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langgraph.types import Command
from dotenv import load_dotenv

# Load env variables
load_dotenv()

from graph import trip_graph, check_and_update_trip_call_status

app = FastAPI(title="Tripset AI agent-service")


class CreateTripRequest(BaseModel):
    rawRequest: str
    userId: str
    history: Optional[list] = None


class ApproveEnquiryRequest(BaseModel):
    hotelId: Union[str, int]


class DecisionRequest(BaseModel):
    decision: str  # "proceed" | "reject" | "modify"
    note: Optional[str] = None


from llm_extract import analyze_user_prompt

@app.post("/trips")
async def create_trip(payload: CreateTripRequest):
    # Check if the user request is just general chat or a planning request
    analysis = analyze_user_prompt(payload.rawRequest, payload.history)
    if not analysis.get("is_planning_request"):
        return {
            "tripId": None,
            "status": "chat",
            "chatResponse": analysis.get("chat_response", "Greetings! How can I help you plan a trip today?")
        }

    trip_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": trip_id}}

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
    return {"tripId": trip_id, "status": "awaiting_hotel_selection", **result}


@app.get("/trips/{trip_id}")
async def get_trip(trip_id: str):
    config = {"configurable": {"thread_id": trip_id}}
    state = trip_graph.get_state(config)
    if not state.values:
        raise HTTPException(status_code=404, detail="trip not found")
    values = dict(state.values)
    values = check_and_update_trip_call_status(trip_id, values)
    return values


@app.post("/trips/{trip_id}/approve-enquiry")
async def approve_enquiry(trip_id: str, payload: ApproveEnquiryRequest):
    config = {"configurable": {"thread_id": trip_id}}
    result = await trip_graph.ainvoke(Command(resume=str(payload.hotelId)), config)
    return {"status": "awaiting_call_decision", **result}


@app.post("/trips/{trip_id}/decision")
async def submit_decision(trip_id: str, payload: DecisionRequest):
    config = {"configurable": {"thread_id": trip_id}}

    if payload.decision == "modify":
        trip_graph.update_state(config, {"pending_modification": payload.note})
        result = await trip_graph.ainvoke(Command(resume=payload.decision, goto="rank_options"), config)
        return {"status": "awaiting_hotel_selection", **result}

    result = await trip_graph.ainvoke(Command(resume=payload.decision), config)
    status = "ready_for_booking" if payload.decision == "proceed" else "closed"
    return {"status": status, **result}