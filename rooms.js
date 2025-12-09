// rooms.js

const rooms = new Map();

/*
 room = {
   room_code: "ABCD",
   ws_url: "wss://xxxxx.trycloudflare.com/ws",
   app_url: "https://spirtuoz-miniapp.vercel.app",
   created_at: Date.now()
 }
*/

export function registerRoom(room_code, ws_url, app_url) {
  rooms.set(room_code, {
    room_code,
    ws_url,
    app_url,
    created_at: Date.now()
  });
}

export function getRoom(room_code) {
  return rooms.get(room_code) || null;
}

export function deleteRoom(room_code) {
  rooms.delete(room_code);
}
