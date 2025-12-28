# PWA Web Push

Backend server for managing Web Push subscriptions and dispatching push notifications using the VAPID protocol.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=pwa-web-push
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@example.com
```

### 3. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Copy the output to your `.env` file.

### 4. Start the server

```bash
npm run dev
```

This will:
- Start MongoDB in Docker (downloads image on first run)
- Start the API server on port 3000
- Start the cron job (sends test notifications every 5 minutes)

---

## API Endpoints

### Create Subscription

```bash
POST /subscriptions
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1...",
    "auth": "tBHItJI5svbpez7KI4CCXg"
  }
}
```

**Response:** `{ "message": "Subscription created", "id": "..." }`

---

### List All Subscriptions

```bash
GET /subscriptions
```

**Response:** Array of all subscriptions

---

### Get Subscription by ID

```bash
GET /subscriptions/:id
```

**Response:** Subscription object

---

### Delete Subscription

```bash
DELETE /subscriptions/:id
```

**Response:** `{ "message": "Subscription deleted" }`

---

### Send Push Notification

```bash
POST /send-push/:subscription_id
Content-Type: application/json

{
  "title": "Hello",
  "body": "This is a test notification",
  "icon": "/icon-192x192.png",
  "data": {
    "url": "/notifications"
  }
}
```

**Response:** `{ "message": "Push notification sent" }`

---

## Automatic Notifications

The server runs a cron job every 5 minutes that sends a test notification to all subscriptions:

```json
{
  "title": "PWA Web Push",
  "body": "Notificação automática - [timestamp]",
  "icon": "/icon-192x192.png",
  "data": { "url": "/" }
}
```

---

## MongoDB Management

### Start/Stop

```bash
npm run docker:up    # Start MongoDB
npm run docker:down  # Stop MongoDB
```

### View Data

Use [MongoDB Compass](https://www.mongodb.com/products/compass) or VS Code extension:

**Connection string:** `mongodb://localhost:27017`

**Database:** `pwa-web-push`

**Collection:** `subscriptions`

---

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## Tech Stack

- **Runtime**: Node.js 22
- **Framework**: Fastify
- **Database**: MongoDB
- **Push Protocol**: VAPID (web-push)
- **Scheduler**: node-cron

---

## License

MIT
