const express = require("express");
const CallLog = require("../models/CallLog");
const protect = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/calls
// @desc    Call khatam hone ke baad uska record save karo
router.post("/calls", protect, async (req, res) => {
  try {
    const { conversationId, calleeId, callType, status, durationSeconds } = req.body;

    if (!conversationId || !calleeId) {
      return res.status(400).json({ message: "conversationId aur calleeId zaroori hai" });
    }

    const log = await CallLog.create({
      conversation: conversationId,
      caller: req.userId,
      callee: calleeId,
      callType: callType === "audio" ? "audio" : "video",
      status: ["completed", "missed", "rejected"].includes(status) ? status : "completed",
      durationSeconds: durationSeconds || 0,
    });

    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/calls
// @desc    Apni saari calls ki history (caller ya callee, dono jagah)
router.get("/calls", protect, async (req, res) => {
  try {
    const logs = await CallLog.find({
      $or: [{ caller: req.userId }, { callee: req.userId }],
    })
      .populate("caller", "username displayName")
      .populate("callee", "username displayName")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
