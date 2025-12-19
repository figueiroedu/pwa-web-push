# PWA Web Push

This repository originated as a **proof of concept (POC)** for adding Progressive Web App (PWA) support with Web Push Notifications to an existing web application.

The goal was to validate the technical feasibility of implementing:

- **Web Push Notifications** using the VAPID protocol
- **Backend service** to manage push subscriptions and dispatch notifications

## Tech Stack

- **Runtime**: Node.js 22
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: MongoDB
- **Push Notifications**: web-push (VAPID)
- **Scheduler**: node-cron

## Prerequisites

- Node.js 22+
- Docker (for MongoDB)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and adjust as needed:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `HOST` | Server host (default: 0.0.0.0) |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB_NAME` | Database name |
| `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key (keep secret) |
| `VAPID_SUBJECT` | VAPID subject (mailto: or https://) |

### 3. Generate VAPID keys (if needed)

```bash
npx web-push generate-vapid-keys
```

### 4. Run the server

```bash
# Start MongoDB + server
npm run dev

# Or start only the server (MongoDB must be running)
npm run dev:server
```

## Docker (MongoDB)

The project uses MongoDB via Docker. The `npm run dev` command automatically starts the MongoDB container.

### Manual Docker commands

```bash
# Start MongoDB container (with persistent volume)
npm run docker:up

# Stop MongoDB container
npm run docker:down

# Check if container is running
docker ps
```

### First time setup

On first run, Docker will download the MongoDB image (~300MB). This only happens once.

### Data persistence

Data is stored in a Docker volume (`mongodb_data`). Your data persists even if you stop the container.

| Command | Data |
|---------|------|
| `docker stop mongodb` | Preserved |
| `docker start mongodb` | Still there |
| `docker rm mongodb` | **Lost** (volume remains) |
| `docker volume rm mongodb_data` | **Lost permanently** |

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/subscriptions` | Create a subscription |
| GET | `/subscriptions/:id` | Get subscription by ID |
| DELETE | `/subscriptions/:id` | Delete subscription by ID |
| POST | `/send-push/:subscription_id` | Send push to a subscription |

## Cron Job

A cron job runs every 5 minutes and sends a push notification to all saved subscriptions. This simulates the scheduled notification flow used in production.

## License

MIT
