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

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).end('Method not allowed');
  }

  try {
    const pasteJson = await kv.get(`paste:${id}`);

    if (!pasteJson) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Paste Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Paste Not Found</h1>
          <p>This paste does not exist or has expired.</p>
          <a href="/">Create a new paste</a>
        </body>
        </html>
      `);
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
      res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Paste Expired</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Paste Expired</h1>
          <p>This paste has expired and is no longer available.</p>
          <a href="/">Create a new paste</a>
        </body>
        </html>
      `);
    }

    // Check if view limit exceeded
    if (paste.max_views && paste.views_count >= paste.max_views) {
      await kv.del(`paste:${id}`);
      res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>View Limit Exceeded</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">View Limit Exceeded</h1>
          <p>This paste has reached its view limit.</p>
          <a href="/">Create a new paste</a>
        </body>
        </html>
      `);
    }

    // Increment view count
    paste.views_count += 1;

    // Update in KV
    if (paste.expires_at) {
      const ttl = Math.ceil((paste.expires_at - now) / 1000);
      if (ttl > 0) {
        await kv.set(`paste:${id}`, JSON.stringify(paste), { ex: ttl });
      }
    } else {
      await kv.set(`paste:${id}`, JSON.stringify(paste));
    }

    // Escape HTML content for safe rendering
    const escapedContent = String(paste.content)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Paste Viewer</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 800px; }
          .paste-content { 
            background: #f5f5f5; 
            padding: 15px; 
            border: 1px solid #ddd;
            border-radius: 4px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: 'Courier New', monospace;
            overflow-x: auto;
          }
          .info { color: #666; font-size: 0.9em; margin-top: 10px; }
          a { color: #1976d2; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Paste Content</h1>
          <div class="paste-content">${escapedContent}</div>
          <div class="info">
            <p>Views remaining: ${paste.max_views ? paste.max_views - paste.views_count : 'Unlimited'}</p>
            ${paste.expires_at ? `<p>Expires at: ${new Date(paste.expires_at).toISOString()}</p>` : ''}
          </div>
          <a href="/">Create a new paste</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error viewing paste:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .error { color: #d32f2f; }
        </style>
      </head>
      <body>
        <h1 class="error">Error</h1>
        <p>An error occurred while retrieving the paste.</p>
        <a href="/">Go back</a>
      </body>
      </html>
    `);
  }
};
