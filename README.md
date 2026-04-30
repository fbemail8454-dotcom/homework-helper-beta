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

## Current MVP Limitations

- No user accounts or authentication.
- No database.
- No cloud storage.
- No image upload.
- No Perplexity integration.
- Feedback is stored locally in `feedback/feedback.json`.
- The app does not verify homework correctness independently beyond the model response.
- The frontend is intentionally plain HTML, CSS, and JavaScript for this phase.
