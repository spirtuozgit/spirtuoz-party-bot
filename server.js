import express from "express";
import cors from "cors";
import bot from "./bot.js";
import { setRoom, getRoom } from "./rooms.js";

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.send("Spirtuoz Party Bot is running.");
});

// =========================
// HOST → REGISTER ROOM
// =========================
app.post("/api/host/rooms/register", (req, res) => {
  const { room_code, ws_url, app_url, host_secret } = req.body;

  if (host_secret !== process.env.HOST_SECRET) {
    return res.status(401).json({ error: "Invalid host secret" });
  }

  if (!room_code || !ws_url || !app_url) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const room = setRoom(room_code, ws_url, app_url);

  return res.json({ ok: true, room });
});

// =========================
// MiniApp → GET ROOM
// =========================
app.get("/api/rooms/:code", (req, res) => {
  const room = getRoom(req.params.code);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  return res.json(room);
});

// =========================
// GET AVATAR
// =========================
app.get("/api/users/:id/avatar", async (req, res) => {
  try {
    const url = await bot.telegram.fetchAvatar(req.params.id);
    res.json({ avatar: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load avatar" });
  }
});

// =========================
// TELEGRAM WEBHOOK
// =========================

app.use(bot.webhookCallback("/bot"));

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("HTTP server running on port", PORT);
});
