// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  try {
    // Try to ping KV to ensure persistence layer is accessible
    await kv.ping();
    return res.json({ ok: true });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({ ok: false });
  }
};
