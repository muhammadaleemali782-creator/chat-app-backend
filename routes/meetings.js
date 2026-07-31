const express = require("express");
const Meeting = require("../models/Meeting");
const Conversation = require("../models/Conversation");
const protect = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/meetings
// @desc    User ki saari conversations ke saare meetings (Calendar page ke liye)
router.get("/meetings", protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.userId }).select("_id");
    const conversationIds = conversations.map((c) => c._id);

    const meetings = await Meeting.find({
      conversation: { $in: conversationIds },
      status: "upcoming",
    })
      .populate({
        path: "conversation",
        populate: { path: "participants", select: "username displayName" },
      })
      .sort({ scheduledAt: 1 });

    res.json(meetings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/meetings
// @desc    Naya meeting schedule karo
router.post("/meetings", protect, async (req, res) => {
  try {
    const { conversationId, title, scheduledAt, callType } = req.body;

    if (!conversationId || !title || !scheduledAt) {
      return res.status(400).json({ message: "Title aur date/time zaroori hai" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.userId,
    });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation nahi mila" });
    }

    const meeting = await Meeting.create({
      conversation: conversationId,
      createdBy: req.userId,
      title: title.trim(),
      scheduledAt: new Date(scheduledAt),
      callType: callType === "audio" ? "audio" : "video",
    });

    res.status(201).json(meeting);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error, baad mein try karo" });
  }
});

// @route   GET /api/meetings/:conversationId
// @desc    Ek conversation ke saare meetings (upcoming pehle)
router.get("/meetings/:conversationId", protect, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      conversation: req.params.conversationId,
    }).sort({ scheduledAt: 1 });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/meetings/:id
// @desc    Meeting cancel karo
router.delete("/meetings/:id", protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting nahi mila" });
    }
    if (meeting.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Sirf banane wala hi cancel kar sakta hai" });
    }
    meeting.status = "cancelled";
    await meeting.save();
    res.json({ message: "Meeting cancel ho gaya" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
