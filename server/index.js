const express = require("express");
const cors = require("cors");
require("dotenv").config();
let intervalId;

const app = express();
let tickets = [];

// Middleware
app.use(express.json()); // Apply body-parser for JSON requests
app.use(express.urlencoded({ extended: true })); // Apply body-parser for URL-encoded requests
app.use(cors());

// Start the server
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Initialize Socket.IO
let connectedUsers = [];
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    transports: ["websocket", "polling"],
    credentials: true,
  },
});


// Socket.IO events
io.on("connection", (socket) => {
  clearInterval(intervalId)
  socket.on("user:join", (...args) => {
    socket.emit("user:introduce-others", { connectedUsers });
    socket.broadcast.emit("user:join", ...args);
    console.clear();
    connectedUsers.push(...args);
    console.table(connectedUsers);
  });

  socket.on("user:mouse-move", (...args) => {
    console.clear();
    console.table(connectedUsers);
    socket.broadcast.emit("user:mouse-move", ...args)
  });

  socket.on("user:entered-hovering-ticket", (...args) => {
    socket.broadcast.emit("user:entered-hovering-ticket", ...args)
  });

  socket.on("user:left-hovering-ticket", (...args) => {
    socket.broadcast.emit("user:left-hovering-ticket", ...args)
  });

  // Upon Ticket interact!
  socket.on("user:ticket-opened", (...args) => {
    socket.broadcast.emit("user:ticket-opened", ...args)
  });

  socket.on("user:ticket-closed", (...args) => {
    socket.broadcast.emit("user:ticket-closed", ...args)
  });

  socket.on("user:left", (...args) => {
    socket.broadcast.emit("user:left", ...args)
    console.clear();
    connectedUsers = connectedUsers.filter(user => user.id != args[0].id);
    console.table(connectedUsers);
  });

  // Handle disconnection
  socket.on("disconnect", (...args) => {

  });
});

// Routes
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/get-tickets", (req, res) => {
  try {
    res.send(tickets);
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/create-ticket", (req, res) => {
  try {
    const { title, description } = req.body;
    if (title && description) {
      tickets.push({
        _id: tickets.length + 1,
        title,
        description,
        isBeingHovered: false
      });
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/update-ticket", (req, res) => {
  try {
    const { ticketId, title, description } = req.body;
    if (ticketId) {
      tickets.forEach((ticket) => {
        if (ticket._id == ticketId) {
          ticket.title = title;
          ticket.description = description;
        }
      });
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.delete("/delete-ticket", (req, res) => {
  try {
    const { ticketId } = req.body;
    console.log('ticketId', ticketId);
    if (ticketId) {
      const updatedTickets = tickets.filter((ticket) => ticket._id !== ticketId);
      console.log(tickets, updatedTickets)
      tickets = updatedTickets;
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});