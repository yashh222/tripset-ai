from typing import TypedDict, Literal, Optional, List
from typing_extensions import Annotated
import operator


class HotelCandidate(TypedDict, total=False):
    hotel_id: str
    name: str
    price: float
    rating: float
    location: str
    amenities: List[str]
    phone_number: str
    est_total_cost: float
    within_budget: bool
    reason: str


class CallSummary(TypedDict, total=False):
    final_price: float
    taxes: str
    breakfast_included: bool
    cancellation_policy: str
    discounts: str
    amenities_confirmed: List[str]
    analysis_text: Optional[str]
    raw: str


class TripState(TypedDict, total=False):
    trip_id: str
    user_id: str
    raw_request: str

    # Extracted intent
    destination: str
    start_date: Optional[str]
    end_date: Optional[str]
    duration_days: int
    travelers: int
    budget_inr: int
    interests: List[str]
    constraints: List[str]

    # Research output (from the CrewAI crew)
    # Annotated + operator.add means LangGraph appends instead of overwriting
    # if more than one node ever writes to this key.
    hotel_candidates: Annotated[List[HotelCandidate], operator.add]
    weather_summary: Optional[str]

    # Ranking
    ranked_hotels: List[HotelCandidate]

    # Approval gate 1
    selected_hotel_id: Optional[str]
    enquiry_approved: bool

    # Voice call (Vapi)
    call_id: Optional[str]
    call_status: Literal["not_started", "in_progress", "completed", "failed"]
    call_transcript: Optional[str]
    call_summary: Optional[CallSummary]

    # Approval gate 2
    user_decision: Literal["pending", "proceed", "reject", "modify"]
    pending_modification: Optional[str]