// bot/server.js
import express from "express";
import cors from "cors";
import WebSocket from "ws";
import { Telegraf } from "telegraf";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// -----------------------------
// TELEGRAM BOT
// -----------------------------
const BOT_TOKEN = process.env.BOT_TOKEN;
let bot = null;

if (!BOT_TOKEN) {
  console.warn("⚠ WARNING: BOT_TOKEN not set — Telegram bot disabled.");
} else {
  bot = new Telegraf(BOT_TOKEN);

  bot.start((ctx) => {
    ctx.reply("🎮 Добро пожаловать в Spirtuoz Party Game!\nСоздай комнату у ведущего и заходи через MiniApp.");
  });

  // Webhook route
  const webhookPath = `/webhook/${BOT_TOKEN}`;

  bot.telegram.setWebhook(`https://spirtuoz-party-bot.onrender.com${webhookPath}`);
  app.use(bot.webhookCallback(webhookPath));

  console.log("📡 Telegram Webhook enabled:", webhookPath);
}

// -----------------------------
// ROOMS (Variant 3 — In Memory)
// -----------------------------
const rooms = new Map();

async function pingWs(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    let done = false;
    try {
      const ws = new WebSocket(url);

      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        ws.terminate();
        resolve(false);
      }, timeoutMs);

      ws.on("open", () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        ws.close();
        resolve(true);
      });

      ws.on("error", () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

// -----------------------------
// 1) Host registers room
// -----------------------------
app.post("/api/host/rooms/register", async (req, res) => {
  const { room_code, ws_url, app_url, host_secret } = req.body;

  if (host_secret !== process.env.HOST_SECRET) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  if (!room_code || !ws_url || !app_url) {
    return res.status(400).json({ error: "BAD_PAYLOAD" });
  }

  const alive = await pingWs(ws_url);
  if (!alive) {
    return res.status(400).json({ error: "WS_NOT_REACHABLE" });
  }

  rooms.set(room_code, {
    room_code,
    ws_url,
    app_url,
    lastSeen: Date.now(),
  });

  return res.json({ ok: true });
});

// -----------------------------
// 2) MiniApp gets room info
// -----------------------------
app.get("/api/rooms/:roomCode", async (req, res) => {
  const room = rooms.get(req.params.roomCode);

  if (!room) {
    return res.status(404).json({ error: "ROOM_NOT_FOUND" });
  }

  const alive = await pingWs(room.ws_url);
  if (!alive) {
    rooms.delete(req.params.roomCode);
    return res.status(410).json({ error: "ROOM_EXPIRED" });
  }

  room.lastSeen = Date.now();
  return res.json(room);
});

// -----------------------------
// 3) Remove unused rooms
// -----------------------------
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastSeen > 60_000) {
      console.log("🧹 Cleanup:", code);
      rooms.delete(code);
    }
  }
}, 20_000);

// -----------------------------
app.listen(PORT, () => {
  console.log("🚀 Spirtuoz Party Bot running on port", PORT);
});
