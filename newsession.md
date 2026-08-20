# New Session Restart Anchor

This is a restart anchor only. It is not a full project history log.

## Current Status

KidTutor is stable enough for light friend beta use. The user said this is not
their main app build and is good for now while they work on other projects.

Do not assume there is an active KidTutor implementation task unless the user
asks for one. If work resumes, start with a fresh repo/runtime check and a short
plan before editing.

## Current Git / Deploy Context

- Repo path: `C:\Users\Chad\KidTutor`
- Branch: `main`
- Origin: `https://github.com/fbemail8454-dotcom/homework-helper-beta.git`
- Live Render URL: `https://kidtutor-web.onrender.com`
- Latest pushed commit at handoff: `168872e Tune student practice teacher presence`
- Render service: `kidtutor-web`
- Render Auto-Deploy should be set to `On Commit`, but recent pushes sometimes
  needed manual deploy. If a future push does not appear in Render, use
  `Manual Deploy -> Deploy latest commit`.
- `CODEX.md` may be present as an untracked local file. Do not stage or commit it
  unless the user explicitly asks.

Recent completed commits:

```text
168872e Tune student practice teacher presence
a8f7a10 Add prompt routing architecture
91c67ba Clean up reply workflow
6ab7839 Add guided follow-up upgrade
b491807 Remove production developer mode
a3b08aa Remove stale nursing prompt artifacts
00f913a Add KidTutor evaluation handoff
```

## Current App Shape

- App: Express server plus static frontend.
- Main server: `server.js`
- Frontend: `app/index.html`, `app/script.js`, `app/style.css`
- Deployment config: `render.yaml`
- Roadmap: `roadmap.md`
- Current AI provider: Anthropic.
- Required secret: `ANTHROPIC_API_KEY`
- Optional model var: `ANTHROPIC_MODEL`
- Current default model in code: `claude-sonnet-4-6`
- OpenAI migration remains a later roadmap item, not active now.

Modes:

- Parent Mode
- Student Mode
- Curiosity Mode

Current Student follow-up workflow:

- Action-first section: `Choose what you want next`
- Seven actions:
  - Answer KidTutor's Question
  - Check My Answer
  - Make It Clearer
  - Give Me a Hint
  - Explain This Step
  - Try Another Example
  - More Practice
- Reply field: `Reply to KidTutor`
- Save section: `Save your work`
- Session downloads include homework, main response, learner/parent reply,
  follow-up action, and follow-up response.

## Prompt / Quality State

Active runtime prompts are inline in `server.js`.

Student Practice now has explicit prompt routing:

- grade band
- subject family
- task shape

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

`Teacher Presence Tuning` is installed. It is intentionally narrow:

- Student Practice only, plus shared follow-up wording.
- High-school/adult tone should be concise but not abrupt.
- Math can state current-step closure when the learner has the pieces.
- Rate-of-change/velocity math routes separately from equation solving.
- `Make It Clearer` means easier to learn from, not merely shorter.
- Parent Guide and Curiosity prompt shapes were not redesigned.

## Testing / Validation State

`package.json` defines:

```text
npm test
```

Current `npm test` runs:

```text
node --check server.js
node --check app/script.js
node test_cases/prompt_architecture_smoke.js
```

Prompt smoke coverage has 11 cases, including:

- high-school algebra
- elementary division
- middle-school science
- reading
- writing
- social studies
- answer-question follow-up
- check-answer follow-up
- high-school calculus/rate-of-change
- GED/adult writing
- clearer follow-up teacher-presence case

Latest live Render quality sweep after `168872e`:

- 16 live model calls
- 13 Pass
- 3 Watch
- 0 Fail

Watch items from the sweep:

- High-school calculus is improved but can still be cautious about stating the
  final current-step expression.
- Parent Mode science was accurate but long.
- `Make It Clearer` improved, but current-step closure should continue to be
  watched in real saved sessions.

User decision after sweep: good for now. Do not keep tuning from a single
awkward response unless a repeatable pattern appears.

## Important Guardrails

- Do not commit secrets.
- Do not reuse nurse-tutor Render services, environment groups, or secrets.
- Do not switch to OpenAI unless the user explicitly starts that migration.
- Do not overbuild KidTutor; it is a lightweight helper for a few friends.
- Feedback currently writes to local `feedback/feedback.json`, which is not
  durable on Render unless a persistent disk or database is added.
- If editing, keep changes narrow and run relevant checks.
- If pushing, user has said push is approved when they explicitly say push, but
  still stage only intended files and keep `CODEX.md` out unless requested.

## Remaining Roadmap Items

Not urgent unless the user resumes KidTutor work:

1. Feedback Storage Decision
   - Keep local feedback for beta only, or move to persistent disk/database.
   - Add basic validation and size limits if production feedback collection
     matters.
2. OpenAI Migration
   - Add OpenAI SDK and `OPENAI_API_KEY` / `OPENAI_MODEL`.
   - Replace Anthropic call path while keeping `/api/tutor` returning `{ text }`.
   - Retest all modes and follow-ups.
3. Ongoing Verification
   - `npm test`
   - local startup
   - Parent / Student / Curiosity checks
   - follow-up checks
   - `/healthz`
   - Render deploy status

## Suggested Restart Procedure

When a future session starts:

```text
git status --short
git branch --show-current
git log -1 --oneline
npm test
```

If checking production:

```text
https://kidtutor-web.onrender.com/healthz
```

Expected:

```json
{"ok":true,"service":"kidtutor"}
```

If the user asks what to do next, recommend pausing KidTutor unless real beta
feedback points to a problem. If they want a practical next KidTutor item,
recommend `Feedback Storage Decision` before model/provider migration.
