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
const callRoutes = require("./routes/calls");

const app = express();
const server = http.createServer(app);

// Website (Vercel) ke saath-saath Android app (Capacitor WebView) se aane wali
// requests bhi allow karni hain, warna app me "Kuch galat ho gaya" error aata hai.
// Capacitor Android app ka origin "https://localhost" hota hai (androidScheme config se).
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  "http://localhost:5173", // local dev
  "https://localhost", // Capacitor Android app
  "capacitor://localhost", // Capacitor Android app (kabhi kabhi is scheme se aata hai)
  "http://localhost", // Capacitor iOS/edge cases
];

const corsOptions = {
  origin: (origin, callback) => {
    // Postman/curl jaisi tools se bina origin ke requests bhi allow karo
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS se block kiya gaya: " + origin));
    }
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// DB connect
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", messageRoutes); // /api/conversations, /api/messages/:id
app.use("/api", meetingRoutes); // /api/meetings
app.use("/api", callRoutes); // /api/calls

app.get("/", (req, res) => {
  res.send("Chat app backend chal raha hai ✅");
});

// Socket.io init
initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server chal raha hai port ${PORT} pe`);
});
