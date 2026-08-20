# Homework Helper

Homework Helper is a simple Express + static frontend MVP for helping families with homework.

It has two modes:

- Parent Guide: gives a parent or helper a teaching aid that explains what the child is learning, how the topic is commonly taught now, coaching steps, common mistakes, and ways to help without just giving the answer.
- Student Practice: creates a student-facing explanation, practice questions, short practice answers, and grade-appropriate guidance.

## How to Run

Install dependencies if needed:

```bash
npm install
```

Start the server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

For deployment, the server uses:

```js
process.env.PORT || 3000
```

## Required Environment Variables

Create a `.env` file with:

```text
ANTHROPIC_API_KEY=your_key_here
```

Optional:

```text
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Do not commit real environment values.

## Render Deployment

This app is currently set up for a Render-first deployment while keeping the existing Anthropic API integration.

Use a new KidTutor-owned Render web service. Do not reuse nurse-tutor services, environment groups, or secrets.

Recommended Render settings:

```text
Service name: kidtutor-web
Runtime: Node
Build command: npm install
Start command: npm start
Health check path: /healthz
```

Required Render environment variables:

```text
ANTHROPIC_API_KEY=your_render_secret_value
```

Optional Render environment variables:

```text
ANTHROPIC_MODEL=claude-sonnet-4-6
NODE_ENV=production
```

The repo includes `render.yaml` with the same service settings. `ANTHROPIC_API_KEY` is marked with `sync: false` so the secret value must be entered in Render and is not committed to the repo.

After deploying, verify:

```text
https://your-render-url.onrender.com/healthz
```

Then test Parent Mode, Student Mode, Curiosity Mode, follow-ups, and feedback from the deployed app URL.

## Current MVP Limitations

- No user accounts or authentication.
- No database.
- No cloud storage.
- No image upload.
- No Perplexity integration.
- Feedback submission opens a prefilled email draft to the project owner for visible friend-beta collection.
- `Download This Page Feedback` remains available as a fallback.
- `/api/feedback` still writes a best-effort local server copy to `feedback/feedback.json`, but on Render this is not durable unless a persistent disk or external datastore is added.
- The app does not verify homework correctness independently beyond the model response.
- The frontend is intentionally plain HTML, CSS, and JavaScript for this phase.
