import { Telegraf } from "telegraf";
import { getAvatar } from "./avatars.js";
import { getRoom } from "./rooms.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * Формирует Telegram WebApp кнопку,
 * используя app_url ИЗ КОМНАТЫ
 */
function miniAppButton(room) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🎮 Join Room",
            web_app: {
              url: `${room.app_url}?room=${room.room_code}`
            }
          }
        ]
      ]
    }
  };
}

bot.start((ctx) => {
  ctx.reply("Введите код комнаты, чтобы войти.");
});

bot.on("text", async (ctx) => {
  const code = ctx.message.text.trim().toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return ctx.reply("❌ Комната не найдена.");
  }

  return ctx.reply(
    `Комната ${code} найдена!`,
    miniAppButton(room)
  );
});

// Аватары
bot.telegram.fetchAvatar = async (userId) => {
  return await getAvatar(bot, userId);
};

export default bot;
