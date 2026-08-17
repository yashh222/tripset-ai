import mongoose from "mongoose";

const ChatHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  tripId: {
    type: String,
    required: true,
  },
  messages: {
    type: Array,
    default: [],
  },
  status: {
    type: String,
    default: "idle",
  },
  destination: {
    type: String,
    default: "",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

ChatHistorySchema.index({ userId: 1, tripId: 1 }, { unique: true });

const ChatHistory = mongoose.model("ChatHistory", ChatHistorySchema);
export default ChatHistory;
