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

  let allAdhkar = [];

  adhkar.forEach(category => {

    if (category.array && Array.isArray(category.array)) {

      category.array.forEach(item => {

        if (item.text) {

          allAdhkar.push(item.text);

        }

      });

    }

  });

  if (allAdhkar.length === 0) {

    return "سبحان الله";

  }

  return allAdhkar[
    Math.floor(Math.random() * allAdhkar.length)
  ];
}


// =========================
// إرسال رسالة Messenger
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

    console.log("Message sent");

  } catch (error) {

    console.log(
      error.response?.data || error.message
    );

  }
}


// =========================
// نشر منشور في الصفحة
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

    console.log(
      error.response?.data || error.message
    );

  }
}


// =========================
// التحقق من Webhook
// =========================

app.get("/webhook", (req, res) => {

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {

    console.log("Webhook verified");

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

      // إضافة المستخدم للمشتركين
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
// إرسال ذكر كل ساعة للمشتركين
// =========================

cron.schedule("0 * * * *", async () => {

  console.log("Sending adhkar to subscribers...");

  const dhikr = getRandomDhikr();

  for (const userId of subscribers) {

    await sendMessage(userId, dhikr);

  }

});


// =========================
// نشر ذكر كل ساعتين
// =========================

cron.schedule("* * * * *", async () => {

  console.log("Publishing post...");

  const dhikr = getRandomDhikr();

  await publishPost(
    "📿 ذكر جديد:\n\n" + dhikr
  );

});


// =========================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {

  console.log(`Bot running on port ${PORT}`);

});