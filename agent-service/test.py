import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("VAPI_API_KEY")
ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID")
PHONE_NUMBER_ID = os.getenv("VAPI_PHONE_NUMBER_ID")
MY_NUMBER = os.getenv("MY_NUMBER")

url = "https://api.vapi.ai/call"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "assistantId": ASSISTANT_ID,
    "phoneNumberId": PHONE_NUMBER_ID,
    "customer": {
        "number": MY_NUMBER
    },
    "assistantOverrides": {
        "variableValues": {
            "hotelName": "Test Hotel Goa",
            "checkIn": "2026-08-20",
            "checkOut": "2026-08-24",
            "travelers": "2",
            "checklist": (
                "final price and taxes, "
                "breakfast included, "
                "cancellation policy, "
                "discounts, "
                "important amenities"
            )
        }
    }
}

print("🚀 Starting Vapi test call...")

# Check environment variables
print("API key loaded:", bool(API_KEY))
print("Assistant ID loaded:", bool(ASSISTANT_ID))
print("Phone number ID loaded:", bool(PHONE_NUMBER_ID))
print("My number loaded:", bool(MY_NUMBER))

response = requests.post(
    url,
    headers=headers,
    json=payload,
    timeout=20
)

print("📞 Vapi response status:", response.status_code)
print("📦 Vapi response:")
print(response.text)

if response.status_code == 201:
    call_data = response.json()
    call_id = call_data["id"]

    print("📞 Call ID:", call_id)
    print("⏳ Wait until the phone call finishes.")