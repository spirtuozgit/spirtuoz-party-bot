// Простое in-memory хранилище комнат
// room_code → { ws_url, app_url, created_at }

const rooms = new Map();

/**
 * Получение комнаты
 */
export function getRoom(room_code) {
  return rooms.get(room_code.toUpperCase()) || null;
}

/**
 * Регистрация комнаты
 * Используется API /api/host/rooms/register
 */
export function setRoom(room_code, ws_url, app_url) {
  const code = room_code.toUpperCase();

  const room = {
    room_code: code,
    ws_url,
    app_url,
    created_at: Date.now()
  };

  rooms.set(code, room);

  return room;
}

/**
 * Получить все комнаты (для дебага)
 */
export function getAllRooms() {
  return Array.from(rooms.values());
}
