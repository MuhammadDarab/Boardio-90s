const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
let intervalId;

const app = express();

const upload = multer({ storage: multer.memoryStorage() });

function attachmentTypeFromMime(mimetype) {
  if (mimetype && mimetype.startsWith("image/")) return "image";
  if (mimetype && mimetype.startsWith("video/")) return "video";
  return "document";
}

// --- MongoDB models ---
// Numeric, auto-incrementing _id fields are used (via the Counter collection below)
// so the existing frontend, which compares ids as numbers, keeps working unchanged.
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.model("Counter", counterSchema);

async function getNextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter.seq;
}

const Board = mongoose.model("Board", new mongoose.Schema({ _id: Number, name: String }));

const Column = mongoose.model(
  "Column",
  new mongoose.Schema({
    _id: Number,
    name: String,
    boardId: Number,
    order: { type: Number, default: 0 },
  })
);

const attachmentSchema = new mongoose.Schema(
  { url: String, name: String, type: String },
  { _id: false }
);

const stampSchema = new mongoose.Schema({ type: String, rotation: Number });

const Ticket = mongoose.model(
  "Ticket",
  new mongoose.Schema({
    _id: Number,
    title: String,
    description: String,
    attachments: [attachmentSchema],
    stamps: [stampSchema],
    columnId: Number,
    boardId: Number,
    isBeingHovered: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    order: { type: Number, default: 0 },
  })
);

async function createBoard(name) {
  const boardId = await getNextSequence("boardId");
  const newBoard = await Board.create({ _id: boardId, name });
  const columnId = await getNextSequence("columnId");
  await Column.create({ _id: columnId, name: "Todos", boardId: newBoard._id, order: 0 });
  return newBoard;
}

let board;

async function initializeBoard() {
  board = await Board.findOne().sort({ _id: 1 });
  if (!board) board = await createBoard("Untitled Board");
}

function safeCompare(a, b) {
  const strA = String(a || "");
  const strB = String(b || "");
  const len = Math.max(strA.length, strB.length, 1);
  const bufA = Buffer.alloc(len, 0);
  const bufB = Buffer.alloc(len, 0);
  bufA.write(strA);
  bufB.write(strB);
  return crypto.timingSafeEqual(bufA, bufB) && strA.length === strB.length;
}

function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Auth
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const validUser = safeCompare(username, process.env.ADMIN_USERNAME);
  const validPass = safeCompare(password, process.env.ADMIN_PASSWORD);
  if (validUser && validPass) {
    const token = jwt.sign({ sub: username }, process.env.JWT_SECRET, { expiresIn: "30d" });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

app.use(authMiddleware);

// Routes
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/get-tickets", async (req, res) => {
  try {
    const boardTickets = await Ticket.find({ boardId: board._id });
    res.send(boardTickets);
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ error: "No file" });
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "boardio", resource_type: "auto" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });
    res.send({
      url: result.secure_url,
      name: req.file.originalname,
      type: attachmentTypeFromMime(req.file.mimetype),
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/get-board", (req, res) => {
  try {
    res.send(board);
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/update-board-name", async (req, res) => {
  try {
    const { name } = req.body;
    if (name && name.trim()) {
      board.name = name.trim();
      await Board.updateOne({ _id: board._id }, { name: board.name });
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.get("/get-boards", async (req, res) => {
  try {
    const allBoards = await Board.find().sort({ _id: 1 });
    res.send(allBoards);
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/create-board", async (req, res) => {
  try {
    const { name } = req.body;
    if (name && name.trim()) {
      const newBoard = await createBoard(name.trim());
      board = newBoard;
      res.send(newBoard);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/select-board", async (req, res) => {
  try {
    const { boardId } = req.body;
    const selectedBoard = await Board.findById(boardId);
    if (selectedBoard) {
      board = selectedBoard;
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.get("/get-columns", async (req, res) => {
  try {
    const boardColumns = await Column.find({ boardId: board._id }).sort({ order: 1 });
    res.send(boardColumns);
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/create-column", async (req, res) => {
  try {
    const { name } = req.body;
    if (name && name.trim()) {
      const columnId = await getNextSequence("columnId");
      const order = await Column.countDocuments({ boardId: board._id });
      await Column.create({ _id: columnId, name: name.trim(), boardId: board._id, order });
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/reorder-columns", async (req, res) => {
  try {
    const { columnIds } = req.body;
    if (Array.isArray(columnIds)) {
      await Promise.all(
        columnIds.map((id, index) =>
          Column.updateOne({ _id: id, boardId: board._id }, { order: index })
        )
      );
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.delete("/delete-column", async (req, res) => {
  try {
    const { columnId } = req.body;
    if (columnId) {
      await Column.deleteOne({ _id: columnId });
      await Ticket.deleteMany({ columnId });
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/create-ticket", async (req, res) => {
  try {
    const { title, description, columnId, attachments, createdAt } = req.body;
    if (title && description) {
      const boardColumns = await Column.find({ boardId: board._id }).sort({ order: 1 });
      const ticketId = await getNextSequence("ticketId");
      await Ticket.create({
        _id: ticketId,
        title,
        description,
        attachments: Array.isArray(attachments) ? attachments : [],
        columnId: columnId || (boardColumns[0] && boardColumns[0]._id),
        boardId: board._id,
        isBeingHovered: false,
        createdAt: createdAt ? new Date(createdAt) : undefined,
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

app.post("/move-ticket", async (req, res) => {
  try {
    const { ticketId, columnId } = req.body;
    if (ticketId && columnId) {
      await Ticket.updateOne({ _id: ticketId }, { columnId });
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/update-ticket", async (req, res) => {
  try {
    const { ticketId, title, description, attachments, createdAt } = req.body;
    if (ticketId) {
      const update = { title, description, attachments: Array.isArray(attachments) ? attachments : [] };
      if (createdAt) update.createdAt = new Date(createdAt);
      await Ticket.updateOne({ _id: ticketId }, update);
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/add-stamp", async (req, res) => {
  try {
    const { ticketId, type } = req.body;
    if (ticketId && type) {
      const existing = await Ticket.findById(ticketId, "stamps");
      if (existing && existing.stamps.some((s) => s.type === type)) {
        return res.status(409).send({ error: "Stamp type already exists on this ticket" });
      }
      const rotation = Math.round((Math.random() * 30 - 15) * 10) / 10;
      const ticket = await Ticket.findByIdAndUpdate(
        ticketId,
        { $push: { stamps: { type, rotation } } },
        { returnDocument: "after" }
      );
      res.send(ticket.stamps[ticket.stamps.length - 1]);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/remove-stamp", async (req, res) => {
  try {
    const { ticketId, stampId } = req.body;
    if (ticketId && stampId) {
      await Ticket.updateOne({ _id: ticketId }, { $pull: { stamps: { _id: stampId } } });
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.post("/reorder-tickets", async (req, res) => {
  try {
    const { ticketIds } = req.body;
    if (Array.isArray(ticketIds)) {
      await Promise.all(
        ticketIds.map((id, index) => Ticket.updateOne({ _id: id }, { order: index }))
      );
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

app.delete("/delete-ticket", async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (ticketId) {
      await Ticket.deleteOne({ _id: ticketId });
      res.send(200);
    } else {
      res.send(400);
    }
  } catch (error) {
    res.send(error);
  }
  return;
});

// --- Startup ---
async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");
  await initializeBoard();

  const port = process.env.PORT || 8000;
  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  // Initialize Socket.IO
  let connectedUsers = [];
  const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
  const io = require("socket.io")(server, {
    cors: {
      origin: allowedOrigin,
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
      connectedUsers.push(...args);
    });

    socket.on("user:mouse-move", (...args) => {
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

    socket.on("user:ticket-moved", (...args) => {
      socket.broadcast.emit("user:ticket-moved", ...args)
    });

    socket.on("user:tickets-reordered", (...args) => {
      socket.broadcast.emit("user:tickets-reordered", ...args)
    });

    socket.on("user:ticket-stamped", (...args) => {
      socket.broadcast.emit("user:ticket-stamped", ...args)
    });

    socket.on("user:ticket-unstamped", (...args) => {
      socket.broadcast.emit("user:ticket-unstamped", ...args)
    });

    socket.on("user:left", (...args) => {
      socket.broadcast.emit("user:left", ...args)
      connectedUsers = connectedUsers.filter(user => user.id != args[0].id);
    });

    // Handle disconnection
    socket.on("disconnect", (...args) => {

    });
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
