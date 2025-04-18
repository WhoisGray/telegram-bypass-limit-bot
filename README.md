# Telegram Bypass Limit Bot

A powerful Telegram bot designed to bypass the 50MB download limit using the official Telegram API and streaming technology.

🇮🇷[نسخه فارسی](https://github.com/WhoisGray/telegram-bypass-limit-bot/blob/main/README.fa.md)

## Features

- Download files larger than 50MB without restrictions
- No need to store files on the server
- Files are streamed directly to the user without splitting
- High security with message ID hashing
- Dockerized setup for easy deployment

## Prerequisites

- A server with internet access
- Docker and Docker Compose
- Telegram Bot Token (from BotFather)
- Telegram API ID and API Hash
- A Telegram channel to temporarily store files

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/whoisGray/telegram-bypass-limit-bot.git
cd telegram-bypass-limit-bot
```

### 2. Configure environment variables

Edit the `docker-compose.yml` file and update the following values:

```yaml
environment:
  - BOT_TOKEN=YOUR_BOT_TOKEN # Your Telegram bot token
  - API_ID=YOUR_API_ID # Your Telegram API ID
  - API_HASH=YOUR_API_HASH # Your Telegram API Hash
  - PHONE_NUMBER=YOUR_PHONE_NUMBER # Phone number associated with the API
  - CHANNEL_USERNAME=@your_dummy_channel # Username of your channel
  - HOST=your-server-domain.com # Your server domain or IP address
```

### 3. Build and run the container

```bash
docker-compose up -d
```

### 4. First-time authentication

For the first run, you need to authenticate. Check the container logs:

```bash
docker-compose logs -f
```

Enter the verification code sent to your Telegram phone number when prompted.

### 5. Set up Reverse Proxy (Optional)

For better security and accessibility, you can use Nginx as a reverse proxy:

```nginx
server {
    server_name your-server-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
}
```

## Usage

1. Message the bot: `/start`
2. Send any file to the bot
3. The bot will process the file and provide you with a download link
4. Click the link to stream the file directly to your device

## Bot Commands

- `/start` - Start the bot
- `/help` - Display usage instructions
- `/status` - Check the bot's status

## Important Notes

- Always use a private channel for temporary file storage
- Enable HTTPS for better security
- Regularly backup your session file
- If you need to restart, no re-authentication is required if the session file exists

## Troubleshooting

### Cannot connect to Telegram API

Make sure your API ID and API Hash are entered correctly and that there are no IP restrictions for your server.

### Cannot access channel

Ensure that your Telegram account is a member of the channel and has full access.

### Problems downloading files

Make sure your server has enough bandwidth and that the firewall is not blocking the connection.

## How It Works

1. The bot receives a file from the user
2. It forwards the file to a dummy channel
3. It creates a unique download link with high security
4. The user uses this link to download the file without size limits

The bot leverages Telegram's own API through gram.js and node-telegram-bot-api to bypass the 50MB download limit without splitting files or storing them on your server.

## License

MIT

## Credits

Created by [whoisGray](https://github.com/whoisGray)
