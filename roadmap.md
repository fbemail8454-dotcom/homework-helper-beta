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
- `package.json` defines `npm start` and a lightweight `npm test` prompt-architecture smoke check.
- Feedback submit opens a prefilled email draft for visible friend-beta collection. `/api/feedback` also writes a best-effort local copy to `feedback/feedback.json`, but this is not durable on Render unless a persistent disk or external datastore is added.

### AI provider setup

- `server.js:10-11` reads `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
- `server.js:625-664` calls `https://api.anthropic.com/v1/messages` directly with Anthropic-specific headers.
- `server.js:671-678` sends generated tutor prompts to the Anthropic call path through `/api/tutor`.
- `.env.example` documents only `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
- `README.md` documents Anthropic setup and model defaults.
- `package.json` has no `openai` package dependency.

### Frontend and internal API calls

- `app/script.js:192` calls `/api/tutor`.
- `app/script.js` opens a `mailto:` feedback draft and calls `/api/feedback` as a best-effort fallback.
- `app/index.html:97-111` provides action-first reply controls for learner replies, answer checking, clearer help, hints, step explanation, alternate examples, and more practice.
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

1. Add an optional follow-up context field under the main Homework Helper response.
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
- Session downloads and feedback can include the follow-up context and response.

### Phase 6: Reply Workflow Cleanup

Cleanup name: `Reply Workflow Cleanup`

1. Rename the follow-up area from "Need another pass?" to "Choose what you want next."
2. Place the seven follow-up actions above the reply field so the user chooses the action first.
3. Treat the reply box as a learner/parent reply field that can hold an answer, question, or confusion note.
4. Add `Answer KidTutor's Question` as a distinct action from `Check My Answer`.
5. Require reply text for `Answer KidTutor's Question` and `Check My Answer`; focus the reply box when either is clicked empty.
6. Keep clearer, hint, step, example, and practice actions usable with or without reply text.
7. Track the selected follow-up action for downloads and feedback.
8. Save transcripts with `STUDENT / PARENT REPLY`, `FOLLOW-UP ACTION`, and `FOLLOW-UP RESPONSE`.
9. Add a bottom `Save This Session` button after the follow-up response, and rename the top session button to match.
10. Refine follow-up prompts so `answer-question` responds to a learner explanation while `check-answer` evaluates attempted work.

Acceptance checks:

- Reply/action workflow supports both typed learner answers and no-text helper actions.
- Empty required-reply actions focus the reply field and do not call the model.
- Session downloads include reply text, selected action, and follow-up response.
- Normal Parent Mode, Student Mode, Curiosity Mode, feedback, and health checks still work.

### Phase 7: Mode + Subject + Grade Prompt Architecture

Feature name: `Mode + Subject + Grade Prompt Architecture`

Purpose: make prompt tuning safer by routing Student Practice behavior through explicit mode, grade-band, subject-family, and task-shape strategies instead of adding more one-off rules to one global prompt.

Implementation scope:

1. Keep the existing frontend and `/api/tutor` request contract unchanged.
2. Add server-side prompt classification helpers:
   - `getGradeBand(gradeLevel)`
   - `getSubjectFamily(subject)`
   - `getTaskShape(request)`
   - `getPromptRouting(request)`
3. Compose Student Practice prompts from:
   - shared context and safety rules
   - mode strategy
   - grade-band strategy
   - subject-family strategy
   - task-shape strategy
   - follow-up action rules
4. Start with Student Practice only. Preserve Parent Guide and Curiosity Mode prompt shapes except for existing shared follow-up behavior.
5. Keep high-school math free to use correct math vocabulary such as `distribute`, while keeping elementary sharing/drawing language simple.
6. Add prompt architecture smoke coverage that checks classification and prompt composition without calling the model.
7. Keep the Anthropic provider unchanged.

Initial grade bands:

- Early elementary: Pre-K through 2nd grade.
- Upper elementary: 3rd through 5th grade.
- Middle school: 6th through 8th grade.
- High school/adult: High school and GED / Adult Learning.

Initial subject families:

- Math
- Science
- Reading
- Writing
- Social Studies
- Other/custom

Initial task shapes:

- procedural equation
- rate-of-change math
- math word problem
- math practice
- concept explanation
- reading comprehension
- writing revision
- writing planning
- evidence-based explanation
- answer checking
- learner explanation
- general learning

Acceptance checks:

- `npm test` passes.
- `node --check server.js` passes.
- `node --check app\script.js` passes.
- `git diff --check` passes.
- Prompt smoke cases cover high-school algebra, elementary division, middle-school science, reading, writing, social studies, answer-question follow-up, and check-answer follow-up.
- Student Practice prompts include explicit grade-band, subject-family, and task-shape routing.
- Parent Guide, Curiosity Mode, `/api/tutor`, `/api/feedback`, and `/healthz` remain compatible.

Risk assessment:

- Code risk: Low to Medium.
- Prompt quality risk: Medium, because model responses can shift even when routing is correct.
- UI risk: Low, because this phase does not change the visible workflow.
- Deployment risk: Low, because Render service configuration and provider integration stay unchanged.

### Phase 8: Teacher Presence Tuning

Feature name: `Teacher Presence Tuning`

Purpose: make Student Practice responses feel more like a present tutor and less like a terse answer gate, without turning KidTutor into an answer-dumping homework solver.

Implementation scope:

1. Keep the frontend, API contract, Render config, and Anthropic provider unchanged.
2. Limit prompt behavior changes to Student Practice and shared follow-up instructions.
3. Use compressed integration: replace restrictive wording instead of adding a large new prompt block.
4. Make high-school/adult Student Practice concise but not abrupt.
5. Let Math responses give closure for the current step when the learner already has the pieces, including units when the problem provides them.
6. Route derivative, velocity, position-function, and rate-of-change math separately from equation-solving prompts.
7. Make `Make It Clearer` mean easier to learn from, not merely shorter.
8. Preserve grade differences:
   - K-5 stays simple, concrete, and warm.
   - 6-8 stays direct, respectful, and not babyish.
   - 9-12/GED stays accurate and concise, with a brief why-this-method-fits sentence when useful.

Acceptance checks:

- `npm test` passes.
- `node --check server.js` passes.
- `node --check app\script.js` passes.
- `git diff --check` passes.
- Prompt smoke cases include high-school calculus/rate-of-change, GED/adult learning, and a clearer follow-up teacher-presence case.
- Existing K-5, 6-8, reading, writing, social studies, answer-question, and check-answer routing smoke cases still pass.
- Parent Guide and Curiosity Mode prompt shapes remain unchanged.
- Prompt size stays near-neutral because wording is replaced rather than expanded into a new helper layer.

Risk assessment:

- Code risk: Low.
- Prompt quality risk: Medium, because teacherly tone is subjective.
- Token growth risk: Low.
- Cross-grade risk: Low to Medium, because the change is tested across grade bands.

### Phase 9: Email Feedback Handoff

Feature name: `Email Feedback Handoff`

Purpose: make beta feedback visible to the owner without relying on Render's temporary local filesystem.

Current issue before this phase:

- The UI says `Save Feedback`.
- The browser stores a visible in-page feedback log for the current session.
- The app also posts feedback to `/api/feedback`.
- `/api/feedback` writes to `feedback/feedback.json` on the running server.
- On Render, that server file is not visible on the user's computer and is not durable unless persistent storage is added.

Implementation scope:

1. Rename `Save Feedback` to `Submit Feedback`.
2. Use `fbemail8454@gmail.com` as the feedback recipient.
3. Use an email subject that includes `Homework Helper`, such as `Homework Helper Feedback`.
4. Build a concise email body with timestamp, mode, grade, subject, feedback button answers, typed feedback comment, and selected follow-up action when present.
5. Open a `mailto:` link so the tester can send feedback from their own email app.
6. Keep the visible in-page feedback log.
7. Keep `Download This Page Feedback` as a fallback.
8. Either keep `/api/feedback` as a best-effort local/server fallback or stop presenting it as reliable storage.
9. Add clear copy that submitting opens the tester's email app.
10. Keep the tester's typed comment first in the email body and keep metadata secondary.

Acceptance checks:

- Clicking `Submit Feedback` with at least one feedback answer or comment opens a prefilled email to `fbemail8454@gmail.com`.
- Email subject contains `Homework Helper`.
- The feedback remains visible in the page after submit.
- Download feedback still works.
- No API keys or secrets are involved.
- If email app does not open, the tester still has copy/download fallback.
- Existing tutor generation, follow-ups, session save, and `npm test` still pass.

Risk assessment:

- Code risk: Low.
- Privacy risk: Low to Medium, because feedback email may include homework context if we include too much. Keep the email body concise by default.
- Browser behavior risk: Medium, because `mailto:` depends on the tester's device/email setup.
- Storage risk: Low, because this avoids relying on Render local files.

### Phase 10: Decide feedback storage before production traffic

1. For beta-only use, keep local feedback and document that Render instances may not preserve it reliably.
2. For production, move feedback to a durable store before relying on it.
3. If staying on Render, consider Render Postgres for structured feedback or a small managed datastore.
4. Add basic feedback validation and size limits before production use.

Acceptance checks:

- Product owner chooses `email beta`, `local beta`, `persistent disk`, or `database`.
- README clearly explains where feedback goes.

### Phase 11: OpenAI migration track

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

### Phase 12: Verification checklist

Run after Render-first implementation:

1. `npm install`
2. `npm test`
3. `npm start`
4. Open `http://localhost:3000`
5. Test Parent Mode, Student Mode, and Curiosity Mode.
6. Test follow-up buttons.
7. Test `/healthz`.
8. Search for stale nurse-tutor references:
   - `rg -n -i "nurse|nursing|clinical|onrender|render"`
9. Confirm `render.yaml` has no secrets.

## Open Questions

- Which OpenAI model should be the production default for KidTutor cost and quality goals?
- Developer Mode decision: removed from production rather than hidden behind an environment flag.
- Should feedback remain local for beta testing, or should we add durable storage now?
- Do we want a separate staging Render service before production?
- Should prompt routing later extend Parent Guide and Curiosity Mode, or remain Student Practice focused?
- How much teacher presence is enough before responses feel too long for younger students?
- Should beta feedback emails include session/homework excerpts, or only concise mode/grade/subject and feedback ratings?

## Recommended Next Move

After the Render deployment and cleanup phases, collect live Student Practice examples across grade bands before changing provider or durable storage layers. For friend beta use, prefer `Email Feedback Handoff` before adding a database. Keep Anthropic in place until prompt routing, teacher presence, and feedback collection are stable, then handle the OpenAI cutover as a separate provider migration.
