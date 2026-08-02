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

// @route   POST /api/meetings/check-conflict
// @desc    Dekho ki us bande ke saath (kisi bhi conversation mein) us waqt ke aas-paas
//          pehle se koi meeting to nahi hai
router.post("/meetings/check-conflict", protect, async (req, res) => {
  try {
    const { otherUserId, scheduledAt, duration = 30 } = req.body;
    if (!otherUserId || !scheduledAt) {
      return res.status(400).json({ message: "otherUserId aur scheduledAt zaroori hai" });
    }

    // Doosra bandaa kisi ke bhi saath busy ho (kisi bhi conversation mein) - dekhna hai
    const theirConversations = await Conversation.find({ participants: otherUserId }).select("_id");
    const conversationIds = theirConversations.map((c) => c._id);

    const newStart = new Date(scheduledAt);
    const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

    // Us din ke aas-paas ki saari meetings nikalo, phir asal overlap check karo
    // (do meetings overlap karti hain agar: start1 < end2 AND start2 < end1)
    const dayStart = new Date(newStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const candidates = await Meeting.find({
      conversation: { $in: conversationIds },
      status: "upcoming",
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
    })
      .populate({ path: "conversation", populate: { path: "participants", select: "displayName" } })
      .sort({ scheduledAt: 1 });

    const conflict = candidates.find((m) => {
      const existingStart = new Date(m.scheduledAt);
      const existingEnd = new Date(existingStart.getTime() + (m.duration || 30) * 60 * 1000);
      return newStart < existingEnd && existingStart < newEnd;
    });

    res.json({ conflict: !!conflict, meeting: conflict || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/meetings
// @desc    Naya meeting schedule karo
router.post("/meetings", protect, async (req, res) => {
  try {
    const { conversationId, title, scheduledAt, callType, duration } = req.body;

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
      duration: Number(duration) > 0 ? Number(duration) : 30,
      callType: callType === "audio" ? "audio" : "video",
    });

    const populated = await meeting.populate({
      path: "conversation",
      populate: { path: "participants", select: "username displayName" },
    });

    res.status(201).json(populated);
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
    const meeting = await Meeting.findById(req.params.id).populate("conversation");
    if (!meeting) {
      return res.status(404).json({ message: "Meeting nahi mila" });
    }
    // Pehle sirf meeting banane wala hi cancel kar sakta tha - ab dono participants
    // (jinke beech meeting hai) cancel kar sakte hain, jaisa ek chat app mein hona chahiye
    const isParticipant = meeting.conversation.participants.some(
      (p) => p.toString() === req.userId
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Ijazat nahi hai" });
    }
    meeting.status = "cancelled";
    meeting.cancelReason = (req.body?.reason || "").trim().slice(0, 200);
    await meeting.save();
    res.json({ message: "Meeting cancel ho gaya" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
