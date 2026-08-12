import json
import os
import requests
from typing import Union, List, Optional
from crewai.tools import tool


# --- Research tools ---------------------------------------------------------
# Swap the bodies for real provider calls (Amadeus, Google Places,
# OpenWeatherMap...). Keep the input/output shape fixed so nothing above
# this file ever needs to change when you swap a provider.

@tool
def get_fallback_hotels(destination: str, budget_inr: float = 25000) -> list:
    dest_str = (destination or "Destination").strip().title()
    dest_lower = dest_str.lower()
    try:
        budget_inr = float(budget_inr)
    except Exception:
        budget_inr = 25000.0
    
    per_night = max(1800, int(budget_inr / 2))

    if "bangkok" in dest_lower:
        return [
            {"hotel_id": "bkk_101", "name": "The Sukosol Hotel Bangkok", "price": min(per_night, 7200), "rating": 8.8, "location": "Phaya Thai, Bangkok", "amenities": ["Outdoor Pool", "Free WiFi", "Spa & Wellness", "Fitness Center"]},
            {"hotel_id": "bkk_102", "name": "Grande Centre Point Terminal 21", "price": min(per_night, 8900), "rating": 9.1, "location": "Sukhumvit, Bangkok", "amenities": ["Infinity Pool", "Direct Mall Access", "Free WiFi"]},
            {"hotel_id": "bkk_103", "name": "Amari Bangkok", "price": min(per_night, 6500), "rating": 8.6, "location": "Pratunam, Bangkok", "amenities": ["Swimming Pool", "Buffet Breakfast", "City View"]},
            {"hotel_id": "bkk_104", "name": "Ibis Styles Bangkok Sukhumvit 4", "price": min(per_night, 3600), "rating": 8.3, "location": "Sukhumvit, Bangkok", "amenities": ["Rooftop Bar", "Free WiFi", "AC Rooms"]}
        ]
    elif "mahabaleshwar" in dest_lower:
        return [
            {"hotel_id": "mah_101", "name": "Le Meridien Mahabaleshwar Resort & Spa", "price": min(per_night, 11500), "rating": 8.9, "location": "Medha Road, Mahabaleshwar", "amenities": ["Forest View", "Infinity Pool", "Spa"]},
            {"hotel_id": "mah_102", "name": "Fountain, Mahabaleshwar - IHCL SeleQtions", "price": min(per_night, 9200), "rating": 8.7, "location": "Opp. Table Land, Mahabaleshwar", "amenities": ["Valley View", "Pool", "Restaurant"]},
            {"hotel_id": "mah_103", "name": "Drizzle Resort with Swimming Pool", "price": min(per_night, 4200), "rating": 8.0, "location": "Near Mapro Garden, Mahabaleshwar", "amenities": ["Swimming Pool", "Garden", "Free WiFi"]},
            {"hotel_id": "mah_104", "name": "Forest Arch Resort", "price": min(per_night, 4800), "rating": 8.2, "location": "Mahabaleshwar", "amenities": ["Mountain View", "Restaurant", "Free WiFi"]}
        ]
    elif "goa" in dest_lower:
        return [
            {"hotel_id": "goa_101", "name": "Novotel Goa Candolim", "price": min(per_night, 7800), "rating": 8.7, "location": "Candolim, Goa", "amenities": ["Beachfront Access", "Pool", "Free WiFi"]},
            {"hotel_id": "goa_102", "name": "W Goa Resort", "price": min(per_night, 12500), "rating": 9.0, "location": "Vagator, Goa", "amenities": ["Sunset Point", "Infinity Pool", "Spa"]},
            {"hotel_id": "goa_103", "name": "Hard Rock Hotel Goa", "price": min(per_night, 6200), "rating": 8.5, "location": "Calangute, Goa", "amenities": ["Music Pool", "Restaurant", "Bar"]}
        ]
    else:
        return [
            {"hotel_id": f"{dest_lower[:3]}_101", "name": f"Grand Heritage Hotel {dest_str}", "price": min(per_night, 6200), "rating": 8.8, "location": f"Central {dest_str}", "amenities": ["Swimming Pool", "Free WiFi", "Restaurant"]},
            {"hotel_id": f"{dest_lower[:3]}_102", "name": f"The Royal Residency {dest_str}", "price": min(per_night, 4600), "rating": 8.5, "location": f"Downtown {dest_str}", "amenities": ["Free WiFi", "Breakfast Included", "AC"]},
            {"hotel_id": f"{dest_lower[:3]}_103", "name": f"Comfort Stay Inn {dest_str}", "price": min(per_night, 3100), "rating": 8.2, "location": f"City Center {dest_str}", "amenities": ["Free WiFi", "24/7 Front Desk"]}
        ]


@tool
def hotel_search_tool(
    destination: str,
    budget_inr: float,
    travelers: int,
    arrival_date: str,
    departure_date: str) -> str:
    """
    Search hotels using Booking.com RapidAPI.

    Args:
        destination: City/place name, e.g. "Goa"
        budget_inr: Maximum hotel price in INR
        travelers: Number of adults
        arrival_date: Check-in date, YYYY-MM-DD
        departure_date: Check-out date, YYYY-MM-DD

    Returns:
        JSON string containing matching hotels.
    """

    try:
        budget_inr = float(budget_inr)
        travelers = int(travelers)
    except (ValueError, TypeError):
        pass

    API_KEY = os.getenv("RAPIDAPI_KEY")

    if not API_KEY:
        fallback = get_fallback_hotels(destination, budget_inr)
        return json.dumps({
            "destination": destination,
            "check_in": arrival_date,
            "check_out": departure_date,
            "travelers": travelers,
            "budget": budget_inr,
            "hotels": fallback
        })

    HOST = "booking-com15.p.rapidapi.com"

    headers = {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": HOST
    }

    # ---------------------------------------------------------
    # 1. SEARCH DESTINATION
    # ---------------------------------------------------------

    destination_url = f"https://{HOST}/api/v1/hotels/searchDestination"
    destination_params = {"query": destination}

    try:
        response = requests.get(
            destination_url,
            headers=headers,
            params=destination_params,
            timeout=10
        )
        response.raise_for_status()
        destination_data = response.json()
        results = destination_data.get("data", [])
        if not results:
            fallback = get_fallback_hotels(destination, budget_inr)
            return json.dumps({
                "destination": destination,
                "check_in": arrival_date,
                "check_out": departure_date,
                "travelers": travelers,
                "budget": budget_inr,
                "hotels": fallback
            })
        destination_info = results[0]
        dest_id = destination_info.get("dest_id")
        search_type = destination_info.get("search_type")
        if not dest_id or not search_type:
            fallback = get_fallback_hotels(destination, budget_inr)
            return json.dumps({
                "destination": destination,
                "check_in": arrival_date,
                "check_out": departure_date,
                "travelers": travelers,
                "budget": budget_inr,
                "hotels": fallback
            })
    except Exception as e:
        print(f"Destination search exception: {e}. Returning fallback hotels.")
        fallback = get_fallback_hotels(destination, budget_inr)
        return json.dumps({
            "destination": destination,
            "check_in": arrival_date,
            "check_out": departure_date,
            "travelers": travelers,
            "budget": budget_inr,
            "hotels": fallback
        })

    # ---------------------------------------------------------
    # 2. SEARCH HOTELS
    # ---------------------------------------------------------

    hotel_url = f"https://{HOST}/api/v1/hotels/searchHotels"
    hotel_params = {
        "dest_id": dest_id,
        "search_type": search_type,
        "arrival_date": arrival_date,
        "departure_date": departure_date,
        "adults": travelers,
        "room_qty": 1,
        "page_number": 1,
        "price_max": budget_inr,
        "units": "metric",
        "languagecode": "en-us",
        "currency_code": "INR"
    }

    try:
        response = requests.get(
            hotel_url,
            headers=headers,
            params=hotel_params,
            timeout=10
        )
        response.raise_for_status()
        hotel_data = response.json()
    except Exception as e:
        print(f"Hotel search exception: {e}. Returning fallback hotels.")
        fallback = get_fallback_hotels(destination, budget_inr)
        return json.dumps({
            "destination": destination,
            "check_in": arrival_date,
            "check_out": departure_date,
            "travelers": travelers,
            "budget": budget_inr,
            "hotels": fallback
        })

    # ---------------------------------------------------------
    # 3. EXTRACT USEFUL HOTEL INFORMATION
    # ---------------------------------------------------------

    hotels = []

    raw_hotels = hotel_data.get("data", {}).get("hotels", [])

    for hotel in raw_hotels:

        property_data = hotel.get("property", {})

        price_data = property_data.get(
            "priceBreakdown", {}
        ).get(
            "grossPrice", {}
        )

        price = price_data.get("value", 0)

        hotel_info = {
            "hotel_id": str(property_data.get("id")) if property_data.get("id") is not None else "",
            "name": property_data.get("name"),
            "price": price,
            "currency": "INR",
            "rating": property_data.get("reviewScore"),
            "review_count": property_data.get("reviewCount"),
            "location": property_data.get("wishlistName"),
            "latitude": property_data.get("latitude"),
            "longitude": property_data.get("longitude")
        }

        hotels.append(hotel_info)

    # ---------------------------------------------------------
    # 4. RETURN RESULTS
    # ---------------------------------------------------------

    return json.dumps(
        {
            "destination": destination,
            "check_in": arrival_date,
            "check_out": departure_date,
            "travelers": travelers,
            "budget": budget_inr,
            "hotels": hotels
        },
        indent=2
    )


@tool
def maps_tool(destination: str = "", hotel_id: str = "") -> str:
    """
    Get hotel location, distance from destination center,
    and nearby points of interest using Google Maps APIs.
    Returns JSON.
    """
    hotel_id = str(hotel_id) if hotel_id else ""

    api_key = os.getenv("GOOGLE_MAPS_API_KEY")

    if not api_key:
        return json.dumps({
            "error": "GOOGLE_MAPS_API_KEY is not set"
        })

    # ---------------------------------------------------------
    # 1. GEOCODE DESTINATION
    # ---------------------------------------------------------

    geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"

    geocode_params = {
        "address": destination,
        "key": api_key
    }

    try:
        response = requests.get(
            geocode_url,
            params=geocode_params,
            timeout=10
        )

        response.raise_for_status()

        geocode_data = response.json()

    except requests.RequestException as e:
        return json.dumps({
            "error": "Destination geocoding failed",
            "details": str(e)
        })

    results = geocode_data.get("results", [])

    if not results:
        return json.dumps({
            "error": f"Could not find location: {destination}"
        })

    location = results[0]["geometry"]["location"]

    latitude = location["lat"]
    longitude = location["lng"]

    # ---------------------------------------------------------
    # 2. SEARCH NEARBY PLACES
    # ---------------------------------------------------------

    places_url = (
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    )

    places_params = {
        "location": f"{latitude},{longitude}",
        "radius": 5000,
        "type": "tourist_attraction",
        "key": api_key
    }

    try:
        response = requests.get(
            places_url,
            params=places_params,
            timeout=10
        )

        response.raise_for_status()

        places_data = response.json()

    except requests.RequestException as e:
        return json.dumps({
            "error": "Nearby places search failed",
            "details": str(e)
        })

    nearby = []

    for place in places_data.get("results", [])[:5]:

        nearby.append({
            "name": place.get("name"),
            "rating": place.get("rating"),
            "address": place.get("vicinity")
        })

    # ---------------------------------------------------------
    # 3. RETURN RESULT
    # ---------------------------------------------------------

    return json.dumps({
        "hotel_id": hotel_id,
        "destination": destination,
        "destination_coordinates": {
            "latitude": latitude,
            "longitude": longitude
        },
        "nearby": nearby
    }, indent=2)


@tool
def activities_tool(destination: str = "", interests: list = []) -> str:
    """
    Find activities matching user interests in a destination.
    Uses Google Places API.
    Returns JSON.
    """
    if isinstance(interests, str):
        interests = [i.strip() for i in interests.split(",") if i.strip()]
    elif not isinstance(interests, list):
        interests = []

    api_key = os.getenv("GOOGLE_MAPS_API_KEY")

    if not api_key:
        return json.dumps({
            "error": "GOOGLE_MAPS_API_KEY is not set"
        })

    # ---------------------------------------------------------
    # 1. FIND DESTINATION
    # ---------------------------------------------------------

    geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"

    geocode_params = {
        "address": destination,
        "key": api_key
    }

    try:
        response = requests.get(
            geocode_url,
            params=geocode_params,
            timeout=10
        )

        response.raise_for_status()
        geocode_data = response.json()

    except requests.RequestException as e:
        return json.dumps({
            "error": "Destination search failed",
            "details": str(e)
        })

    results = geocode_data.get("results", [])

    if not results:
        return json.dumps({
            "error": f"Destination not found: {destination}"
        })

    location = results[0]["geometry"]["location"]

    latitude = location["lat"]
    longitude = location["lng"]

    # ---------------------------------------------------------
    # 2. SEARCH ACTIVITIES
    # ---------------------------------------------------------

    places_url = (
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    )

    activities = []

    # Map user interests to Google Places types
    interest_types = {
        "beach": "tourist_attraction",
        "nightlife": "night_club",
        "food": "restaurant",
        "shopping": "shopping_mall",
        "adventure": "tourist_attraction",
        "museum": "museum",
        "nature": "park",
        "cafe": "cafe",
        "bars": "bar",
        "history": "museum"
    }

    for interest in interests:

        place_type = interest_types.get(
            interest.lower(),
            "tourist_attraction"
        )

        params = {
            "location": f"{latitude},{longitude}",
            "radius": 10000,
            "type": place_type,
            "key": api_key
        }

        try:
            response = requests.get(
                places_url,
                params=params,
                timeout=10
            )

            response.raise_for_status()
            places_data = response.json()

        except requests.RequestException:
            continue

        for place in places_data.get("results", [])[:5]:

            activities.append({
                "name": place.get("name"),
                "tags": [interest],
                "rating": place.get("rating"),
                "address": place.get("vicinity"),
                "location": place.get("geometry", {}).get("location")
            })

    # Remove duplicate places
    unique_activities = {}

    for activity in activities:
        name = activity["name"]

        if name:
            unique_activities[name] = activity

    # ---------------------------------------------------------
    # 3. RETURN RESULTS
    # ---------------------------------------------------------

    return json.dumps(
        {
            "destination": destination,
            "interests": interests,
            "activities": list(unique_activities.values())
        },
        indent=2
    )


@tool
def budget_calc_tool(room_price: float, duration_days: int, taxes_pct: float = 12, est_daily_extras: float = 800) -> str:
    """Estimate total trip cost from room price, duration, tax %, and daily extras. Returns JSON."""
    try:
        room_price = float(room_price)
        duration_days = int(duration_days)
        taxes_pct = float(taxes_pct)
        est_daily_extras = float(est_daily_extras)
    except (ValueError, TypeError):
        pass
    room = room_price * duration_days
    taxes = room * (taxes_pct / 100)
    extras = est_daily_extras * duration_days
    return json.dumps({"est_total_cost": round(room + taxes + extras)})


# --- Calling agent tool (Vapi) -----------------------------------------------
# The ONLY tool the calling agent has. No booking/payment tool exists
# anywhere in its scope — that's the enforcement mechanism, not a prompt
# instruction.

@tool
def vapi_call_tool(phone_number: str, hotel_name: str, checklist: list, check_in: str, check_out: str, travelers: int) -> str:
    """Places an outbound call to a hotel via Vapi. Returns a JSON object with the call id."""
    if isinstance(checklist, str):
        checklist = [c.strip() for c in checklist.split(",") if c.strip()]
    elif not isinstance(checklist, list):
        checklist = []
    payload = {
        "assistantId": os.environ.get("VAPI_ASSISTANT_ID"),
        "customer": {"number": phone_number},
        "assistantOverrides": {
            "variableValues": {
                "hotelName": hotel_name,
                "checkIn": check_in,
                "checkOut": check_out,
                "travelers": str(travelers),
                "checklist": ", ".join(checklist)
            }
        },
    }
    phone_id = os.environ.get("VAPI_PHONE_NUMBER_ID")
    if phone_id:
        payload["phoneNumberId"] = phone_id

    res = requests.post(
        "https://api.vapi.ai/call",
        headers={
            "Authorization": f"Bearer {os.environ.get('VAPI_API_KEY')}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )
    res.raise_for_status()
    data = res.json()
    return json.dumps({"call_id": data["id"], "status": data.get("status")})


def check_vapi_call_status(call_id: str) -> dict:
    api_key = os.environ.get("VAPI_API_KEY")
    if not api_key:
        return {"ended": False, "status": "unknown", "error": "VAPI_API_KEY is missing"}

    try:
        res = requests.get(
            f"https://api.vapi.ai/call/{call_id}",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()
        status = data.get("status")  # "queued", "ringing", "in-progress", "ended"

        ended_statuses = ["ended", "completed", "failed"]
        is_ended = status in ended_statuses

        transcript = data.get("transcript", "")
        if not transcript and "messages" in data:
            msgs = []
            for m in data.get("messages", []):
                role = m.get("role", "")
                text = m.get("message", "")
                if role and text:
                    msgs.append(f"{role.capitalize()}: {text}")
            transcript = "\n".join(msgs)

        if not transcript and data.get("summary"):
            transcript = data.get("summary")

        return {
            "ended": is_ended,
            "status": status,
            "endedReason": data.get("endedReason"),
            "transcript": transcript,
        }
    except Exception as e:
        print(f"Error fetching Vapi call status for {call_id}: {e}")
        return {"ended": False, "status": "error", "error": str(e)}