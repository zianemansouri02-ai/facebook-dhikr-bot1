const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");

const admin = require("firebase-admin");

const firebaseConfig = JSON.parse(
  process.env.FIREBASE_CONFIG
);

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

const db = admin.firestore();

const app = express();

app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN =
  process.env.PAGE_ACCESS_TOKEN;

const VERIFY_TOKEN =
  "dhikr_verify_token";


// =========================
// قراءة ملف الأذكار
// =========================

const adhkar = JSON.parse(
  fs.readFileSync("./adhkar.json", "utf8")
);


// =========================
// جلب ذكر عشوائي
// =========================

function getRandomDhikr() {

  let allAdhkar = [];

  adhkar.forEach(category => {

    if (
      category.array &&
      Array.isArray(category.array)
    ) {

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
    Math.floor(
      Math.random() * allAdhkar.length
    )
  ];
}


// =========================
// إرسال رسالة Messenger
// =========================

async function sendMessage(
  recipientId,
  text
) {

  try {

    await axios.post(
      "https://graph.facebook.com/v19.0/me/messages",
      {
        recipient: {
          id: recipientId
        },
        message: {
          text: text
        }
      },
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN
        }
      }
    );

    console.log(
      "Message sent to:",
      recipientId
    );

  } catch (error) {

    console.log(
      "Send Error:",
      error.response?.data ||
      error.message
    );

  }
}


// =========================
// الصفحة الرئيسية
// =========================

app.get("/", (req, res) => {

  res.send("Dhikr Bot Working");

});


// =========================
// Webhook Verification
// =========================

app.get("/webhook", (req, res) => {

  const mode =
    req.query["hub.mode"];

  const token =
    req.query["hub.verify_token"];

  const challenge =
    req.query["hub.challenge"];

  if (
    mode &&
    token === VERIFY_TOKEN
  ) {

    console.log(
      "Webhook verified"
    );

    res.status(200).send(challenge);

  } else {

    res.sendStatus(403);

  }
});


// =========================
// استقبال الرسائل
// =========================

app.post("/webhook", async (
  req,
  res
) => {

  const body = req.body;

  if (body.object === "page") {

    for (const entry of body.entry) {

      const webhookEvent =
        entry.messaging[0];

      const senderId =
        webhookEvent.sender.id;

      // حفظ المشترك في Firebase
      await db
        .collection("subscribers")
        .doc(senderId)
        .set({
          subscribed: true,
          createdAt: Date.now()
        });

      console.log(
        "Subscriber saved:",
        senderId
      );

      // إرسال ذكر مباشر
      const dhikr =
        getRandomDhikr();

      await sendMessage(
        senderId,
        "🌸 تم الاشتراك بنجاح\n\n" +
        dhikr
      );
    }

    res.status(200).send(
      "EVENT_RECEIVED"
    );

  } else {

    res.sendStatus(404);

  }
});


// =========================
// إرسال أذكار كل ساعة
// =========================

cron.schedule(
  "0 * * * *",
  async () => {

    console.log(
      "Sending adhkar to subscribers..."
    );

    const snapshot =
      await db
      .collection("subscribers")
      .get();

    const dhikr =
      getRandomDhikr();

    for (const doc of snapshot.docs) {

      const userId = doc.id;

      await sendMessage(
        userId,
        dhikr
      );
    }

    console.log(
      "All adhkar sent"
    );

  }
);


// =========================
// تشغيل السيرفر
// =========================

const PORT =
  process.env.PORT || 10000;

app.listen(PORT, () => {

  console.log(
    `Bot running on port ${PORT}`
  );

});