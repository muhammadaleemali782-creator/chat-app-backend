const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");

function initSocket(io) {
  // Har socket connection pe JWT verify karo
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Login required"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    console.log("🟢 User connected:", socket.userId);

    // Har user apna khud ka room join kar leta hai (userId se)
    socket.join(socket.userId);

    await User.findByIdAndUpdate(socket.userId, { isOnline: true });
    io.emit("user_online", { userId: socket.userId });

    // Message bhejna
    socket.on("send_message", async ({ conversationId, text }) => {
      try {
        if (!text || !text.trim()) return;

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          text: text.trim(),
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text.trim(),
          lastMessageAt: new Date(),
        });

        const conversation = await Conversation.findById(conversationId);

        // Message dono participants ko bhejo (sender ko bhi, taaki uski dusri tab/device sync ho)
        conversation.participants.forEach((participantId) => {
          io.to(participantId.toString()).emit("receive_message", message);
        });
      } catch (err) {
        console.error("Message send error:", err);
        socket.emit("message_error", { message: "Message bhejne mein error aayi" });
      }
    });

    // Typing indicator
    socket.on("typing", ({ conversationId, receiverId }) => {
      io.to(receiverId).emit("typing", { conversationId, userId: socket.userId });
    });

    socket.on("stop_typing", ({ conversationId, receiverId }) => {
      io.to(receiverId).emit("stop_typing", { conversationId, userId: socket.userId });
    });

    socket.on("disconnect", async () => {
      console.log("🔴 User disconnected:", socket.userId);
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      io.emit("user_offline", { userId: socket.userId });
    });
  });
}

module.exports = initSocket;
