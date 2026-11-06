require("dotenv").config();
const path = require("path");
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Message = require("./models/Message");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Secret key for JWT (In a real app, put this in .env)
const JWT_SECRET = "super_secret_chat_key_123"; 

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

// --- AUTH ROUTES ---
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });
    
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Load messages
app.get("/api/messages/:room", async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// --- SOCKET.IO AUTH & LOGIC ---
// Middleware to verify JWT before allowing Socket connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error"));
    socket.data.username = decoded.username;
    next();
  });
});

const roomUsers = {};

io.on("connection", (socket) => {
  const username = socket.data.username;
  console.log("🟢 Connected:", username);

  socket.on("joinRoom", ({ room }) => {
    const oldRoom = socket.data.room;

    if (oldRoom && oldRoom !== room) {
      socket.leave(oldRoom);
      if (roomUsers[oldRoom]) {
        roomUsers[oldRoom] = roomUsers[oldRoom].filter((u) => u.id !== socket.id);
        io.to(oldRoom).emit("roomUsers", roomUsers[oldRoom]);
        socket.to(oldRoom).emit("system", `${username} left the chat`);
      }
    }

    socket.join(room);
    socket.data.room = room;

    if (!roomUsers[room]) roomUsers[room] = [];
    const existingUserIndex = roomUsers[room].findIndex(u => u.username === username);
    if (existingUserIndex !== -1) roomUsers[room].splice(existingUserIndex, 1);
    roomUsers[room].push({ id: socket.id, username });

    io.to(room).emit("roomUsers", roomUsers[room]);
    socket.to(room).emit("system", `${username} joined the chat`);
  });

  socket.on("chatMessage", async ({ text }) => {
    const room = socket.data.room;
    if (!username || !room || !text?.trim()) return;

    try {
      const saved = await Message.create({ username, room, text: text.trim() });
      io.to(room).emit("chatMessage", {
        _id: saved._id,
        username: saved.username,
        text: saved.text,
        createdAt: saved.createdAt,
      });
    } catch (err) {
      console.error("Save error:", err);
    }
  });

  socket.on("typing", () => {
    const room = socket.data.room;
    if (room) socket.to(room).emit("typing", `${username} is typing...`);
  });

  socket.on("stopTyping", () => {
    const room = socket.data.room;
    if (room) socket.to(room).emit("typing", "");
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (username && room) {
      roomUsers[room] = roomUsers[room].filter((u) => u.id !== socket.id);
      io.to(room).emit("roomUsers", roomUsers[room]);
      socket.to(room).emit("system", `${username} left the chat`);
      socket.to(room).emit("typing", "");
    }
    console.log("🔴 Disconnected:", username);
  });
});

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("✅ MongoDB connected");
  server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err.message);
  process.exit(1);
});
