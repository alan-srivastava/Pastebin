export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pastebin - Share Your Text</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-width: 600px;
      width: 100%;
      padding: 40px;
    }

    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }

    .subtitle {
      color: #999;
      margin-bottom: 30px;
      font-size: 14px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      color: #333;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 14px;
    }

    textarea {
      width: 100%;
      min-height: 250px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      resize: vertical;
      border-color: #ddd;
      transition: border-color 0.3s;
    }

    textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }

    .option-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    input[type="number"] {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    input[type="number"]:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .button-group {
      display: flex;
      gap: 10px;
    }

    button {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .result {
      display: none;
      margin-top: 30px;
      padding: 20px;
      background: #f0f8ff;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }

    .result.show {
      display: block;
    }

    .result h3 {
      color: #333;
      margin-bottom: 15px;
      font-size: 18px;
    }

    .url-box {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .url-box input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      background: white;
      font-family: 'Courier New', monospace;
    }

    .url-box button {
      padding: 10px 15px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    .url-box button:hover {
      background: #764ba2;
    }

    .success-message {
      color: #2e7d32;
      font-size: 14px;
      margin-top: 10px;
    }

    .error {
      color: #d32f2f;
      font-size: 14px;
      margin-top: 10px;
      padding: 10px;
      background: #ffebee;
      border-radius: 4px;
      display: none;
    }

    .error.show {
      display: block;
    }

    .loading {
      display: none;
      text-align: center;
      color: #667eea;
    }

    .loading.show {
      display: block;
    }

    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 10px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .info-text {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Pastebin</h1>
    <p class="subtitle">Create and share your text pastes</p>

    <form id="pasteForm">
      <div class="form-group">
        <label for="content">Paste Content</label>
        <textarea
          id="content"
          placeholder="Enter your text here..."
          required
        ></textarea>
      </div>

      <div class="options-grid">
        <div class="option-group">
          <label for="ttl" style="margin: 0;">TTL (seconds)</label>
          <input
            type="number"
            id="ttl"
            min="1"
            placeholder="Optional"
          />
          <div class="info-text">Optional: Auto-expire</div>
        </div>

        <div class="option-group">
          <label for="maxViews" style="margin: 0;">Max Views</label>
          <input
            type="number"
            id="maxViews"
            min="1"
            placeholder="Optional"
          />
          <div class="info-text">Optional: View limit</div>
        </div>
      </div>

      <div class="button-group">
        <button type="submit" class="btn-primary">Create Paste</button>
        <button type="reset" class="btn-secondary">Clear</button>
      </div>

      <div class="loading" id="loading">
        <span class="spinner"></span>
        Creating paste...
      </div>

      <div class="error" id="error"></div>
    </form>

    <div class="result" id="result">
      <h3>✅ Paste Created Successfully!</h3>
      <div class="url-box">
        <input type="text" id="shareUrl" readonly />
        <button onclick="copyToClipboard()">Copy</button>
      </div>
      <p class="success-message" id="copyMessage"></p>
    </div>
  </div>

  <script>
    const form = document.getElementById('pasteForm');
    const content = document.getElementById('content');
    const ttl = document.getElementById('ttl');
    const maxViews = document.getElementById('maxViews');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const result = document.getElementById('result');
    const shareUrl = document.getElementById('shareUrl');
    const copyMessage = document.getElementById('copyMessage');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear previous messages
      error.classList.remove('show');
      result.classList.remove('show');
      copyMessage.textContent = '';
      loading.classList.add('show');

      try {
        const payload = {
          content: content.value,
        };

        if (ttl.value) {
          payload.ttl_seconds = parseInt(ttl.value, 10);
        }

        if (maxViews.value) {
          payload.max_views = parseInt(maxViews.value, 10);
        }

        const response = await fetch('/api/pastes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        loading.classList.remove('show');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create paste');
        }

        const data = await response.json();
        shareUrl.value = data.url;
        result.classList.add('show');

        // Reset form
        form.reset();
      } catch (err) {
        loading.classList.remove('show');
        error.textContent = err.message;
        error.classList.add('show');
      }
    });

    function copyToClipboard() {
      shareUrl.select();
      document.execCommand('copy');
      copyMessage.textContent = '✓ Copied to clipboard!';
      setTimeout(() => {
        copyMessage.textContent = '';
      }, 2000);
    }
  </script>
</body>
</html>`);
}
