// bot.js
import { Telegraf } from "telegraf";
import { getAvatar } from "./avatars.js";
import { getRoom } from "./rooms.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

// Кнопка Mini App
function miniAppButton(room_code) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🎮 Join Room",
            web_app: {
              url: `${process.env.PUBLIC_URL}/miniapp?room=${room_code}`
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

// Пользователь вводит room_code
bot.on("text", async (ctx) => {
  const code = ctx.message.text.trim().toUpperCase();
  const room = getRoom(code);

  if (!room) {
    return ctx.reply("❌ Комната не найдена.");
  }

  return ctx.reply(
    `Комната ${code} найдена!`,
    miniAppButton(code)
  );
});

// Расширяем API бота функцией fetchAvatar
bot.telegram.fetchAvatar = async (userId) => {
  return await getAvatar(bot, userId);
};

export default bot;
