const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");

const app = express();

app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = "dhikr_verify_token";


// =========================
// قراءة ملف الأذكار
// =========================

const adhkar = JSON.parse(
  fs.readFileSync("./adhkar.json", "utf8")
);


// =========================
// تخزين المشتركين
// =========================

let subscribers = [];


// =========================
// جلب ذكر عشوائي
// =========================

function getRandomDhikr() {

  const categories = Object.keys(adhkar);

  const randomCategory =
    categories[Math.floor(Math.random() * categories.length)];

  const items = adhkar[randomCategory];

  const randomItem =
    items[Math.floor(Math.random() * items.length)];

  return randomItem.zekr || "سبحان الله";
}


// =========================
// إرسال رسالة
// =========================

async function sendMessage(recipientId, text) {

  try {

    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: {
          id: recipientId
        },
        message: {
          text: text
        }
      }
    );

  } catch (error) {

    console.log(error.response?.data || error.message);

  }
}


// =========================
// نشر على الصفحة
// =========================

async function publishPost(text) {

  try {

    await axios.post(
      `https://graph.facebook.com/v19.0/me/feed?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        message: text
      }
    );

    console.log("Post published");

  } catch (error) {

    console.log(error.response?.data || error.message);

  }
}


// =========================
// Webhook Verify
// =========================

app.get("/webhook", (req, res) => {

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {

    res.status(200).send(challenge);

  } else {

    res.sendStatus(403);

  }
});


// =========================
// استقبال الرسائل
// =========================

app.post("/webhook", async (req, res) => {

  const body = req.body;

  if (body.object === "page") {

    for (const entry of body.entry) {

      const webhookEvent = entry.messaging[0];

      const senderId = webhookEvent.sender.id;

      // إضافة المستخدم إن لم يكن موجود
      if (!subscribers.includes(senderId)) {

        subscribers.push(senderId);

        await sendMessage(
          senderId,
          "🌸 تم الاشتراك في الأذكار بنجاح"
        );
      }

      // إرسال ذكر عشوائي
      const dhikr = getRandomDhikr();

      await sendMessage(senderId, dhikr);
    }

    res.status(200).send("EVENT_RECEIVED");

  } else {

    res.sendStatus(404);

  }
});


// =========================
// إرسال أذكار تلقائيًا كل ساعة
// =========================

cron.schedule("0 * * * *", async () => {

  console.log("Sending adhkar...");

  const dhikr = getRandomDhikr();

  for (const userId of subscribers) {

    await sendMessage(userId, dhikr);

  }

});


// =========================
// نشر تلقائي على الصفحة كل 6 ساعات
// =========================

cron.schedule("0 */6 * * *", async () => {

  const dhikr = getRandomDhikr();

  await publishPost("📿 ذكر اليوم:\n\n" + dhikr);

});


// =========================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {

  console.log(`Bot running on port ${PORT}`);

});