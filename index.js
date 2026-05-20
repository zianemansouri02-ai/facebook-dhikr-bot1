const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const cron = require('node-cron');
const path = require('path');
const admin = require('firebase-admin');


// =======================
// Firebase
// =======================

const serviceAccount = require(
  '/etc/secrets/serviceAccountKey.json'
);

admin.initializeApp({
  credential:
    admin.credential.cert(
      serviceAccount
    )
});

const db = admin.firestore();


// =======================
// Express Server
// =======================

const app = express();

const PORT =
  process.env.PORT || 10000;

app.get('/', (req, res) => {

  res.send('Bot is running');

});

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});


// =======================
// Telegram
// =======================

const TOKEN =
'8755315321:AAFrcFqGZC1vWiOB9JhPd5zpBt7k9TKLWEc';

const bot = new TelegramBot(
  TOKEN,
  {
    polling: false
  }
);


// =======================
// تشغيل البوت
// =======================

async function startBot() {

  try {

    await bot.deleteWebHook({
      drop_pending_updates: true
    });

    setTimeout(async () => {

      await bot.startPolling();

      console.log(
        'Telegram Dhikr Bot Running...'
      );

    }, 5000);

  } catch (err) {

    console.log(err);

  }

}

startBot();


// =======================
// قراءة الأذكار
// =======================

const rawData =
  fs.readFileSync(
    './adhkar.json',
    'utf8'
  );

const adhkar =
  JSON.parse(rawData);


// =======================
// المشتركون
// =======================

let subscribers = [];


// =======================
// تحميل المشتركين
// =======================

async function loadSubscribers() {

  try {

    const snapshot =
      await db
        .collection('subscribers')
        .get();

    snapshot.forEach(doc => {

      subscribers.push(
        doc.data().chatId
      );

    });

    console.log(
      `Loaded ${subscribers.length} subscribers`
    );

  } catch (err) {

    console.log(err);

  }

}

loadSubscribers();


// =======================
// حفظ مشترك
// =======================

async function saveSubscriber(chatId) {

  if (
    !subscribers.includes(chatId)
  ) {

    subscribers.push(chatId);

    try {

      await db
        .collection('subscribers')
        .doc(chatId.toString())
        .set({
          chatId
        });

      console.log(
        `Subscriber saved: ${chatId}`
      );

    } catch (err) {

      console.log(err);

    }

  }

}


// =======================
// استخراج كل الأذكار
// =======================

function extractAllAdhkar() {

  let all = [];

  adhkar.forEach(category => {

    if (
      category.array &&
      Array.isArray(category.array)
    ) {

      category.array.forEach(item => {

        if (
          item.text &&
          item.audio
        ) {

          all.push({
            text: item.text,
            audio: item.audio
          });

        }

      });

    }

  });

  return all;

}

const allAdhkar =
  extractAllAdhkar();


// =======================
// ذكر عشوائي
// =======================

function getRandomDhikr() {

  if (
    allAdhkar.length === 0
  ) {

    return {
      text: 'سبحان الله',
      audio: null
    };

  }

  const randomIndex =
    Math.floor(
      Math.random() *
      allAdhkar.length
    );

  return allAdhkar[randomIndex];

}


// =======================
// /start
// =======================

bot.onText(
  /\/start/,
  async msg => {

    const chatId =
      msg.chat.id;

    await saveSubscriber(chatId);

    bot.sendMessage(
      chatId,
      '🌸 تم الاشتراك بنجاح\n\n' +
      'سيتم إرسال الأذكار والمقاطع الصوتية تلقائيًا ❤️'
    );

  }
);


// =======================
// المجموعات
// =======================

bot.on(
  'new_chat_members',
  async msg => {

    const chatId =
      msg.chat.id;

    await saveSubscriber(chatId);

    console.log(
      `Group subscribed: ${chatId}`
    );

  }
);


// =======================
// القنوات
// =======================

bot.on(
  'channel_post',
  async msg => {

    const chatId =
      msg.chat.id;

    await saveSubscriber(chatId);

    console.log(
      `Channel subscribed: ${chatId}`
    );

  }
);


// =======================
// إرسال ذكر نصي كل ساعتين
// =======================

cron.schedule(
  '0 */2 * * *',
  async () => {

    console.log(
      'Sending text adhkar...'
    );

    const dhikrData =
      getRandomDhikr();

    subscribers.forEach(
      async chatId => {

        try {

          await bot.sendMessage(
            chatId,
            '🌸 ذكر جديد\n\n' +
            dhikrData.text
          );

        } catch (err) {

          console.log(err);

        }

      }
    );

  }
);


// =======================
// إرسال الصوت كل ساعتين
// =======================

cron.schedule(
  '0 1-23/2 * * *',
  async () => {

    console.log(
      'Sending audio adhkar...'
    );

    const dhikrData =
      getRandomDhikr();

    if (!dhikrData.audio) {

      return;

    }

    const audioFile =
      '.' + dhikrData.audio;

    subscribers.forEach(
      async chatId => {

        try {

          await bot.sendAudio(
            chatId,
            audioFile,
            {
              caption:
                '🎧 استمع لهذا الذكر'
            }
          );

        } catch (err) {

          console.log(err);

        }

      }
    );

  }
);