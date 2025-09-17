const { Server } = require("socket.io");

// Lancement du serveur sur le port 3000 (Render utilisera PORT automatiquement)
const PORT = process.env.PORT || 3000;

const io = new Server(PORT, {
  cors: { origin: "*" } // autoriser toutes les origines (Flutter web/mobile)
});

// Dictionnaire des rooms
// rooms[roomId] = { host: socketId, players: [], state: {...} }
const rooms = {};

const { v4: uuidv4 } = require("uuid"); 

io.on("connection", (socket) => {
  console.log("Nouvel utilisateur:", socket.id);
  
  /**
   * Création d'une room par l'hôte
   */
  socket.on("createRoom", ({ player }) => {

  const newRoomId = uuidv4().slice(0, 6);

  // Créer la room
  rooms[newRoomId] = { host: socket.id, players: [{ id: socket.id, name: player }], state: null };

  // Ajouter le créateur dans la room
  socket.join(newRoomId);

  // Renvoyer le code unique au créateur
  socket.emit("roomCreated",  { roomId: newRoomId });

  io.to(newRoomId).emit("newUserJoin",{ player } );

  console.log(`✅ Room ${newRoomId} créée par ${player} (${socket.id})`);
  });

  /**
   * Un joueur rejoint une room existante
   */
  socket.on("joinRoom", ({ roomId, player }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].players.push({ id: socket.id, name: player });
      console.log(`👤 ${player} a rejoint la room ${roomId}`);

      // informer tous les joueurs de la room
      io.to(roomId).emit("chatMessage", { message: `${player} a rejoint la partie` });

      // message capyé par les clients
      io.to(roomId).emit("newUserJoin",{ player } );

      console.log("newUserJoin Sent");
      // envoyer l'état courant de la partie au nouveau joueur
      if (rooms[roomId].state) {
        console.log(`👤 Sending syncState to new  ${player} `);
        socket.emit("syncState", rooms[roomId].state);
      }
    } else {
      socket.emit("chatMessage", { message: `❌ La room ${roomId} n'existe pas.` });
    }
  });

  /**
   * Envoi d'un message de chat
   */
  socket.on("chatMessage", ({ roomId, message }) => {
    io.to(roomId).emit("chatMessage", { message });
  });

  /**
   * Mise à jour de l'état du jeu par l'hôte
   */
  socket.on("updateState", ({ roomId, state }) => {
    if (rooms[roomId]) {
      rooms[roomId].state = state; // sauvegarde du nouvel état
      console.log(`🔄 État mis à jour dans la room ${roomId}`, state);

      // envoyer l'état à tous les autres joueurs
      socket.to(roomId).emit("syncState", state);
    }
  });

  /**
   * Déconnexion d'un joueur
   */
  socket.on("disconnect", () => {
    console.log("❌ Déconnecté:", socket.id);

    // Supprimer le joueur de toutes les rooms
    for (const [roomId, room] of Object.entries(rooms)) {
      room.players = room.players.filter((p) => p.id !== socket.id);

      // si l'hôte part -> supprimer la room
      if (room.host === socket.id) {
        delete rooms[roomId];
        io.to(roomId).emit("chatMessage", { message: "⚠️ L'hôte a quitté, la partie est fermée." });
        io.in(roomId).socketsLeave(roomId);
      }
    }
  });
});

console.log(`🚀 Serveur socket.io lancé sur http://localhost:${PORT}`);
