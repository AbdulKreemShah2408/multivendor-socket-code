const socketIO = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const server = http.createServer(app);

require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.DB_URL)
.then((data) => {
    console.log(`Connected to MongoDB: ${data.connection.host}`);
})
.catch((err) => {
    console.log(`MongoDB connection failed: ${err.message}`);
});

// Middlewares - Updated CORS
app.use(cors({
    origin: ["https://multivendor-fronted.vercel.app", "http://localhost:3000"],
    credentials: true
}));
app.use(express.json());

// Socket.io Setup
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
  if (userId && !users.some((user) => user.userId === userId)) {
    users.push({ userId, socketId });
  }
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (receiverId) => {
  return users.find((user) => user.userId === receiverId);
};

io.on("connection", (socket) => {
  console.log(`a user is connected: ${socket.id}`);

  // FIX: Frontend se ID receive karne ka event
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    console.log(`Success: User ${userId} is now online.`); 
    io.emit("getUsers", users);
  });

  socket.on("sendMessage", ({ senderId, receiverId, text, images }) => {
    const user = getUser(receiverId);
    const message = {
        senderId,
        receiverId,
        text,
        images,
        createdAt: new Date()
    };
    
    if (user) {
      io.to(user.socketId).emit("getMessage", message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`a user disconnected: ${socket.id}`);
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});