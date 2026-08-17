import ChatState from "../models/chatState.model.js";
import ChatHistory from "../models/chatHistory.model.js";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

async function forward(path, options = {}) {
  const res = await fetch(`${AGENT_SERVICE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.detail || "Agent service error");
    err.status = res.status;
    throw err;
  }
  return data;
}

function mapToClient(data) {
  if (!data) return null;

  const rankedHotels = data.ranked_hotels
    ? data.ranked_hotels.map(h => ({
        hotelId: h.hotel_id,
        name: h.name,
        price: h.price,
        pricePerNight: h.price,
        rating: h.rating,
        location: h.location,
        address: h.location,
        amenities: h.amenities,
        estTotalCost: h.est_total_cost,
        estimatedTotalCost: h.est_total_cost,
        withinBudget: h.within_budget,
        reason: h.reason,
        phoneNumber: h.phone_number
      }))
    : [];

  const callSummary = data.call_summary
    ? {
        finalPrice: data.call_summary.final_price,
        taxes: data.call_summary.taxes,
        breakfastIncluded: data.call_summary.breakfast_included,
        cancellationPolicy: data.call_summary.cancellation_policy,
        discounts: data.call_summary.discounts,
        amenitiesConfirmed: data.call_summary.amenities_confirmed,
        analysisText: data.call_summary.analysis_text || data.call_summary.analysisText,
        raw: data.call_summary.raw,
      }
    : null;

  return {
    rawRequest: data.raw_request,
    destination: data.destination,
    startDate: data.start_date,
    endDate: data.end_date,
    durationDays: data.duration_days,
    travelers: data.travelers,
    budgetInr: data.budget_inr,
    interests: data.interests,
    constraints: data.constraints,
    hotelCandidates: data.hotel_candidates
      ? data.hotel_candidates.map(h => ({
          hotelId: h.hotel_id,
          name: h.name,
          price: h.price,
          rating: h.rating,
          location: h.location,
          amenities: h.amenities,
          phoneNumber: h.phone_number
        }))
      : [],
    weatherSummary: data.weather_summary,
    rankedHotels: rankedHotels,
    selectedHotelId: data.selected_hotel_id,
    callStatus: data.call_status,
    callTranscript: data.call_transcript,
    callSummary: callSummary,
    userDecision: data.user_decision,
  };
}

// POST /api/trips  { rawRequest, tripId?, history? }
export async function createTrip(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { rawRequest, tripId, history: clientHistory } = req.body;
    
    // Explicitly use provided history only for existing thread follow-ups.
    // Do NOT fall back to loading old DB ChatState for new planning requests.
    const history = clientHistory || [];

    const data = await forward("/trips", {
      method: "POST",
      body: JSON.stringify({
        rawRequest,
        userId,
        tripId: tripId || null,
        history
      }),
    });
    if (data.status === "chat" || data.status === "error" || data.error) {
      return res.json({
        tripId: data.tripId || null,
        status: data.status || (data.error ? "error" : "chat"),
        chatResponse: data.chatResponse || data.error || "Our server is currently experiencing high load. Please try again in a few moments.",
        error: data.error || null
      });
    }
    const clientData = mapToClient(data);
    res.json({
      tripId: data.tripId || data.trip_id,
      status: data.status || "awaiting_hotel_selection",
      values: clientData,
      ...clientData
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trips/:tripId
export async function getTrip(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const data = await forward(`/trips/${req.params.tripId}?userId=${encodeURIComponent(userId)}`);
    const clientData = mapToClient(data);
    res.json({
      tripId: req.params.tripId,
      status: data.status || "awaiting_hotel_selection",
      values: clientData,
      ...clientData
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: "Trip not found" });
    }
    next(err);
  }
}

// GET /api/trips/active
export async function getActiveTrip(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const state = await ChatState.findOne({ userId });
    res.status(200).json(state);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trips/active
export async function resetActiveTrip(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await ChatState.deleteOne({ userId });
    res.status(200).json({ status: "success", message: "Active trip session cleared" });
  } catch (err) {
    next(err);
  }
}

// POST /api/trips/state
export async function saveChatState(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { tripId, status, values, messages } = req.body;

    if (!messages || messages.length === 0) {
      await ChatState.deleteOne({ userId });
      return res.status(200).json({ status: "success", message: "Active state cleared" });
    }

    const state = await ChatState.findOneAndUpdate(
      { userId },
      {
        userId,
        tripId: tripId || null,
        status: status || null,
        values: values || null,
        messages: messages || [],
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );
    res.status(200).json(state);
  } catch (err) {
    next(err);
  }
}

// POST /api/trips/:tripId/approve-enquiry  { hotelId }
export async function approveEnquiry(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const data = await forward(`/trips/${req.params.tripId}/approve-enquiry`, {
      method: "POST",
      body: JSON.stringify({ hotelId: req.body.hotelId, userId }),
    });
    const clientData = mapToClient(data);
    res.json({
      tripId: req.params.tripId,
      status: data.status || "awaiting_call_decision",
      values: clientData,
      ...clientData
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: "Trip not found" });
    }
    next(err);
  }
}

// POST /api/trips/:tripId/decision  { decision, note? }
export async function submitDecision(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const data = await forward(`/trips/${req.params.tripId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: req.body.decision, note: req.body.note, userId }),
    });
    const clientData = mapToClient(data);
    let defaultStatus = "closed";
    if (req.body.decision === "proceed") defaultStatus = "ready_for_booking";
    else if (req.body.decision === "modify") defaultStatus = "awaiting_hotel_selection";
    res.json({
      tripId: req.params.tripId,
      status: data.status || defaultStatus,
      values: clientData,
      ...clientData
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: "Trip not found" });
    }
    next(err);
  }
}

// GET /api/trips/history
export async function getHistory(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const history = await ChatHistory.find({ userId }).sort({ updatedAt: -1 });
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
}

// POST /api/trips/history
export async function saveHistoryItem(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { tripId, messages, status, destination } = req.body;
    if (!tripId || !messages || messages.length === 0) {
      return res.status(400).json({ error: "Invalid history payload" });
    }
    const historyItem = await ChatHistory.findOneAndUpdate(
      { userId, tripId },
      {
        userId,
        tripId,
        messages,
        status: status || "idle",
        destination: destination || "",
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );
    res.status(200).json(historyItem);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trips/history/:tripId
export async function deleteHistoryItem(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { tripId } = req.params;
    await ChatHistory.deleteOne({ userId, tripId });
    res.status(200).json({ status: "success" });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trips/history
export async function clearAllHistory(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await ChatHistory.deleteMany({ userId });
    res.status(200).json({ status: "success" });
  } catch (err) {
    next(err);
  }
}