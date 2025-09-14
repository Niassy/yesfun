const { Server } = require("socket.io");
const PORT = process.env.PORT || 3000;

const io = new Server(PORT, {
  cors: {
    origin: "*", // ou bien ["https://yesfun.netlify.app"]
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Nouvel utilisateur:", socket.id);

  // Création d’une room par l’hôte
  socket.on("createRoom", ({ player }) => {
    const roomId = Math.random().toString(36).substring(2, 8); // code unique
    rooms[roomId] = { host: socket.id, players: [{ id: socket.id, name: player }] };
    socket.join(roomId);

    console.log(`🎮 Room ${roomId} créée par ${player}`);
    socket.emit("roomCreated", { roomId }); // envoie le code au créateur
  });

  // Un invité rejoint une room
  socket.on("joinRoom", ({ roomId, player }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].players.push({ id: socket.id, name: player });
      io.to(roomId).emit("chatMessage", { message: `${player} a rejoint la partie 🎉` });
    } else {
      socket.emit("errorMessage", { message: "❌ Room introuvable" });
    }
  });

  // Chat
  socket.on("chatMessage", ({ roomId, message }) => {
    io.to(roomId).emit("chatMessage", { message });
  });

  socket.on("disconnect", () => {
    console.log("❌ Déconnecté:", socket.id);
  });
});

console.log("✅ Serveur socket.io lancé sur http://localhost:3000");
