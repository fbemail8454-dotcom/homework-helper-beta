require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';

if (!apiKey) {
  console.warn('WARNING: ANTHROPIC_API_KEY is missing from .env');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'app')));

app.post('/api/tutor', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'No prompt provided.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error('Anthropic error status:', response.status);
      console.error('Anthropic error body:', rawText);

      return res.status(response.status).json({
        error: data?.error?.message || rawText || 'Anthropic API error.'
      });
    }

    const text = data?.content?.[0]?.text || '';

    return res.json({ text });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', (req, res) => {
  const entry = req.body;
  if (!entry || typeof entry !== 'object') {
    return res.status(400).json({ error: 'Invalid feedback entry.' });
  }

  const feedbackDir = path.join(__dirname, 'feedback');
  const feedbackFile = path.join(feedbackDir, 'feedback.json');

  try {
    fs.mkdirSync(feedbackDir, { recursive: true });

    let entries = [];
    if (fs.existsSync(feedbackFile)) {
      try {
        entries = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
      } catch {
        entries = [];
      }
    }

    entries.push(entry);
    fs.writeFileSync(feedbackFile, JSON.stringify(entries, null, 2), 'utf8');

    return res.json({ ok: true });
  } catch (err) {
    console.error('Feedback file write error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Nursing Tutor server running at http://localhost:${PORT}`);
  console.log(`Model: ${model}`);
  console.log(`API key loaded: ${apiKey ? 'YES' : 'NO'}`);
  console.log(`API key length: ${apiKey ? apiKey.length : 0}`);
});