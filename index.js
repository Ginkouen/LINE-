require("dotenv").config();

const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

const timers = new Map();

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const userText = event.message.text;

  // 個人 or グループ対応
  const targetId =
    event.source.groupId ||
    event.source.roomId ||
    event.source.userId;

  // 「あ」でON/OFF
  if (userText === "あ") {
    if (timers.has(targetId)) {
      clearInterval(timers.get(targetId));
      timers.delete(targetId);

      return client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: "停止したよ" }],
      });
    }

    const timer = setInterval(() => {
      client.pushMessage({
        to: targetId,
        messages: [
          {
            type: "text",
            text: "ここに繰り返したい言葉",
          },
        ],
      });
    }, 60000); // ←1分ごと（制限対策）

    timers.set(targetId, timer);

    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: "text", text: "開始したよ" }],
    });
  }

  return;
}

app.get("/", (req, res) => {
  res.send("LINE bot is running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running");
});
