import mongoose from "mongoose";

const ChatStateSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  tripId: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    default: null,
  },
  values: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  messages: {
    type: Array,
    default: [],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const ChatState = mongoose.model("ChatState", ChatStateSchema);
export default ChatState;
