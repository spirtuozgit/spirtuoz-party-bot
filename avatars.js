// avatars.js
import axios from "axios";

const avatarCache = new Map();

/*
 avatarCache = {
    userId: "https://api.telegram.org/file/.../avatar.jpg"
 }
*/

export async function getAvatar(bot, userId) {
  // Проверка кеша
  if (avatarCache.has(userId)) {
    return avatarCache.get(userId);
  }

  try {
    // Получение фотографий профиля
    const photos = await bot.telegram.getUserProfilePhotos(userId, 0, 1);

    if (!photos.total_count) {
      avatarCache.set(userId, null);
      return null;
    }

    const fileId = photos.photos[0][0].file_id;

    // Получаем путь к файлу
    const file = await bot.telegram.getFile(fileId);

    const url = `${process.env.FILE_API_URL}/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    // Сохраняем в кеш
    avatarCache.set(userId, url);

    return url;
  } catch (err) {
    console.error("Avatar load error:", err);
    return null;
  }
}

// очистка кеша (опционально)
export function clearAvatarCache() {
  avatarCache.clear();
}
