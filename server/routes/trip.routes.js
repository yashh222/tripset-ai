import { Router } from "express";
import requireAuth from "../middleware/auth.middleware.js";
import {
  createTrip,
  getTrip,
  getActiveTrip,
  resetActiveTrip,
  approveEnquiry,
  submitDecision,
  saveChatState,
  getHistory,
  saveHistoryItem,
  deleteHistoryItem,
  clearAllHistory
} from "../controllers/trip.controller.js";

const router = Router();

router.post("/", requireAuth, createTrip);
router.get("/active", requireAuth, getActiveTrip);
router.delete("/active", requireAuth, resetActiveTrip);
router.post("/state", requireAuth, saveChatState);

// Per-User Chat History Persistence Routes
router.get("/history", requireAuth, getHistory);
router.post("/history", requireAuth, saveHistoryItem);
router.delete("/history/:tripId", requireAuth, deleteHistoryItem);
router.delete("/history", requireAuth, clearAllHistory);

router.get("/:tripId", requireAuth, getTrip);
router.post("/:tripId/approve-enquiry", requireAuth, approveEnquiry);
router.post("/:tripId/decision", requireAuth, submitDecision);

export default router;