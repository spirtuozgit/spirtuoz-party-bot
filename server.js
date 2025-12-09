// server.js
import express from "express";
import cors from "cors";
import bot from "./bot.js";
import { registerRoom, getRoom } from "./rooms.js";

const app = express();
app.use(express.json());
app.use(cors());

/* -----------------------------------
   1. HOST APP → регистрирует комнату
----------------------------------- */
app.post("/api/host/rooms/register", (req, res) => {
  const { room_code, ws_url, app_url, host_secret } = req.body;

  if (host_secret !== process.env.HOST_SECRET) {
    return res.status(401).json({ error: "Invalid host secret" });
  }
  if (!room_code || !ws_url || !app_url) {
    return res.status(400).json({ error: "Missing fields" });
  }

  registerRoom(room_code, ws_url, app_url);
  console.log("[ROOM REGISTERED]", room_code);

  return res.json({ ok: true });
});

/* -----------------------------------
   2. MINI APP → получает данные комнаты
----------------------------------- */
app.get("/api/rooms/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = getRoom(code);

  if (!room) return res.status(404).json({ error: "Room not found" });

  return res.json(room);
});

/* -----------------------------------
   3. MINI APP → получает аватар игрока
----------------------------------- */
app.get("/api/users/:id/avatar", async (req, res) => {
  try {
    const avatar = await bot.telegram.fetchAvatar(req.params.id);
    res.json({ avatar });
  } catch (e) {
    console.error("Avatar fetch error:", e);
    res.json({ avatar: null });
  }
});

/* -----------------------------------
   4. Healthcheck
----------------------------------- */
app.get("/", (req, res) => {
  res.send("Spirtuoz Party Bot OK");
});

/* -----------------------------------
   5. Запуск бота
----------------------------------- */
bot.launch().then(() => {
  console.log("Bot started");
});

/* -----------------------------------
   6. Запуск Express сервера
----------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("HTTP server running on port " + PORT);
});
