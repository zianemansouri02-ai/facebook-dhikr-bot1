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

const VERIFY_TOKEN = "verify_token";

const azkar = JSON.parse(
  fs.readFileSync("adhkar.json", "utf8")
);

function randomDhikr() {

  const random =
    azkar[Math.floor(Math.random() * azkar.length)];

  return (
    random.arabic ||
    random.text ||
    "سبحان الله"
  );
}

app.get("/", (req, res) => {

  res.send("Bot Working");
});

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

app.post("/webhook", async (req, res) => {

  const body = req.body;

  if (body.object === "page") {

    for (const entry of body.entry) {

      const webhookEvent = entry.messaging[0];

      const senderId = webhookEvent.sender.id;

      await db
      .collection("subscribers")
      .doc(senderId)
      .set({
        subscribed: true,
        createdAt: Date.now()
      });

      await sendMessage(
        senderId,
        "🌸 تم الاشتراك في الأذكار بنجاح"
      );
    }

    res.status(200).send("EVENT_RECEIVED");

  } else {

    res.sendStatus(404);
  }
});

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

    console.log(
      error.response?.data || error.message
    );
  }
}

cron.schedule("0 * * * *", async () => {

  try {

    console.log("Sending adhkar...");

    const snapshot =
      await db.collection("subscribers").get();

    const dhikr = randomDhikr();

    for (const doc of snapshot.docs) {

      await sendMessage(doc.id, dhikr);
    }

    await axios.post(
      `https://graph.facebook.com/v19.0/me/feed`,
      {
        message: dhikr,
        access_token: PAGE_ACCESS_TOKEN
      }
    );

    console.log("Done");

  } catch (error) {

    console.log(
      error.response?.data || error.message
    );
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Bot running on port ${PORT}`
  );
});