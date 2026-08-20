# KidTutor Connection Refresh Roadmap

Audit date: 2026-08-09

## Goal

Move KidTutor off all nurse-tutor and Anthropic/Claude-era wiring, then standardize the app around:

- OpenAI for AI generation.
- Render for production deployment.
- KidTutor-owned environment variables, service names, prompts, docs, and operational checks.

## Current Connection Audit

### Runtime and deployment

- `server.js:8` uses `process.env.PORT || 3000`, which is compatible with Render's dynamic port model.
- `render.yaml` now captures the KidTutor Render web service configuration.
- `server.js` now exposes `/healthz` for Render HTTP health checks.
- `package.json` only defines `npm start`, with no test, lint, or deployment validation scripts.
- Feedback is written to local disk at `feedback/feedback.json`. This is fine for local beta testing, but it is not a durable production storage plan on Render unless a persistent disk or external datastore is added.

### AI provider setup

- `server.js:10-11` reads `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
- `server.js:399-438` calls `https://api.anthropic.com/v1/messages` directly with Anthropic-specific headers.
- `server.js:445-452` sends generated tutor prompts to the Anthropic call path through `/api/tutor`.
- `.env.example` documents only `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
- `README.md` documents Anthropic setup and model defaults.
- `package.json` has no `openai` package dependency.

### Frontend and internal API calls

- `app/script.js:158` calls `/api/tutor`.
- `app/script.js:343` calls `/api/feedback`.
- `app/index.html:100-109` provides guided follow-up controls for clearer help, hints, answer checking, step explanation, alternate examples, and more practice.
- These frontend calls are relative paths, which is good for Render because the static frontend and Express API can be served from the same origin.
- Developer Mode and the manual prompt bridge have been removed from the production UI.

### Nurse-tutor carryover

- `prompts/tutor_prompt_v1.txt` is a nursing clinical reasoning prompt and does not belong to KidTutor.
- `prompts/ai_validator_prompt_v1.txt` validates nursing tutor output and references Claude.
- `prompts/ai_review_prompt_v1.txt` reviews nursing explanations for clinical accuracy.
- These prompt files are not currently imported by `server.js`, but they are misleading repo artifacts and should be removed, archived, or replaced with KidTutor-specific prompt assets.
- `server.js` already contains KidTutor prompts inline and includes rules that avoid health care, medical, clinical, or college-level professional training framing.

## Recommended Target Architecture

### Fast path decision

For the first Render deployment, keep the existing Anthropic API integration in place and focus only on making KidTutor deploy cleanly under its own Render service. This gets the app live faster and reduces the number of moving parts during the first deployment.

The OpenAI migration remains the preferred next provider refresh, but it should be handled after the Render service is stable and verified.

### App service

- One Render web service for the current Express app.
- Service name: `kidtutor-web`.
- Build command: `npm install`.
- Start command: `npm start`.
- Runtime: Node.
- Health check path: `/healthz`.
- Keep frontend and API same-origin for now.

### Environment variables

For the Render-first deployment, use the current working Anthropic variables:

- `ANTHROPIC_API_KEY`: required secret, set only in Render and local `.env`.
- `ANTHROPIC_MODEL`: optional, current default is `claude-sonnet-4-6`.
- `NODE_ENV`: `production` on Render.
- `FEEDBACK_STORAGE`: optional future switch, such as `local`, `disk`, or `database`.

For the later OpenAI migration, switch to KidTutor-owned OpenAI variables:

- `OPENAI_API_KEY`: required secret, set only in Render and local `.env`.
- `OPENAI_MODEL`: optional, default in code if unset.

Remove or stop documenting after the OpenAI migration:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

### AI integration

- Replace `callAnthropic` with a provider-neutral `callTutorModel` or OpenAI-specific `callOpenAI`.
- Use the official OpenAI Node SDK unless there is a strong reason to keep raw `fetch`.
- Use the OpenAI Responses API for direct model requests.
- Keep the OpenAI key server-side only. Never expose it to browser JavaScript.
- Normalize model output in one place so `/api/tutor` continues returning `{ text }`.
- Log request failures with status and request context, but never log API keys or full student/family input in production.

Official OpenAI documentation checked:

- API overview and authentication: https://developers.openai.com/api/reference/overview#authentication
- Developer quickstart: https://platform.openai.com/docs/quickstart/make-your-first-api-request

### Render deployment configuration

- Add `render.yaml` so the service can be recreated without depending on old nurse-tutor dashboard settings.
- For the Render-first deployment, use `sync: false` for `ANTHROPIC_API_KEY`.
- For the later OpenAI migration, replace that with `OPENAI_API_KEY`.
- Add `healthCheckPath: /healthz`.
- Avoid hardcoding secret values in the repo.
- Keep service-specific env vars on the service, or use a KidTutor-specific Render environment group if more services are added later.

Official Render documentation checked:

- Web services and port binding: https://render.com/docs/web-services
- Blueprints and `render.yaml`: https://render.com/docs/blueprint-spec
- Environment variables and secrets: https://render.com/docs/configure-environment-variables
- Health checks: https://render.com/docs/health-checks

## Implementation Plan

### Phase 1: Render-first deployment prep

1. Keep the existing Anthropic API call path unchanged for now.
2. Add `/healthz` to `server.js`.
3. Add `render.yaml` for a new KidTutor-owned Render web service.
4. Include `ANTHROPIC_API_KEY` as `sync: false`.
5. Include `ANTHROPIC_MODEL` as either the current default or a Render-managed value.
6. Update `README.md` with Render deployment steps for the current Anthropic-backed build.
7. Keep the OpenAI roadmap below as the next provider migration track.

Acceptance checks:

- App starts locally with the current Anthropic variables.
- `/healthz` returns a fast 2xx response.
- `render.yaml` uses `kidtutor-web` or another KidTutor-owned service name.
- Render config contains no nurse-tutor service names.

### Phase 2: Production Visibility Cleanup

Cleanup name: `Production Visibility Cleanup`

1. Remove the visible Developer Mode toggle and manual AI bridge from `app/index.html`.
2. Remove unused Developer Mode frontend handlers from `app/script.js`.
3. Remove Developer Mode styling from `app/style.css`.
4. Remove the `/api/tutor-request` manual prompt bridge route from `server.js`.
5. Keep the normal `/api/tutor`, `/api/feedback`, and `/healthz` routes unchanged.

Acceptance checks:

- Production UI no longer shows Developer Mode or manual AI testing controls.
- `/api/tutor`, `/api/feedback`, and `/healthz` still work as before.
- `/api/tutor-request` is no longer available.

### Phase 3: Nursing Artifact Cleanup

Cleanup name: `Nursing Artifact Cleanup`

Purpose: remove stale nurse-tutor prompt artifacts from the KidTutor repo after the Render deployment is stable, without changing active Anthropic wiring, inline KidTutor prompt behavior, UI flow, or deployed service settings.

1. Remove or archive nursing prompt files under `prompts/`.
2. Target files identified by audit:
   - `prompts/tutor_prompt_v1.txt`
   - `prompts/ai_validator_prompt_v1.txt`
   - `prompts/ai_review_prompt_v1.txt`
3. If `prompts/` becomes empty, remove the empty folder from git.
4. Leave KidTutor's active inline prompts in `server.js` unchanged.
5. Add KidTutor-specific prompt files only if we later decide to move inline server prompts out of `server.js`.
6. Search again for `nurse`, `nursing`, and `clinical`.
7. Separately decide whether empty legacy placeholders in `docs/` and `test_cases/` should be deleted or repurposed.

Acceptance checks:

- Repo search returns no active nurse-tutor runtime references.
- Any retained historical artifact is clearly archived and not part of runtime setup.
- `/api/tutor`, `/api/feedback`, and `/healthz` behavior is unchanged.
- Validation passes with `git diff --check`; run `node --check server.js` and `node --check app\script.js` if any JavaScript changes are made.

### Phase 4: Deploy and verify on Render

1. Create a new Render service from this repo or sync the Blueprint.
2. Add `ANTHROPIC_API_KEY` in Render as a secret env var.
3. Confirm Render uses `npm install` and `npm start`.
4. Confirm the service binds to Render's `PORT`.
5. Confirm `/healthz` passes.
6. Test Parent Mode, Student Mode, Curiosity Mode, follow-ups, and feedback.

Acceptance checks:

- Render deploy succeeds under a KidTutor-owned service.
- The app can generate tutor responses from the deployed URL.
- No nurse-tutor Render service or env group is reused.

## Guided Render Dashboard Tour

Use this while the Render dashboard is open.

### Step 1: Choose the setup path

Recommended path: create from the repo Blueprint if Render offers that flow. The repo now has `render.yaml`, so Blueprint setup should pre-fill the service name, build command, start command, health check path, and env var names.

Fallback path: create a normal Web Service manually and enter the same values listed below.

### Step 2: Create a new KidTutor service

Use a new service. Do not reuse a nurse-tutor service.

Settings:

```text
Service name: kidtutor-web
Runtime: Node
Build command: npm install
Start command: npm start
Health check path: /healthz
```

If Render asks for a branch, choose the branch that contains this `render.yaml` and the `/healthz` change.

### Step 3: Add environment variables

Add these on the KidTutor service only:

```text
ANTHROPIC_API_KEY=<your Anthropic key>
ANTHROPIC_MODEL=claude-sonnet-4-6
NODE_ENV=production
```

Do not paste secrets into `render.yaml`, README, or any committed file.

### Step 4: Deploy

Start the first deploy. Watch the build log for:

```text
npm install
npm start
Homework Helper server running
API key loaded: YES
```

If it says `API key loaded: NO`, stop and check the Render environment variable spelling.

### Step 5: Check the health endpoint

After Render gives you a URL, open:

```text
https://your-render-url.onrender.com/healthz
```

Expected response:

```json
{"ok":true,"service":"kidtutor"}
```

### Step 6: Smoke test the app

From the deployed Render URL:

1. Generate one Parent Mode response.
2. Generate one Student Mode response.
3. Generate one Curiosity Mode response.
4. Click one follow-up button.
5. Save a quick feedback entry.

### Step 7: Decide what to do with feedback

For the first deployment, feedback can stay local as beta-only feedback. Before using it for real production collection, choose durable storage such as Render Postgres, another database, or a persistent disk strategy.

### Phase 5: Guided Follow-Up Upgrade

Feature name: `Guided Follow-Up Upgrade`

1. Add an optional follow-up focus field under "Need another pass?"
2. Expand follow-up actions to include:
   - Make it clearer
   - Give me a hint
   - Check my answer
   - Explain this step
   - Try a different example
   - More practice
3. Send `followUpText`, `followUpType`, and `previousAnswer` through the existing `/api/tutor` route.
4. Update server follow-up instructions so all modes, including Parent Mode, can respond to the second turn.
5. Require an attempted answer or work note before using "Check my answer."
6. Preserve the existing `followUpOutput`, download, and feedback behavior.

Acceptance checks:

- Parent Mode, Student Mode, and Curiosity Mode follow-ups still use the same endpoint.
- "Check my answer" asks for an attempt before sending.
- Follow-up instructions preserve guided learning and avoid answer dumping.
- Session downloads and feedback can include the follow-up focus and response.

### Phase 6: Decide feedback storage before production traffic

1. For beta-only use, keep local feedback and document that Render instances may not preserve it reliably.
2. For production, move feedback to a durable store before relying on it.
3. If staying on Render, consider Render Postgres for structured feedback or a small managed datastore.
4. Add basic feedback validation and size limits before production use.

Acceptance checks:

- Product owner chooses `local beta`, `persistent disk`, or `database`.
- README clearly explains where feedback goes.

### Phase 7: OpenAI migration track

Keep this plan ready, but do not block the first Render deployment on it.

1. Add the official `openai` npm package.
2. Add `OPENAI_API_KEY` and `OPENAI_MODEL`.
3. Replace `callAnthropic(prompt)` with an OpenAI Responses API call.
4. Preserve the existing `/api/tutor` response contract: `{ text }`.
5. Remove `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` from docs and Render after cutover.
6. Retest all modes and follow-ups.

Acceptance checks:

- `/api/tutor` returns a valid Homework Helper response using OpenAI.
- Error responses do not expose secrets.
- Follow-up prompts still work through the same endpoint.

### Phase 8: Verification checklist

Run after Render-first implementation:

1. `npm install`
2. `npm start`
3. Open `http://localhost:3000`
4. Test Parent Mode, Student Mode, and Curiosity Mode.
5. Test follow-up buttons.
6. Test `/healthz`.
7. Search for stale nurse-tutor references:
   - `rg -n -i "nurse|nursing|clinical|onrender|render"`
8. Confirm `render.yaml` has no secrets.

## Open Questions

- Which OpenAI model should be the production default for KidTutor cost and quality goals?
- Developer Mode decision: removed from production rather than hidden behind an environment flag.
- Should feedback remain local for beta testing, or should we add durable storage now?
- Do we want a separate staging Render service before production?

## Recommended Next Move

After the Render deployment and cleanup phases, prioritize the lightweight tutoring loop improvements first. Keep Anthropic in place until the guided follow-up flow and feedback storage decision are stable, then handle the OpenAI cutover as a separate provider migration.
