require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const app = express();

const token = process.env.BOT_TOKEN;

if (!token) {
  console.log("❌ BOT_TOKEN غير موجود");
  process.exit(1);
}

const bot = new TelegramBot(token, {
  polling: true
});

const PORT = process.env.PORT || 10000;





// ==========================
// تحميل ملف الأذكار
// ==========================

const azkar = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "adhkar.json"),
    "utf8"
  )
);

console.log("✅ adhkar.json loaded");





// ==========================
// ملف حفظ المشتركين
// ==========================

const subscribersFile = "subscribers.json";

let subscribers = [];

if (fs.existsSync(subscribersFile)) {

  subscribers = JSON.parse(
    fs.readFileSync(subscribersFile)
  );

}

console.log(`✅ Loaded ${subscribers.length} subscribers`);





// ==========================
// حفظ المشتركين
// ==========================

function saveSubscribers() {

  fs.writeFileSync(
    subscribersFile,
    JSON.stringify(subscribers, null, 2)
  );

}





// ==========================
// اختيار ذكر عشوائي
// ==========================

function getRandomDhikr() {

  const category =
    azkar[Math.floor(Math.random() * azkar.length)];

  const item =
    category.array[
      Math.floor(Math.random() * category.array.length)
    ];

  return {
    category: category.category,
    text: item.text,
    audio: item.audio
  };

}





// ==========================
// /start
// ==========================

bot.onText(/\/start/, async (msg) => {

  const chatId = msg.chat.id;

  if (!subscribers.includes(chatId)) {

    subscribers.push(chatId);

    saveSubscribers();

    console.log(`✅ Subscriber saved: ${chatId}`);

  }

  bot.sendMessage(
    chatId,
    `🌸 تم الاشتراك بنجاح\n\nسيتم إرسال الأذكار والمقاطع الصوتية تلقائيًا ❤️`
  );

});





// ==========================
// الرد على الرسائل
// ==========================

bot.on("message", async (msg) => {

  const chatId = msg.chat.id;

  if (msg.text === "/start") return;

  try {

    const dhikr = getRandomDhikr();

    await bot.sendMessage(
      chatId,
      `📖 ${dhikr.category}\n\n${dhikr.text}`
    );

  } catch (err) {

    console.log(err.message);

  }

});





// ==========================
// إرسال ذكر كل ساعة
// ==========================

cron.schedule("0 * * * *", async () => {

  console.log("📖 Sending adhkar...");

  for (const chatId of subscribers) {

    try {

      const dhikr = getRandomDhikr();

      await bot.sendMessage(
        chatId,
        `📖 ${dhikr.category}\n\n${dhikr.text}`
      );

    } catch (err) {

      console.log(err.message);

    }

  }

});





// ==========================
// إرسال صوت كل ساعتين
// ==========================

cron.schedule("0 */2 * * *", async () => {

  console.log("🎧 Sending audio adhkar...");

  for (const chatId of subscribers) {

    try {

      const dhikr = getRandomDhikr();

      await bot.sendMessage(
        chatId,
        `📖 ${dhikr.category}\n\n${dhikr.text}`
      );

      if (dhikr.audio) {

        const audioPath =
          path.join(__dirname, dhikr.audio);

        if (fs.existsSync(audioPath)) {

          await bot.sendAudio(
            chatId,
            audioPath,
            {
              caption: "🎧 استمع لهذا الذكر"
            }
          );

        } else {

          console.log(`❌ Audio not found: ${audioPath}`);

        }

      }

    } catch (err) {

      console.log(err.message);

    }

  }

});





// ==========================
// تشغيل السيرفر
// ==========================

app.get("/", (req, res) => {

  res.send("✅ Telegram Dhikr Bot Running");

});

app.listen(PORT, () => {

  console.log(`🚀 Server running on port ${PORT}`);

});