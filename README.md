# Pastebin Application

A simple, secure Pastebin-like application that allows users to create and share text pastes with optional time-based expiry and view count limits.

## Features

- **Create Pastes**: Users can easily create text pastes with optional constraints
- **Shareable Links**: Each paste gets a unique shareable URL
- **Time-to-Live (TTL)**: Optional automatic expiration after a specified duration
- **View Limits**: Optional view count restrictions
- **Secure Rendering**: Content is safely escaped to prevent script execution
- **Persistent Storage**: Uses Vercel KV for reliable data persistence

## Persistence Layer

This application uses **Vercel KV** for persistence. Vercel KV is a serverless Redis-compatible database that:
- Survives across requests and deployments
- Works seamlessly with Vercel Functions
- Provides automatic expiration support (for TTL)
- Is fully managed with no infrastructure overhead

## Prerequisites

- Node.js 16+ and npm
- Vercel account (for deployment)
- Vercel KV database (created via Vercel console)

## Installation & Running Locally

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pastebin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Add your Vercel KV credentials:
     ```
     KV_REST_API_URL=https://your-project.kv.vercel.sh
     KV_REST_API_TOKEN=your_token_here
     ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000`

## Deployment to Vercel

1. **Connect your repository to Vercel**
   ```bash
   vercel
   ```

2. **Create a Vercel KV database**
   - Go to Vercel Dashboard → Storage → Create Database (Vercel KV)
   - Link it to your project

3. **Environment variables will be automatically set**
   - Vercel automatically injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`

4. **Deploy**
   ```bash
   vercel --prod
   ```

## API Endpoints

### Health Check
```
GET /api/healthz
Response: { "ok": true }
```

### Create a Paste
```
POST /api/pastes
Content-Type: application/json

Request:
{
  "content": "Your text here",
  "ttl_seconds": 3600,        // Optional
  "max_views": 10             // Optional
}

Response (2xx):
{
  "id": "abc123xyz",
  "url": "https://your-app.vercel.app/p/abc123xyz"
}
```

### Fetch Paste (API)
```
GET /api/pastes/:id
Response:
{
  "content": "Your text here",
  "remaining_views": 5,
  "expires_at": "2026-01-27T12:00:00.000Z"
}
```

### View Paste (HTML)
```
GET /p/:id
Returns HTML with paste content safely rendered
```

## Testing Features

### Local Testing
1. Create a paste via the UI at `http://localhost:3000`
2. Click the generated link or copy it
3. View the paste in a new tab

### API Testing (curl examples)
```bash
# Create a paste
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello World",
    "ttl_seconds": 60,
    "max_views": 5
  }'

# Fetch a paste
curl http://localhost:3000/api/pastes/abc123xyz

# View as HTML
curl http://localhost:3000/p/abc123xyz
```

### TEST_MODE for Deterministic Time Testing
When `TEST_MODE=1`, the application respects the `x-test-now-ms` header:

```bash
export TEST_MODE=1

# Fetch with custom time
curl -H "x-test-now-ms: 1672531200000" http://localhost:3000/api/pastes/abc123xyz
```

## Validation Rules

- **content**: Required, must be non-empty string
- **ttl_seconds**: Optional, must be integer ≥ 1
- **max_views**: Optional, must be integer ≥ 1

Invalid requests return HTTP 400 with JSON error details.

## Error Handling

- **404**: Paste not found, expired, or view limit exceeded
- **400**: Invalid input
- **500**: Server error

All responses are JSON formatted.

## Key Implementation Details

- **No Global State**: Server is stateless; all data persists in Vercel KV
- **Safe Rendering**: HTML entities are escaped to prevent XSS attacks
- **TTL Support**: Uses KV expiration keys for automatic cleanup
- **View Counting**: Incremented on each API/HTML fetch
- **Concurrent Safety**: Using atomic operations in KV store
- **No Hardcoded URLs**: Uses environment variables for deployment flexibility

## Repository Structure

```
pastebin/
├── src/
│   └── index.js           # Main Express application
├── public/
│   └── index.html         # UI for creating pastes
├── package.json           # Dependencies
├── vercel.json           # Vercel configuration
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```
