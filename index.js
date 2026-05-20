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

const db =
  admin.firestore();


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

    await bot.startPolling();

    console.log(
      'Telegram Dhikr Bot Running...'
    );

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
// المشتركين
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
// استخراج الأذكار
// =======================

function extractAllAdhkar() {

  let all = [];

  adhkar.forEach(category => {

    if (
      category.array &&
      Array.isArray(category.array)
    ) {

      category.array.forEach(item => {

        if (item.text) {

          all.push(item.text);

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

    return 'سبحان الله';

  }

  const randomIndex =
    Math.floor(
      Math.random() *
      allAdhkar.length
    );

  return allAdhkar[randomIndex];

}


// =======================
// الملفات الصوتية
// =======================

const audioFolder =
  './audio';

const audioFiles =
  fs.readdirSync(audioFolder)
    .filter(file =>
      file.endsWith('.mp3')
    );


// =======================
// صوت عشوائي
// =======================

function getRandomAudio() {

  const randomIndex =
    Math.floor(
      Math.random() *
      audioFiles.length
    );

  return path.join(
    audioFolder,
    audioFiles[randomIndex]
  );

}


// =======================
// /start
// =======================

bot.onText(
  /\/start/,
  async msg => {

    const chatId =
      msg.chat.id;

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

      } catch (err) {

        console.log(err);

      }

    }

    bot.sendMessage(
      chatId,
      '🌸 تم الاشتراك بنجاح\n\n' +
      'سيتم إرسال الأذكار والمقاطع الصوتية تلقائيًا ❤️'
    );

  }
);


// =======================
// ذكر نصي كل ساعتين
// =======================

cron.schedule(
  '0 */2 * * *',
  async () => {

    console.log(
      'Sending text adhkar...'
    );

    const dhikr =
      getRandomDhikr();

    subscribers.forEach(
      async chatId => {

        try {

          await bot.sendMessage(
            chatId,
            '🌸 ذكر جديد\n\n' +
            dhikr
          );

        } catch (err) {

          console.log(err);

        }

      }
    );

  }
);


// =======================
// صوت كل ساعتين
// =======================

cron.schedule(
  '0 1-23/2 * * *',
  async () => {

    console.log(
      'Sending audio adhkar...'
    );

    const audioFile =
      getRandomAudio();

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