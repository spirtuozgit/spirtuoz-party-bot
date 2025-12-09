// bot/server.js
import express from "express";
import cors from "cors";
import WebSocket from "ws";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Секрет хоста — ДОЛЖЕН совпадать с тем, что шлёт лаунчер
// (сейчас у тебя "SUIo12jklaJHG82" в main.js)
const HOST_SECRET = process.env.HOST_SECRET || "SUIo12jklaJHG82";

// Вариант 3: комнаты только в памяти, пока живут
// Map<room_code, { room_code, ws_url, app_url, createdAt }>
const rooms = new Map();

// Пинг WS-адреса, чтобы понять, жив ли хост
function pingWs(url, timeoutMs = 1000) {
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
// 1) ХОСТ РЕГИСТРИРУЕТ КОМНАТУ
// -----------------------------
app.post("/api/host/rooms/register", async (req, res) => {
  const { room_code, ws_url, app_url, host_secret } = req.body || {};

  if (host_secret !== HOST_SECRET) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  if (!room_code || !ws_url || !app_url) {
    return res.status(400).json({ error: "BAD_PAYLOAD" });
  }

  // При регистрации сразу проверим, что WS доступен
  const alive = await pingWs(ws_url, 1000);
  if (!alive) {
    return res.status(400).json({ error: "WS_NOT_REACHABLE" });
  }

  rooms.set(room_code, {
    room_code,
    ws_url,
    app_url,
    createdAt: Date.now()
  });

  console.log("[ROOM REGISTERED]", room_code, ws_url);

  return res.json({
    ok: true,
    room_code,
    ws_url,
    app_url
  });
});

// -----------------------------
// 2) MINIAPP ЗАПРАШИВАЕТ КОМНАТУ
// -----------------------------
app.get("/api/rooms/:roomCode", async (req, res) => {
  const roomCode = req.params.roomCode;
  const room = rooms.get(roomCode);

  if (!room) {
    return res.status(404).json({ error: "ROOM_NOT_FOUND" });
  }

  // Lazy-проверка: жив ли до сих пор WS
  const alive = await pingWs(room.ws_url, 1000);
  if (!alive) {
    console.log("[ROOM EXPIRED]", roomCode);
    rooms.delete(roomCode);
    return res.status(410).json({ error: "ROOM_EXPIRED" });
  }

  return res.json({
    room_code: room.room_code,
    ws_url: room.ws_url,
    app_url: room.app_url
  });
});

// -----------------------------
// 3) ДЕБАГ: СПИСОК КОМНАТ
// -----------------------------
app.get("/api/rooms", (req, res) => {
  res.json(Array.from(rooms.values()));
});

app.listen(PORT, () => {
  console.log("Spirtuoz Party Bot running on port", PORT);
});
