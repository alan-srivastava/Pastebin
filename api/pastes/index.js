// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

const { kv } = require('@vercel/kv');
const { nanoid } = require('nanoid');

// Helper function to safely parse KV data
function parseKvData(data) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    // Parse JSON body
    let body = '';
    
    await new Promise((resolve, reject) => {
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', resolve);
      req.on('error', reject);
    });

    let parsedBody = {};
    try {
      if (body) {
        parsedBody = JSON.parse(body);
      }
    } catch (e) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const { content, ttl_seconds, max_views } = parsedBody;

    // Validation
    if (!content || typeof content !== 'string' || content.trim() === '') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'content is required and must be a non-empty string' }));
    }

    if (ttl_seconds !== undefined && (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'ttl_seconds must be an integer >= 1' }));
    }

    if (max_views !== undefined && (!Number.isInteger(max_views) || max_views < 1)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'max_views must be an integer >= 1' }));
    }

    try {
      const id = nanoid(10);
      
      // Get current time
      let now = Date.now();
      if (process.env.TEST_MODE === '1' && req.headers['x-test-now-ms']) {
        now = parseInt(req.headers['x-test-now-ms'], 10);
      }

      const pasteData = {
        content,
        created_at: now,
        views_count: 0,
        max_views: max_views || null,
        expires_at: ttl_seconds ? now + ttl_seconds * 1000 : null,
      };

      // Store in KV with TTL if specified
      if (ttl_seconds) {
        await kv.set(`paste:${id}`, JSON.stringify(pasteData), { ex: ttl_seconds });
      } else {
        await kv.set(`paste:${id}`, JSON.stringify(pasteData));
      }

      const appUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : `http://localhost:3000`;

      res.statusCode = 201;
      return res.end(JSON.stringify({
        id,
        url: `${appUrl}/p/${id}`,
      }));
    } catch (error) {
      console.error('Error creating paste:', error);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to create paste' }));
    }
  } else {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
};
