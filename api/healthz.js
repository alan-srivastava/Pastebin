// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
  try {
    // Try to ping KV to ensure persistence layer is accessible
    await kv.ping();
    res.json({ ok: true });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ ok: false });
  }
}
