const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    // Jab koi user "delete chat" karta hai, uski ID yaha add ho jaati hai -
    // sirf uski list se chat hat jaati hai, doosre user ko dikhti rehti hai.
    // Naya message aane par dono user is list se hat jaate hain (chat wapas dikhne lagti hai).
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
