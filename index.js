const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const cron = require('node-cron');

const TOKEN =
'8755315321:AAFrcFqGZC1vWiOB9JhPd5zpBt7k9TKLWEc';

const bot = new TelegramBot(TOKEN, {
  polling: true
});


// =========================
// قراءة ملف الأذكار
// =========================

const adhkar = JSON.parse(
  fs.readFileSync('./adhkar.json', 'utf8')
);


// =========================
// المشتركين
// =========================

let subscribers = [];


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

    return 'سبحان الله';

  }

  return allAdhkar[
    Math.floor(
      Math.random() * allAdhkar.length
    )
  ];
}


// =========================
// أمر /start
// =========================

bot.onText(/\/start/, (msg) => {

  const chatId = msg.chat.id;

  if (!subscribers.includes(chatId)) {

    subscribers.push(chatId);

  }

  bot.sendMessage(
    chatId,
    '🌸 تم الاشتراك في الأذكار بنجاح\n\n' +
    getRandomDhikr()
  );

});


// =========================
// أي رسالة
// =========================

bot.on('message', (msg) => {

  const chatId = msg.chat.id;

  if (!subscribers.includes(chatId)) {

    subscribers.push(chatId);

  }

  const dhikr = getRandomDhikr();

  bot.sendMessage(chatId, dhikr);

});


// =========================
// إرسال ذكر كل ساعتين
// =========================

cron.schedule('0 */2 * * *', () => {

  console.log(
    'Sending adhkar...'
  );

  const dhikr =
    getRandomDhikr();

  subscribers.forEach(chatId => {

    bot.sendMessage(
      chatId,
      '🌸 ذكر جديد\n\n' + dhikr
    );

  });

});


// =========================
// تشغيل
// =========================

console.log(
  'Telegram Dhikr Bot Running...'
);