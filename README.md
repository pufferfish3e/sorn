This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Telegram reminders

Sorn can send Telegram trial reminders one day before a trial ends.

### App setup

Add these environment variables:

```bash
TELEGRAM_BOT_TOKEN=123456:bot-token-from-botfather
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_SECRET=long-random-webhook-secret
CRON_SECRET=long-random-secret
```

Register the Telegram webhook after deploy:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://your-domain.com/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Run the reminder dispatch from a daily cron job:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/reminders/telegram
```

New users see an onboarding flow that creates a one-click Telegram setup link.
The bot webhook receives `/start <token>`, stores the Telegram chat ID, and the
dashboard finishes setup automatically. The Channels popover still accepts a
manual numeric chat ID fallback.

### Telegram setup

1. In Telegram, open `@BotFather`.
2. Send `/newbot`, choose a display name and username, then copy the token.
3. Add the token to `TELEGRAM_BOT_TOKEN`.
4. Add the bot username to `TELEGRAM_BOT_USERNAME` without the leading `@`.
5. Deploy the app and register the webhook above.
6. Sign in with a fresh account and use the onboarding Telegram link.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
