const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    // Meeting kitni der ki hai (minutes mein) - conflict check ke liye zaroori hai
    duration: {
      type: Number,
      default: 30,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      default: "video",
    },
    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled"],
      default: "upcoming",
    },
    cancelReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);
