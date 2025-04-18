// index.js - Main application file
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Configuration - These should be moved to environment variables in production
const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_BOT_TOKEN";
const API_ID = parseInt(process.env.API_ID) || 12345; // Replace with your API ID
const API_HASH = process.env.API_HASH || "YOUR_API_HASH";
const PHONE_NUMBER = process.env.PHONE_NUMBER || "YOUR_PHONE_NUMBER";
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@your_dummy_channel";
const PORT = process.env.PORT || 3000;
const SESSION_FILE = path.join(__dirname, "session.json");

// Initialize Express
const app = express();

// Initialize the Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log("Bot is running...");

// Utility to hash message IDs for security
function hashMessageId(messageId) {
  return crypto
    .createHash("sha256")
    .update(`${messageId}-${BOT_TOKEN.substring(0, 10)}`)
    .digest("hex");
}

// Utility to verify and extract message ID from hash
function verifyAndExtractMessageId(hash, providedMessageId) {
  const expectedHash = hashMessageId(providedMessageId);
  if (hash === expectedHash) {
    return parseInt(providedMessageId);
  }
  return null;
}

// Initialize Telegram Client with gram.js
let client;
let stringSession;

// Load session from file if exists
if (fs.existsSync(SESSION_FILE)) {
  const sessionData = fs.readFileSync(SESSION_FILE, "utf8");
  stringSession = new StringSession(sessionData);
  console.log("Loaded session from file");
} else {
  stringSession = new StringSession("");
  console.log("No saved session found, creating new one");
}

// Connect to Telegram
async function initializeTelegramClient() {
  try {
    console.log("Initializing Telegram client...");
    client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: PHONE_NUMBER,
      phoneCode: async () =>
        await input.text("Please enter the code you received: "),
      onError: (err) => console.log("Client initialization error:", err),
    });

    console.log("Telegram client connected successfully");

    // Save session for future use
    fs.writeFileSync(SESSION_FILE, client.session.save());
    console.log("Session saved to file");

    return true;
  } catch (error) {
    console.error("Failed to initialize Telegram client:", error);
    return false;
  }
}

// Bot message handler for file uploads
bot.on("message", async (msg) => {
  // Check if the message contains a document
  if (msg.document) {
    const chatId = msg.chat.id;
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name;
    const fileSize = msg.document.file_size;

    console.log(`Received file: ${fileName} (${fileSize} bytes)`);

    try {
      // Notify user that the file is being processed
      await bot.sendMessage(
        chatId,
        `Processing file: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(
          2
        )} MB)...`
      );

      // Forward the file to the dummy channel
      const forwardedMsg = await bot.sendDocument(CHANNEL_USERNAME, fileId);
      const messageId = forwardedMsg.message_id;

      // Hash the message ID for security
      const hashedId = hashMessageId(messageId);

      // Generate a download link
      const downloadLink = `http://${
        process.env.HOST || "localhost"
      }:${PORT}/stream/${hashedId}/${messageId}/${encodeURIComponent(
        fileName
      )}`;

      // Send the download link to the user
      await bot.sendMessage(
        chatId,
        `Your file has been processed successfully!\n\n` +
          `📥 Download link: ${downloadLink}\n\n` +
          `This link bypasses the 50MB Telegram limit. The file will be streamed directly to your device.`
      );

      console.log(`Created download link for message ID: ${messageId}`);
    } catch (error) {
      console.error("Error processing file:", error);
      await bot.sendMessage(
        chatId,
        `Error processing your file: ${error.message}`
      );
    }
  }
});

// Help command handler
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `*Large File Downloader Bot*\n\n` +
      `This bot allows you to download files larger than Telegram's 50MB limit.\n\n` +
      `*How to use:*\n` +
      `1. Simply send any file to this bot\n` +
      `2. The bot will process it and give you a download link\n` +
      `3. Use the link to download your file without size restrictions\n\n` +
      `*Commands:*\n` +
      `/start - Start the bot\n` +
      `/help - Show this help message\n` +
      `/status - Check the bot's status`,
    { parse_mode: "Markdown" }
  );
});

// Start command handler
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `Welcome to the Large File Downloader Bot!\n\n` +
      `Send me any file and I'll create a download link that bypasses Telegram's 50MB limit.\n\n` +
      `Use /help to learn more.`
  );
});

// Status command handler
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `*Bot Status*\n\n` +
      `✅ Bot is online and operational\n` +
      `✅ Telegram client is ${
        client && client.connected ? "connected" : "disconnected"
      }\n` +
      `✅ Server is running on port ${PORT}\n`,
    { parse_mode: "Markdown" }
  );
});

// Express endpoint for streaming files
app.get("/stream/:hash/:messageId/:fileName", async (req, res) => {
  try {
    const { hash, messageId, fileName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);

    console.log(
      `Download request for file: ${decodedFileName}, messageId: ${messageId}`
    );

    // Verify hash for security
    const verifiedMsgId = verifyAndExtractMessageId(hash, messageId);
    if (!verifiedMsgId) {
      console.error("Invalid hash or message ID");
      return res.status(403).send("Access denied: Invalid or tampered request");
    }

    // Check if client is initialized
    if (!client || !client.connected) {
      console.error("Telegram client not initialized");
      return res
        .status(500)
        .send("Server error: Telegram client not connected");
    }

    // Get message from channel
    const result = await client.invoke(
      new Api.channels.GetMessages({
        channel: CHANNEL_USERNAME,
        id: [verifiedMsgId],
      })
    );

    if (!result.messages || !result.messages[0]) {
      console.error("Message not found");
      return res
        .status(404)
        .send("File not found: The requested file no longer exists");
    }

    const message = result.messages[0];

    // Check if message contains media
    if (!message.media) {
      console.error("No media in message");
      return res
        .status(404)
        .send("File not found: The message does not contain a file");
    }

    // Set response headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${decodedFileName}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    // Stream the file to the client
    console.log(`Starting download stream for ${decodedFileName}`);
    await client.downloadMedia(message.media, {
      outputFile: res,
      progressCallback: (downloadedBytes, totalBytes) => {
        if (totalBytes && downloadedBytes % (5 * 1024 * 1024) === 0) {
          // Log every 5MB
          console.log(
            `Download progress: ${(downloadedBytes / (1024 * 1024)).toFixed(
              2
            )}MB / ${(totalBytes / (1024 * 1024)).toFixed(2)}MB (${Math.round(
              (downloadedBytes * 100) / totalBytes
            )}%)`
          );
        }
      },
    });

    console.log(`Download completed for ${decodedFileName}`);
  } catch (error) {
    console.error("Error streaming file:", error);

    // Send appropriate error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).send(`Server error: ${error.message}`);
    } else {
      // If headers already sent, just end the response
      res.end();
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).send("Internal Server Error");
});

// Start server and initialize client
async function startServer() {
  try {
    // First initialize Telegram client
    const clientInitialized = await initializeTelegramClient();

    if (!clientInitialized) {
      console.error(
        "Failed to start server: Telegram client initialization failed"
      );
      process.exit(1);
    }

    // Then start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
