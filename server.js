require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const initSocket = require("./sockets/index");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const meetingRoutes = require("./routes/meetings");

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// DB connect
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", messageRoutes); // /api/conversations, /api/messages/:id
app.use("/api", meetingRoutes); // /api/meetings

app.get("/", (req, res) => {
  res.send("Chat app backend chal raha hai ✅");
});

// Socket.io init
initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server chal raha hai port ${PORT} pe`);
});
