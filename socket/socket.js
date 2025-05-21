const { Server } = require("socket.io");
const ChatMessage = require("../models/chatMessage");

// Use the same mapping system as your working example
global.userSocketMap = global.userSocketMap || {}; // userId => socket.id (GLOBAL)
const socketUserMap = {}; // socket.id => userId (LOCAL)

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000", // for local dev frontend (adjust port if needed)
        "https://fco.onrender.com", // deployed frontend URL
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // Registration handler similar to your working example
    socket.on("register", (userId, username) => {
      if (userId && username) {
        global.userSocketMap[userId] = socket.id;
        socketUserMap[socket.id] = { userId, username };

        socket.emit("registered"); // ✅ confirmation
        console.log(`✅ ${username} registered with socket ID: ${socket.id}`);
      } else {
        console.log("❌ Registration failed - missing userId or username");
        socket.disconnect(true);
      }
    });

    socket.on("joinCase", ({ caseId }) => {
      // Verify user is registered first
      if (!socketUserMap[socket.id]) {
        return socket.emit("error", "Not registered");
      }

      socket.join(caseId);
      console.log(`🔵 Socket ${socket.id} joined case ${caseId}`);
    });

    socket.on("sendMessage", async (messageData) => {
      try {
        const userInfo = socketUserMap[socket.id];
        if (!userInfo?.userId) {
          console.log("❌ sendMessage rejected: not registered", socket.id);
          return socket.emit("error", "Not registered");
        }

        const newMessage = new ChatMessage({
          caseId: messageData.caseId,
          senderId: userInfo.userId,
          senderName: userInfo.username, // ✅ use saved username here
          message: messageData.message,
          timestamp: new Date(),
        });

        const savedMessage = await newMessage.save();

        io.to(messageData.caseId).emit("newMessage", savedMessage);
        console.log(
          `📨 Message sent by ${userInfo.username} to case ${messageData.caseId}`
        );
      } catch (error) {
        console.error("❌ Error saving message:", error);
        socket.emit("error", "Failed to save message");
      }
    });

    socket.on("disconnect", () => {
      const userId = socketUserMap[socket.id];

      if (userId) {
        // Clean up all mappings
        delete global.userSocketMap[userId];
        delete socketUserMap[socket.id];
        console.log(`❌ Disconnected: ${userId}`);
      } else {
        console.log(`❌ Disconnected (unregistered): ${socket.id}`);
      }
    });
  });

  return { io, userSocketMap: global.userSocketMap, socketUserMap };
}

module.exports = { initSocket };
