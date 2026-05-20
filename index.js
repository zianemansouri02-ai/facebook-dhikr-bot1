const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const cron = require('node-cron');
const path = require('path');

const TOKEN =
'8755315321:AAFrcFqGZC1vWiOB9JhPd5zpBt7k9TKLWEc';


// =======================
// تشغيل البوت
// =======================

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

bot.deleteWebHook();


// =======================
// قراءة ملف الأذكار
// =======================

const rawData = fs.readFileSync(
  './adhkar.json',
  'utf8'
);

const adhkar = JSON.parse(rawData);


// =======================
// المشتركين
// =======================

let subscribers = [];


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
    !allAdhkar ||
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

const audioFolder = './audio';

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

bot.onText(/\/start/, (msg) => {

  const chatId =
    msg.chat.id;

  if (
    !subscribers.includes(chatId)
  ) {

    subscribers.push(chatId);

  }

  bot.sendMessage(
    chatId,
    '🌸 تم الاشتراك في الأذكار بنجاح\n\n' +
    getRandomDhikr()
  );

});


// =======================
// الرد على الرسائل
// =======================

bot.on('message', (msg) => {

  const chatId =
    msg.chat.id;

  if (
    !subscribers.includes(chatId)
  ) {

    subscribers.push(chatId);

  }

  const dhikr =
    getRandomDhikr();

  bot.sendMessage(
    chatId,
    dhikr
  );

});


// =======================
// إرسال ذكر نصي كل ساعتين
// =======================

cron.schedule(
  '0 */2 * * *',
  () => {

    console.log(
      'Sending text adhkar...'
    );

    const dhikr =
      getRandomDhikr();

    subscribers.forEach(
      chatId => {

        bot.sendMessage(
          chatId,
          '🌸 ذكر جديد\n\n' +
          dhikr
        );

      }
    );

  }
);


// =======================
// إرسال صوت كل ساعتين
// =======================

cron.schedule(
  '0 1-23/2 * * *',
  () => {

    console.log(
      'Sending audio adhkar...'
    );

    const audioFile =
      getRandomAudio();

    subscribers.forEach(
      chatId => {

        bot.sendAudio(
          chatId,
          audioFile,
          {
            caption:
              '🎧 استمع لهذا الذكر'
          }
        );

      }
    );

  }
);


// =======================
// تشغيل
// =======================

console.log(
  'Telegram Dhikr Bot Running...'
);