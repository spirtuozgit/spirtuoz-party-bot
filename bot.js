import { Telegraf } from "telegraf";
import { getAvatar } from "./avatars.js";
import { getRoom } from "./rooms.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * Формирует правильную Telegram WebApp кнопку
 * Основанную на ДАННЫХ ИЗ КОМНАТЫ
 * (а НЕ на PUBLIC_URL или Render)
 */
function miniAppButton(room) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🎮 Join Room",
            web_app: {
              // ВАЖНО:
              // MiniApp URL ДОЛЖЕН БЫТЬ ТОЛЬКО ТЕМ,
              // который вернул HOST через registerRoom()
              url: `${room.app_url}?room=${room.room_code}`
            }
          }
        ]
      ]
    }
  };
}

// Приветственное сообщение
bot.start((ctx) => {
  ctx.reply("Введите код комнаты, чтобы войти.");
});

// Пользователь отправляет код комнаты
bot.on("text", async (ctx) => {
  const code = ctx.message.text.trim().toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return ctx.reply("❌ Комната не найдена.");
  }

  // Показываем кнопку WebApp с правильным URL
  return ctx.reply(
    `Комната ${code} найдена!`,
    miniAppButton(room)
  );
});

// Получение аватаров Telegram
bot.telegram.fetchAvatar = async (userId) => {
  return await getAvatar(bot, userId);
};

export default bot;
