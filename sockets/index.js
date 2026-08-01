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

    // Message bhejna (text, photo, ya voice-note)
    socket.on(
      "send_message",
      async ({ conversationId, text, type = "text", mediaData, mediaMimeType, replyTo }) => {
        try {
          if (type === "text" && (!text || !text.trim())) return;
          if (type !== "text" && !mediaData) return;

          const doc = {
            conversation: conversationId,
            sender: socket.userId,
            text: text?.trim() || "",
            type,
          };
          if (type !== "text") {
            doc.mediaData = mediaData;
            doc.mediaMimeType = mediaMimeType;
            // Photo/voice-note 5 ghante baad khud delete ho jaayegi
            doc.expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
          }
          if (replyTo) doc.replyTo = replyTo;

          let message = await Message.create(doc);
          message = await message.populate([
            { path: "replyTo", select: "text type sender" },
          ]);

          const lastMessagePreview =
            type === "image" ? "📷 Photo" : type === "audio" ? "🎤 Voice message" : text.trim();

          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: lastMessagePreview,
            lastMessageAt: new Date(),
            deletedFor: [], // naya message aaya, to jisne bhi delete ki thi uske liye wapas dikhao
          });

          const conversation = await Conversation.findById(conversationId);

          // Message dono participants ko bhejo (sender ko bhi, taaki uski dusri tab/device sync ho)
          conversation.participants.forEach((participantId) => {
            io.to(participantId.toString()).emit("receive_message", message);
          });

          // Agar doosra bandaa abhi online hai (uska socket connected hai), to turant
          // "delivered" maan lo - WhatsApp jaisa double-tick dikhane ke liye
          const otherParticipant = conversation.participants.find(
            (p) => p.toString() !== socket.userId
          );
          if (otherParticipant) {
            const sockets = await io.in(otherParticipant.toString()).fetchSockets();
            if (sockets.length > 0) {
              message.status = "delivered";
              await message.save();
              io.to(socket.userId).emit("message_status", {
                messageId: message._id,
                status: "delivered",
              });
            }
          }
        } catch (err) {
          console.error("Message send error:", err);
          socket.emit("message_error", { message: "Message bhejne mein error aayi" });
        }
      }
    );

    // Jab user kisi chat ko khol ke dekh leta hai, uske unread messages "read" mark
    // karo aur bhejne wale ko batao (blue tick + "kab padha" ke liye)
    socket.on("mark_read", async ({ conversationId }) => {
      try {
        const now = new Date();
        const unread = await Message.find({
          conversation: conversationId,
          sender: { $ne: socket.userId },
          status: { $ne: "read" },
        });
        if (unread.length === 0) return;

        await Message.updateMany(
          { _id: { $in: unread.map((m) => m._id) } },
          { status: "read", readAt: now }
        );

        // Sabhi alag-alag bhejne walon ko unka apna update bhejo
        const senderIds = [...new Set(unread.map((m) => m.sender.toString()))];
        senderIds.forEach((senderId) => {
          io.to(senderId).emit("messages_read", {
            conversationId,
            messageIds: unread.filter((m) => m.sender.toString() === senderId).map((m) => m._id),
            readAt: now,
          });
        });
      } catch (err) {
        console.error("mark_read error:", err);
      }
    });

    // Typing indicator
    socket.on("typing", ({ conversationId, receiverId }) => {
      io.to(receiverId).emit("typing", { conversationId, userId: socket.userId });
    });

    socket.on("stop_typing", ({ conversationId, receiverId }) => {
      io.to(receiverId).emit("stop_typing", { conversationId, userId: socket.userId });
    });

    // ---- WebRTC call signaling ----
    // Ye server sirf "signal" pass karta hai (offer/answer/ICE candidates) -
    // actual audio/video connection dono browsers ke beech directly banti hai (peer-to-peer)

    // Caller kisi ko call kar raha hai
    socket.on("call:invite", ({ toUserId, conversationId, callType, offer, callerName }) => {
      io.to(toUserId).emit("call:incoming", {
        fromUserId: socket.userId,
        conversationId,
        callType,
        offer,
        callerName,
      });
    });

    // Receiver ne call accept karke apna "answer" bheja
    socket.on("call:answer", ({ toUserId, answer }) => {
      io.to(toUserId).emit("call:answer", { fromUserId: socket.userId, answer });
    });

    // ICE candidates exchange (dono taraf se connection banane ke liye zaroori)
    socket.on("call:ice-candidate", ({ toUserId, candidate }) => {
      io.to(toUserId).emit("call:ice-candidate", { fromUserId: socket.userId, candidate });
    });

    // Receiver ne call reject kar di
    socket.on("call:reject", ({ toUserId }) => {
      io.to(toUserId).emit("call:rejected", { fromUserId: socket.userId });
    });

    // Kisi ne bhi call end/hang-up ki
    socket.on("call:end", ({ toUserId }) => {
      io.to(toUserId).emit("call:ended", { fromUserId: socket.userId });
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
