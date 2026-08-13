# New Session Restart Anchor

This is a restart anchor only. It is not a project history log.

## Current Objective

Get KidTutor deployed as its own Render web service first, while keeping the current Anthropic API integration unchanged. Do not migrate to OpenAI during this deployment pass. Preserve the OpenAI migration roadmap for later.

## Current Repo State To Remember

- App: Express server plus static frontend.
- Main server: `server.js`
- Frontend: `app/index.html`, `app/script.js`, `app/style.css`
- Deployment config: `render.yaml`
- Roadmap: `roadmap.md`
- Local env example: `.env.example`
- Current AI provider: Anthropic.
- Current required secret: `ANTHROPIC_API_KEY`
- Current optional model var: `ANTHROPIC_MODEL`
- Current default model in code: `claude-sonnet-4-6`
- OpenAI is planned later, not part of the first Render setup.

## Codex Evaluation Context

Read-only app evaluation completed from the repo root on 2026-08-13.

Evaluation summary:

- KidTutor is currently a small Homework Helper MVP, not a Lorekee-scale study
  workspace.
- Current modes are Parent Mode, Student Mode, and Curiosity Mode.
- The app already has grade level, subject/custom subject, homework/topic text,
  "what are you stuck on?", simple follow-up buttons, response/session
  downloads, quick feedback, and a developer/manual prompt bridge.
- Active runtime prompts are inline in `server.js`.
- The old nursing prompt files in `prompts/` are stale artifacts and do not
  appear to be imported by `server.js`.
- The app is not yet connected to OpenAI. The roadmap already preserves the
  provider/deployment plan.
- Future enhancement work should compare against Lorekee lessons learned, but
  KidTutor should stay much lighter and simpler.
- Before judging safety, minors, or enhancement scope, inspect the actual app
  behavior and repo state first.

Potential future enhancement eval should report:

- what KidTutor should borrow from Lorekee
- what KidTutor should deliberately avoid
- what belongs in a lightweight K-12 roadmap
- which stale artifacts or provider leftovers should be cleaned before larger
  work

## Changes Already Prepared For Render

- `server.js` has a `/healthz` endpoint.
- `render.yaml` defines a Render web service named `kidtutor-web`.
- `render.yaml` uses:
  - `runtime: node`
  - `buildCommand: npm install`
  - `startCommand: npm start`
  - `healthCheckPath: /healthz`
  - `ANTHROPIC_API_KEY` with `sync: false`
  - `ANTHROPIC_MODEL=claude-sonnet-4-6`
  - `NODE_ENV=production`
- `package.json` pins Node compatibility with `"node": ">=18"`.
- README has Render setup instructions.
- Visible Developer Mode copy no longer says Claude; internal DOM id `claudeAnswer` still exists and can be cleaned later.

## Verified Locally

These checks passed:

```text
npm install
```

Result: clean install, 0 vulnerabilities.

The health endpoint passed locally:

```text
http://localhost:3107/healthz
```

Expected body:

```json
{"ok":true,"service":"kidtutor"}
```

## Important Guardrails

- Do not reuse nurse-tutor Render services, env groups, or secrets.
- Do not commit real API keys.
- Do not remove the OpenAI roadmap.
- Do not switch to OpenAI until the Render deployment is stable.
- Feedback currently writes to local `feedback/feedback.json`; this is acceptable for beta testing but not durable production storage on Render.
- Old nursing prompt files may still exist under `prompts/`; remove/archive later as cleanup, but they are not needed for the first Render deployment.

## Next Best Step

The Render-readiness changes are approved for commit and push to GitHub `main`. After that, create the new Render service from that branch.

Current known Git context:

```text
branch: main
origin: https://github.com/fbemail8454-dotcom/homework-helper-beta.git
```

Before committing, run:

```text
git status --short
git diff --stat
```

Expected relevant changed/new files:

```text
README.md
app/index.html
app/script.js
package-lock.json
package.json
server.js
render.yaml
roadmap.md
newsession.md
```

There may also be an untracked `CODEX.md`; it was not part of this Render task unless the user asks to include it.

Commit message:

```text
Prepare KidTutor Render deployment
```

After the push, the next session should start at the Render dashboard setup step.

## Render Dashboard Guided Setup

Use the Render Blueprint flow if Render detects `render.yaml`. If setting up manually, use:

```text
Service type: Web Service
Service name: kidtutor-web
Runtime: Node
Build command: npm install
Start command: npm start
Health check path: /healthz
Branch: main
```

Add environment variables on the KidTutor service only:

```text
ANTHROPIC_API_KEY=<real Anthropic key>
ANTHROPIC_MODEL=claude-sonnet-4-6
NODE_ENV=production
```

After deploy, open:

```text
https://your-render-url.onrender.com/healthz
```

Expected:

```json
{"ok":true,"service":"kidtutor"}
```

Then smoke test:

1. Parent Mode response.
2. Student Mode response.
3. Curiosity Mode response.
4. One follow-up button.
5. One feedback save.

## After Render Is Stable

Next roadmap choices:

1. Decide whether to archive/remove old nursing prompt files.
2. Decide whether Developer Mode should remain visible in production.
3. Decide durable feedback storage before collecting real production feedback.
4. Later: migrate from Anthropic to OpenAI using the preserved plan in `roadmap.md`.
