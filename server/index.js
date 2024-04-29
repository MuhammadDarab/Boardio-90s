const express = require("express");
const cors = require("cors");
const socket = require('socket.io');
require("dotenv").config();

const app = express();

let tickets = [];

const allowedOrigins = ['http://localhost:5173'];

// Middleware
app.use(express.json()); // Apply body-parser for JSON requests
app.use(express.urlencoded({ extended: true })); // Apply body-parser for URL-encoded requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow requests from any origin
  next();
});
app.use(cors({
  origin: 'http://localhost:5173/', // Replace with your allowed origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Access-Control-Allow-Origin'], // Specify allowed headers
  optionsSuccessStatus: 200 // Specify the status code for successful preflight requests
}));
// Start the server
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Initialize Socket.IO
const io = socket(server);
let connectedUsers = 0;

// Socket.IO events
io.on("connection", (socket) => {
  connectedUsers++;
  console.log("A User Connected, Total Users are", connectedUsers);
  socket.on("user:mouse-move", (position) => {
    // socket.broadcast.emit("user:mouse-move", position)
    io.emit("user:mouse-move", position)
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A client disconnected");
    connectedUsers--;
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