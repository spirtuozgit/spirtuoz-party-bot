// -----------------------------
// Spirtuoz Party Bot (Telegram + API)
// Variant 3 — rooms exist only while WS is alive
// -----------------------------

import express from "express";
import cors from "cors";
import WebSocket from "ws";
import { Telegraf } from "telegraf";

// -----------------------------
// Express initialization
// -----------------------------
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = "https://spirtuoz-party-bot.onrender.com";

// -----------------------------
// ENV variables
// -----------------------------
const BOT_TOKEN = process.env.BOT_TOKEN;        // Telegram bot token
const HOST_SECRET = process.env.HOST_SECRET;    // must match launcher

if (!HOST_SECRET) {
  console.warn("⚠ WARNING: Missing HOST_SECRET in environment!");
}

// -----------------------------
// Telegram Bot
// -----------------------------
let bot = null;

if (!BOT_TOKEN) {
  console.warn("⚠ Telegram bot disabled (no BOT_TOKEN).");
} else {
  bot = new Telegraf(BOT_TOKEN);

  // /start
  bot.start((ctx) => {
    ctx.reply(
      "🎮 Добро пожаловать в *Spirtuoz Party Game!* \n" +
      "Создай комнату у ведущего и отправь мне её код — я дам ссылку для входа.",
      { parse_mode: "Markdown" }
    );
  });

  // Room code handler
  bot.on("text", async (ctx) => {
    const code = ctx.message.text.trim();

    // Ignore slash commands
    if (code.startsWith("/")) return;

    // Validate
    if (!/^[a-zA-Z0-9_-]{2,20}$/.test(code)) {
      return ctx.reply("Код комнаты должен содержать только буквы и цифры.");
    }

    // API request
    try {
      const response = await fetch(`${PUBLIC_URL}/api/rooms/${code}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.error === "ROOM_NOT_FOUND") {
          return ctx.reply(`❌ Комната *${code}* не найдена.`, { parse_mode: "Markdown" });
        }
        if (data.error === "ROOM_EXPIRED") {
          return ctx.reply(`⚠️ Комната *${code}* устарела.`, { parse_mode: "Markdown" });
        }
        return ctx.reply("Ошибка получения комнаты.");
      }

      const joinLink = `${data.app_url}?room=${code}`;

      return ctx.reply(
        `🎮 Комната *${code}* найдена!\n` +
        `Нажми, чтобы войти в игру:\n${joinLink}`,
        { parse_mode: "Markdown", disable_web_page_preview: true }
      );

    } catch (err) {
      console.error("Telegram room check error:", err);
      return ctx.reply("Ошибка сервера.");
    }
  });

  // Webhook configuration
  const webhookPath = `/webhook/${BOT_TOKEN}`;
  bot.telegram.setWebhook(`${PUBLIC_URL}${webhookPath}`);
  app.use(bot.webhookCallback(webhookPath));

  console.log("📡 Telegram Webhook enabled at", webhookPath);
}

// -----------------------------
// In-memory rooms { room_code → {ws_url, app_url, lastSeen} }
// -----------------------------
const rooms = new Map();

// -----------------------------
// WS ping checker
// -----------------------------
async function pingWs(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    let finished = false;

    try {
      const ws = new WebSocket(url);

      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        try { ws.terminate(); } catch {}
        resolve(false);
      }, timeoutMs);

      ws.on("open", () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        ws.close();
        resolve(true);
      });

      ws.on("error", () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(false);
      });

    } catch (e) {
      resolve(false);
    }
  });
}

// -----------------------------
// 1) Host registers room
// -----------------------------
app.post("/api/host/rooms/register", async (req, res) => {
  const { room_code, ws_url, app_url, host_secret } = req.body;

  if (host_secret !== HOST_SECRET) {
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

  console.log(`✔ Room registered: ${room_code} → ${ws_url}`);
  return res.json({ ok: true });
});

// -----------------------------
// 2) MiniApp requests room info
// -----------------------------
app.get("/api/rooms/:roomCode", async (req, res) => {
  const code = req.params.roomCode;
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: "ROOM_NOT_FOUND" });
  }

  const alive = await pingWs(room.ws_url);
  if (!alive) {
    console.log("✖ Room expired:", code);
    rooms.delete(code);
    return res.status(410).json({ error: "ROOM_EXPIRED" });
  }

  room.lastSeen = Date.now();
  return res.json(room);
});

// -----------------------------
// Auto-clean unused rooms
// -----------------------------
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastSeen > 60000) {
      console.log("🧹 Cleanup expired room:", code);
      rooms.delete(code);
    }
  }
}, 20000);

// -----------------------------
app.listen(PORT, () => {
  console.log("🚀 Spirtuoz Party Bot running on port", PORT);
});
