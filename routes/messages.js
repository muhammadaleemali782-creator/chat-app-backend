const express = require("express");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const protect = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/conversations/start
// @desc    Kisi user ke saath conversation shuru karo (ya existing wapas do)
router.post("/conversations/start", protect, async (req, res) => {
  try {
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: "otherUserId chahiye" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, otherUserId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.userId, otherUserId],
      });
    }

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/conversations
// @desc    Apni saari chats ki list (jaise WhatsApp home screen)
router.get("/conversations", protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
      deletedFor: { $ne: req.userId }, // jo chats maine delete ki hain wo list me na aayen
    })
      .populate("participants", "username displayName profilePic isOnline")
      .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/conversations/:id
// @desc    Chat delete karo (sirf apni list se - doosre user ko dikhti rehti hai,
//          naya message aane par dono ke liye wapas dikhne lagti hai)
router.delete("/conversations/:id", protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Chat nahi mili" });
    }
    if (!conversation.participants.some((p) => p.toString() === req.userId)) {
      return res.status(403).json({ message: "Ijazat nahi hai" });
    }
    if (!conversation.deletedFor.some((id) => id.toString() === req.userId)) {
      conversation.deletedFor.push(req.userId);
      await conversation.save();
    }
    res.json({ message: "Chat delete ho gayi" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/messages/:conversationId
// @desc    Ek conversation ke saare purane messages
router.get("/messages/:conversationId", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
      .populate("replyTo", "text type sender")
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
