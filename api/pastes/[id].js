// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

const { kv } = require('@vercel/kv');

// Helper function to safely parse KV data
function parseKvData(data) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  return data;
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const pasteJson = await kv.get(`paste:${id}`);

    if (!pasteJson) {
      return res.status(404).json({ error: 'Paste not found' });
    }

    const paste = parseKvData(pasteJson);
    
    // Get current time
    let now = Date.now();
    if (process.env.TEST_MODE === '1' && req.headers['x-test-now-ms']) {
      now = parseInt(req.headers['x-test-now-ms'], 10);
    }

    // Check if expired
    if (paste.expires_at && now > paste.expires_at) {
      await kv.del(`paste:${id}`);
      return res.status(404).json({ error: 'Paste has expired' });
    }

    // Check if view limit exceeded
    if (paste.max_views && paste.views_count >= paste.max_views) {
      await kv.del(`paste:${id}`);
      return res.status(404).json({ error: 'View limit exceeded' });
    }

    // Increment view count
    paste.views_count += 1;
    const remaining_views = paste.max_views ? paste.max_views - paste.views_count : null;

    // Update in KV
    if (paste.expires_at) {
      const ttl = Math.ceil((paste.expires_at - now) / 1000);
      if (ttl > 0) {
        await kv.set(`paste:${id}`, JSON.stringify(paste), { ex: ttl });
      }
    } else {
      await kv.set(`paste:${id}`, JSON.stringify(paste));
    }

    res.json({
      content: paste.content,
      remaining_views,
      expires_at: paste.expires_at ? new Date(paste.expires_at).toISOString() : null,
    });
  } catch (error) {
    console.error('Error fetching paste:', error);
    res.status(500).json({ error: 'Failed to fetch paste' });
  }
}
