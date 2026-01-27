// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  try {
    // Try to ping KV to ensure persistence layer is accessible
    await kv.ping();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    console.error('Health check failed:', error);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false }));
  }
};
