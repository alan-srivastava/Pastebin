require('dotenv').config({ path: '.env.local' });
const express = require('express');
const { kv } = require('@vercel/kv');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


function parseKvData(data) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  return data;
}


app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));


function getCurrentTime() {
  if (process.env.TEST_MODE === '1') {
  
    return null; 
  }
  return Date.now();
}


app.use((req, res, next) => {
  if (process.env.TEST_MODE === '1' && req.headers['x-test-now-ms']) {
    req.testNowMs = parseInt(req.headers['x-test-now-ms'], 10);
  } else {
    req.testNowMs = Date.now();
  }
  next();
});


app.get('/api/healthz', async (req, res) => {
  try {
    
    await kv.ping();
    res.json({ ok: true });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ ok: false });
  }
});


app.post('/api/pastes', async (req, res) => {
  const { content, ttl_seconds, max_views } = req.body;


  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'content is required and must be a non-empty string' });
  }

  if (ttl_seconds !== undefined && (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)) {
    return res.status(400).json({ error: 'ttl_seconds must be an integer >= 1' });
  }

  if (max_views !== undefined && (!Number.isInteger(max_views) || max_views < 1)) {
    return res.status(400).json({ error: 'max_views must be an integer >= 1' });
  }

  try {
    const id = nanoid(10);
    const now = req.testNowMs;

    const pasteData = {
      content,
      created_at: now,
      views_count: 0,
      max_views: max_views || null,
      expires_at: ttl_seconds ? now + ttl_seconds * 1000 : null,
    };

   
    if (ttl_seconds) {
      await kv.set(`paste:${id}`, JSON.stringify(pasteData), { ex: ttl_seconds });
    } else {
      await kv.set(`paste:${id}`, JSON.stringify(pasteData));
    }

    const appUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${PORT}`;

    res.status(201).json({
      id,
      url: `${appUrl}/p/${id}`,
    });
  } catch (error) {
    console.error('Error creating paste:', error);
    res.status(500).json({ error: 'Failed to create paste' });
  }
});


app.get('/api/pastes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pasteJson = await kv.get(`paste:${id}`);

    if (!pasteJson) {
      return res.status(404).json({ error: 'Paste not found' });
    }

    const paste = parseKvData(pasteJson);
    const now = req.testNowMs;

    
    if (paste.expires_at && now > paste.expires_at) {
      await kv.del(`paste:${id}`);
      return res.status(404).json({ error: 'Paste has expired' });
    }

    
    if (paste.max_views && paste.views_count >= paste.max_views) {
      await kv.del(`paste:${id}`);
      return res.status(404).json({ error: 'View limit exceeded' });
    }

    
    paste.views_count += 1;
    const remaining_views = paste.max_views ? paste.max_views - paste.views_count : null;

   
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
});


app.get('/p/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pasteJson = await kv.get(`paste:${id}`);

    if (!pasteJson) {
      return res.status(404).send(`
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
    const now = req.testNowMs;

   
    if (paste.expires_at && now > paste.expires_at) {
      await kv.del(`paste:${id}`);
      return res.status(404).send(`
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

    
    if (paste.max_views && paste.views_count >= paste.max_views) {
      await kv.del(`paste:${id}`);
      return res.status(404).send(`
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

    
    paste.views_count += 1;

    
    if (paste.expires_at) {
      const ttl = Math.ceil((paste.expires_at - now) / 1000);
      if (ttl > 0) {
        await kv.set(`paste:${id}`, JSON.stringify(paste), { ex: ttl });
      }
    } else {
      await kv.set(`paste:${id}`, JSON.stringify(paste));
    }

    
    const escapedContent = String(paste.content)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    res.send(`
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
    res.status(500).send(`
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
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
