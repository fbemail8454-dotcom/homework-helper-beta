require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';

if (!apiKey) {
  console.warn('WARNING: ANTHROPIC_API_KEY is missing from .env');
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'app')));

function cleanField(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMode(mode) {
  return mode === 'kid-practice' ? 'kid-practice' : 'parent-guide';
}

function getTutorRequest(body) {
  const mode = normalizeMode(body.mode);
  const request = {
    mode,
    parentName: cleanField(body.parentName),
    childName: cleanField(body.childName),
    gradeLevel: cleanField(body.gradeLevel),
    subject: cleanField(body.subject),
    homeworkText: cleanField(body.homeworkText),
    struggleText: cleanField(body.struggleText),
    previousAnswer: cleanField(body.previousAnswer),
    followUpType: cleanField(body.followUpType)
  };

  if (!request.childName) {
    throw new Error('Child name is required.');
  }

  if (!request.gradeLevel) {
    throw new Error('Grade level is required.');
  }

  if (!request.subject) {
    throw new Error('Subject is required.');
  }

  if (!request.homeworkText) {
    throw new Error('Homework or problem text is required.');
  }

  return request;
}

function buildBaseContext(request) {
  const parentLine = request.parentName || 'the parent or helper';
  const struggleLine = request.struggleText || 'Not specified';

  return `Homework Helper request

Parent/helper name: ${parentLine}
Child name: ${request.childName}
Grade level: ${request.gradeLevel}
Subject: ${request.subject}
Homework/problem text:
${request.homeworkText}

What the child is struggling with:
${struggleLine}`;
}

function getGradeNumber(gradeLevel) {
  const normalized = String(gradeLevel || '').toLowerCase();
  if (/pre-?k|prek|kindergarten|\bk\b/.test(normalized)) return 0;

  const match = normalized.match(/\d+/);
  if (!match) return /high school/.test(normalized) ? 9 : 3;

  return Number(match[0]);
}

function getToneGuidance(gradeLevel) {
  const grade = getGradeNumber(gradeLevel);

  if (grade <= 2) {
    return 'very simple, playful, and warm. Light emojis are okay. Use very short words and short sentences.';
  }

  if (grade <= 5) {
    return 'friendly and simple. Light emojis are okay. Keep encouragement natural and brief.';
  }

  if (grade <= 8) {
    return 'direct, respectful, and not babyish. Use minimal emojis, or none if they would feel too young.';
  }

  return 'concise, academic, and respectful. Do not use emojis, childish praise, babyish wording, or phrases like "you have got this" or "superstar".';
}

function buildParentGuidePrompt(request) {
  const parentName = request.parentName || 'the parent or helper';

  return `You are Homework Helper, a calm teaching assistant for parents and caregivers.

Your task is to help ${parentName} coach ${request.childName} through homework without simply giving the answer.

Homework:
${request.homeworkText}

Grade: ${request.gradeLevel}
Subject: ${request.subject}
Struggle: ${request.struggleText || 'Not specified'}

Output for Parent Guide:
The output MUST contain exactly these sections, in this order, one time only:

Title: Homework Helper Parent Guide
1. What ${request.childName} is learning
   Explain the core skill in 2 to 3 short sentences.
2. How this is taught now
   Explain the current approach briefly. Focus on what ${parentName} should do differently from simply giving an answer.
3. Coaching steps
   Give 3 to 5 short steps ${parentName} can use while helping ${request.childName}. If a tiny worked example is useful, include it inside this section only.
4. Common mistakes
   List 2 to 4 likely mistakes or misunderstandings.
5. Parent prompts
   Give 3 to 5 short things ${parentName} can say to help ${request.childName} think.

Rules:
- Do not solve the assignment for the child unless a tiny worked example is needed to explain the method.
- Keep the whole guide about 40 percent shorter than a full lesson-style response.
- Keep paragraphs short and easy to skim.
- Avoid repetition and dense wording.
- Generate the guide once, then stop immediately after section 5.
- Do not repeat the title.
- Do not repeat any section.
- Do not add sections after section 5.
- Do not create a separate Example section.
- Do not repeat the guide to add an example.
- Do not output "Add Example:", internal notes, drafting labels, or hidden instructions.
- Do not use markdown heading symbols like # or ##.
- Do not use "---" separator lines.
- Keep the title and numbered sections as plain text.
- Use ${parentName} for the parent/helper and ${request.childName} for the child. Do not use placeholders like "c" or "x". Do not invent other names.
- Keep the tone reassuring, specific, and practical for a busy parent.
- Use language appropriate for an adult helper, not a teacher manual.
- If the subject or problem is unclear, state the best assumption and give a useful path forward.
- Avoid health care, medical, clinical, or college-level professional training framing.`;
}

function buildKidPracticePrompt(request) {
  const followUp = buildFollowUpInstruction(request);
  const toneGuidance = getToneGuidance(request.gradeLevel);

  return `You are Homework Helper, a tutor speaking directly to ${request.childName}.

Your task is to create a short, live-feeling Student Practice activity based on the homework or problem text.

Tone for grade ${request.gradeLevel}: ${toneGuidance}

${buildBaseContext(request)}

Student Practice flow:
Start with exactly: "Let's try this together!"
Then write in a natural flow, like you are sitting with ${request.childName}. No titles, headers, markdown sections, or "---" separators.

Use this order without labeling the parts:
1. Give one quick action ${request.childName} can do right away, such as draw circles, count objects, underline key words, or write a first step. If the original problem gives the number of groups, use that exact number for circles in this first action.
2. Give a very short explanation in 1 or 2 short sentences. Use natural wording, such as "We are sharing into equal groups!"
3. For a word problem, help ${request.childName} name the total amount, the group size or number of groups, and what each question asks. Do not compute the original final answers yet.
4. Walk through one smaller similar example with short steps before touching the original homework.
5. Give 3 or 4 short practice problems. Include a mix of visual/grouping, simple numeric, and short word problem.
6. Give quick answers for the similar practice problems only. Put answers on separate lines or after all practice questions. Do not place answers directly after questions. Do not use an "Answer Key" heading.
7. End with this exact sentence: "When you finish, type this: Answer: ___. I'll check it."

Rules:
- Use grade-appropriate vocabulary and sentence length.
- Do not mention that you are an AI.
- Do not include parent coaching advice in this mode.
- Use student language, not kid language.
- Follow the grade tone exactly.
- For grades 9 through 12, use a concise academic tone with no emojis, no childish praise, and no babyish wording.
- For grades 6 through 8, stay direct and respectful. Avoid babyish language and use minimal emojis.
- For grades K through 5, friendly encouragement is okay.
- Keep it clear, direct, and casual only when that fits the grade band.
- Make the response feel like a real-time activity, not a lesson.
- Keep the whole response about 25 percent shorter than a typical lesson response.
- Use short sentences and only essential explanation.
- Do not solve the original homework immediately.
- Guide the setup first, then use smaller similar examples.
- For multi-part word problems, identify the total amount, the group size or number of groups, and what each question asks.
- Do not compute all final answers right away.
- Do not automatically provide the final answer to the original homework.
- Do not include "Check your homework after you try it:".
- Do not include the original homework answer anywhere unless the user explicitly asks for a check later.
- Replace the final homework answer with exactly: "When you finish, type this: Answer: ___. I'll check it."
- Prefer giving answers only for similar practice problems, not the original assignment.
- Do not include the original homework answer inside regular practice answers.
- Do not place answers directly after questions.
- Put answers on separate lines or after all practice questions.
- No paragraph may be longer than 2 short sentences.
- Prefer one action per line.
- Each instruction must ask for one action only. Do not combine actions in one sentence.
- Break combined steps into separate short sentences.
- Every action instruction must be on its own line.
- Do not write paragraph blocks for instructions.
- Use blank lines to keep action steps easy to read.
- Keep sentences short, about 5 to 8 words when possible.
- Do not use these words: "deal", "distribute", or "allocate".
- Do not use the phrase "Division means".
- Use natural wording like "We are sharing into equal groups!" instead.
- Prefer simple action words: "put", "draw", "count", "circle", and "mark".
- HARD DRAWING RULE: When using circles and dots, copy these exact four lines with no variation except numbers:
  "Draw X circles."
  "Put 1 dot in each circle."
  "Keep going until you use all ___ dots."
  "Count the dots in one circle."
- Apply the HARD DRAWING RULE to every drawing problem, including examples and practice problems.
- Do not change the drawing wording.
- Do not combine the drawing lines.
- Do not shorten the drawing lines.
- Do not rewrite the drawing lines.
- Do not use any headings, titles, labels, markdown lists with section names, or divider lines.
- Do not use adult-style teaching language.
- Use only the child's name provided here: ${request.childName}. Do not invent or use any other child names.
- Do not replace story character names from the homework. If the homework says Maya, keep Maya when referring to the story.
- Use ${request.childName} only when speaking directly to the student.
- If the homework is about division or equal sharing, align with this approach: the number of groups is known, and the child is finding how many are in each group. Do not introduce it as "groups of 6" unless the original problem clearly gives the group size.
- If the original homework includes a specific answer, create similar practice rather than just handing over the answer.
- Avoid health care, medical, clinical, or college-level professional training framing.
${followUp}`;
}

function buildFollowUpInstruction(request) {
  if (!request.previousAnswer || !request.followUpType) {
    return '';
  }

  const instructions = {
    clearer: 'Make the next response clearer and simpler than the previous one.',
    example: 'Add a concrete example that matches the child\'s grade level and subject.',
    steps: 'Break the help into smaller step-by-step guidance.',
    practice: 'Add more practice while keeping the same mode and grade level.'
  };

  return `

Previous Homework Helper answer:
${request.previousAnswer}

Follow-up request:
${instructions[request.followUpType] || 'Improve the previous answer based on the helper\'s needs.'}`;
}

function buildPrompt(request) {
  return request.mode === 'kid-practice'
    ? buildKidPracticePrompt(request)
    : buildParentGuidePrompt(request);
}

async function callAnthropic(prompt) {
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY is not configured.');
    err.status = 500;
    throw err;
  }

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

    const err = new Error(data?.error?.message || rawText || 'Anthropic API error.');
    err.status = response.status;
    throw err;
  }

  return data?.content?.[0]?.text || '';
}

app.post('/api/tutor', async (req, res) => {
  try {
    const tutorRequest = getTutorRequest(req.body || {});
    const prompt = buildPrompt(tutorRequest);
    const text = await callAnthropic(prompt);
    return res.json({ text });
  } catch (err) {
    const status = err.status || (/required/.test(err.message) ? 400 : 500);
    console.error('Tutor request error:', err.message);
    return res.status(status).json({ error: err.message });
  }
});

app.post('/api/tutor-request', (req, res) => {
  try {
    const tutorRequest = getTutorRequest(req.body || {});
    return res.json({ prompt: buildPrompt(tutorRequest) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
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
  console.log(`Homework Helper server running at http://localhost:${PORT}`);
  console.log(`Model: ${model}`);
  console.log(`API key loaded: ${apiKey ? 'YES' : 'NO'}`);
});
