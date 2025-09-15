const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Nouvel utilisateur :", socket.id);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`${socket.id} a rejoint le room ${room}`);
  });

  socket.on("send_message", (data) => {
    console.log("Message reçu:", data);
    io.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);
  });
});

server.listen(3000, () => console.log("Serveur sur http://localhost:3000"));
