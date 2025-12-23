const socketIO = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const server = http.createServer(app);

// Environment variables configuration
require('dotenv').config();

// FIX: MongoDB Connection Logic (Ye zaroori tha)
mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then((data) => {
    console.log(`Connected to MongoDB: ${data.connection.host}`);
})
.catch((err) => {
    console.log(`MongoDB connection failed: ${err.message}`);
    // Railway par crash hone se bachne ke liye process exit nahi kar rahe
});

// Middlewares
app.use(cors({
    origin: ["https://multivendor-fronted.vercel.app", "http://localhost:3000"],
    credentials: true
}));
app.use(express.json());

// Socket.io Setup with CORS fix
const io = socketIO(server, {
  cors: {
    origin: ["https://multivendor-fronted.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.get("/", (req, res) => {
  res.send("Socket server is running live!");
});

let users = [];

const addUser = (userId, socketId) => {
  if (!users.some((user) => user.userId === userId)) {
    users.push({ userId, socketId });
  }
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (receiverId) => {
  return users.find((user) => user.userId === receiverId);
};

const createMessage = ({ senderId, receiverId, text, images }) => ({
  senderId,
  receiverId,
  text,
  images,
  seen: false,
  createdAt: new Date(),
});

io.on("connection", (socket) => {
  console.log(`a user is connected: ${socket.id}`);

  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  socket.on("sendMessage", ({ senderId, receiverId, text, images }) => {
    const message = createMessage({ senderId, receiverId, text, images });
    const user = getUser(receiverId);

    console.log("Sending message to:", receiverId);
    
    if (user) {
      io.to(user.socketId).emit("getMessage", message);
    }
  });

  socket.on("updateLastMessage", ({ lastMessage, lastMessagesId }) => {
    io.emit("getLastMessage", { lastMessage, lastMessagesId });
  });

  socket.on("disconnect", () => {
    console.log(`a user disconnected!`);
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

// Railway provided PORT or 4000
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});