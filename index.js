require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const app = express();

const token = process.env.BOT_TOKEN;

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

console.log(`Loaded ${subscribers.length} subscribers`);





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

  const random =
    azkar[Math.floor(Math.random() * azkar.length)];

  if (typeof random === "string") {
    return random;
  }

  return (
    random.zekr ||
    random.text ||
    random.content ||
    "سبحان الله"
  );

}





// ==========================
// اختيار ملف صوتي عشوائي
// ==========================

function getRandomAudio() {

  const audioFolder =
    path.join(__dirname, "audio");

  const files = fs.readdirSync(audioFolder);

  const mp3Files = files.filter(file =>
    file.endsWith(".mp3")
  );

  if (mp3Files.length === 0) {
    return null;
  }

  const randomFile =
    mp3Files[
      Math.floor(Math.random() * mp3Files.length)
    ];

  return path.join(audioFolder, randomFile);

}





// ==========================
// أوامر البوت
// ==========================

bot.onText(/\/start/, async (msg) => {

  const chatId = msg.chat.id;

  if (!subscribers.includes(chatId)) {

    subscribers.push(chatId);

    saveSubscribers();

    console.log(`Subscriber saved: ${chatId}`);

  }

  bot.sendMessage(
    chatId,
    `🌸 تم الاشتراك بنجاح\n\nسيتم إرسال الأذكار والمقاطع الصوتية تلقائيًا ❤️`
  );

});





// ==========================
// إرسال ذكر عند أي رسالة
// ==========================

bot.on("message", async (msg) => {

  const chatId = msg.chat.id;

  if (msg.text === "/start") return;

  const dhikr = getRandomDhikr();

  bot.sendMessage(chatId, dhikr);

});





// ==========================
// إرسال أذكار تلقائيًا كل ساعة
// ==========================

cron.schedule("0 * * * *", async () => {

  console.log("Sending adhkar...");

  for (const chatId of subscribers) {

    try {

      const dhikr = getRandomDhikr();

      await bot.sendMessage(chatId, dhikr);

    } catch (err) {

      console.log(err.message);

    }

  }

});





// ==========================
// إرسال مقطع صوتي كل ساعتين
// ==========================

cron.schedule("0 */2 * * *", async () => {

  console.log("Sending audio adhkar...");

  const audioFile = getRandomAudio();

  if (!audioFile) return;

  for (const chatId of subscribers) {

    try {

      await bot.sendAudio(
        chatId,
        audioFile,
        {
          caption: "🎧 استمع لهذا الذكر"
        }
      );

    } catch (err) {

      console.log(err.message);

    }

  }

});





// ==========================
// تشغيل السيرفر
// ==========================

app.get("/", (req, res) => {

  res.send("Telegram Dhikr Bot Running...");

});

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});