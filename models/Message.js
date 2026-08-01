const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    // "text" (normal message), "image" (photo), "audio" (voice note)
    type: {
      type: String,
      enum: ["text", "image", "audio"],
      default: "text",
    },
    // Photo/voice-note ka data base64 format mein - chhota sa personal chat app hai,
    // isliye seedha DB mein rakh rahe hain (koi alag file-storage service nahi chahiye)
    mediaData: {
      type: String,
      default: null,
    },
    mediaMimeType: {
      type: String,
      default: null,
    },
    // Kis message ka reply hai (WhatsApp jaisa "quote reply")
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Sirf photo/voice-note messages ke liye set hota hai - 5 ghante baad MongoDB
    // khud hi is document ko delete kar deta hai (TTL index, neeche dekho)
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// TTL index: jab bhi expiresAt ka time aa jaata hai, MongoDB background mein khud
// us document ko delete kar deta hai - hamare server ko jaaga hua hona bhi zaroori
// nahi (Render free tier so jaaye tab bhi delete ho jaayega)
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Message", messageSchema);
