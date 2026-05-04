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

function normalizeHomeworkText(text) {
  if (!text) return text;

  // Trim
  let cleaned = text.trim();

  // Detect "broken math" pattern:
  // many short lines (1-3 characters)
  const lines = cleaned.split('\n');
  const shortLines = lines.filter(l => l.trim().length > 0 && l.trim().length <= 3);

  const isLikelyBrokenMath =
    lines.length > 6 && shortLines.length / lines.length > 0.6;

  if (isLikelyBrokenMath) {
    // Join everything into one line
    cleaned = lines.map(l => l.trim()).join(' ');

    // Collapse extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
  }

  return cleaned;
}

function normalizeMode(mode) {
  if (mode === 'kid-practice' || mode === 'curiosity') return mode;
  return 'parent-guide';
}

function getTutorRequest(body) {
  const mode = normalizeMode(body.mode);
  const request = {
    mode,
    parentName: cleanField(body.parentName),
    childName: cleanField(body.childName),
    gradeLevel: cleanField(body.gradeLevel),
    subject: cleanField(body.subject),
    homeworkText: normalizeHomeworkText(cleanField(body.homeworkText)),
    struggleText: cleanField(body.struggleText),
    previousAnswer: cleanField(body.previousAnswer),
    followUpType: cleanField(body.followUpType)
  };

  if (!request.childName) {
    if (request.mode === 'curiosity') {
      request.childName = 'the learner';
    } else {
      throw new Error('Child name is required.');
    }
  }

  if (!request.gradeLevel) {
    if (request.mode === 'curiosity') {
      request.gradeLevel = 'general learner-friendly level';
    } else {
      throw new Error('Grade level is required.');
    }
  }

  if (!request.subject) {
    if (request.mode === 'curiosity') {
      request.subject = 'general curiosity/exploration';
    } else {
      throw new Error('Subject is required.');
    }
  }

  if (!request.homeworkText) {
    if (request.mode === 'curiosity') {
      throw new Error('Please enter something to explore.');
    }
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
  if (/ged|adult|college/.test(normalized)) return 10;

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
- For conceptual science topics, keep explanations concept-first and avoid oversimplified analogies.
- For quantum or superposition explanations, avoid shortcuts that make qubits sound like ordinary mixed states or quantum computers sound faster at every task.
- For quantum topics, prefer wording such as "A qubit can be in a quantum state connected to both possible outcomes until measured."
- If using a spinning coin analogy for quantum ideas, call it a rough starter picture, not a perfect model.
- Explain that quantum computers may handle certain structured problems more efficiently, rather than being faster at everything.
- Avoid health care, medical, clinical, or college-level professional training framing.`;
}

function buildKidPracticePrompt(request) {
  const followUp = buildFollowUpInstruction(request);
  const toneGuidance = getToneGuidance(request.gradeLevel);

  return `You are Homework Helper, a tutor speaking directly to ${request.childName}.

Your task is to create a short, live-feeling tutoring response based on the homework or problem text.

Tone for grade ${request.gradeLevel}: ${toneGuidance}

${buildBaseContext(request)}

Student Practice flow:
Start with exactly: "Let's try this together!"
Then write in a natural flow, like you are sitting with ${request.childName}. No titles, headers, markdown sections, or "---" separators.

Use this order without labeling the parts:
1. Start with one small thing ${request.childName} can notice, try, or think about right away. For math that needs a visual model, this can be a drawing step.
2. Give a very short explanation in 1 or 2 short sentences. Use natural wording, such as "We are sharing into equal groups!"
3. For a word problem, help ${request.childName} name the total amount, the group size or number of groups, and what each question asks. Do not compute the original final answers yet.
4. Walk through one smaller similar example with short steps before touching the original homework.
5. Give 2 or 3 short chances to practice or reason aloud. Use conversational prompts when they fit, such as "What do you think is happening here?" or "How would you explain this part?"
6. Give quick answers for similar practice only when answers are useful. Put answers after the practice, not directly after each question. Do not use an "Answer Key" heading.
7. End with a natural invitation for ${request.childName} to respond in their own words. Use wording like: "Try putting that into your own words, and I'll help you refine it." or "Tell me what part still feels confusing, and we'll work through it."

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
- Make the response feel like real-time tutoring, not a worksheet or handout.
- Keep the whole response about 25 percent shorter than a typical lesson response.
- Use short sentences and only essential explanation.
- Do not solve the original homework immediately.
- Guide the setup first, then use smaller similar examples.
- For multi-part word problems, identify the total amount, the group size or number of groups, and what each question asks.
- Do not compute all final answers right away.
- Do not automatically provide the final answer to the original homework.
- Do not include "Check your homework after you try it:".
- Do not include the original homework answer anywhere unless the user explicitly asks for a check later.
- Do not force the student to use a special answer label or fill-in-the-blank format.
- Keep the closing conversational and adaptive, not like worksheet software.
- If inviting a short answer, ask naturally without requiring a special format.
- Prefer giving answers only for similar practice problems, not the original assignment.
- Do not include the original homework answer inside regular practice answers.
- Do not place answers directly after questions.
- Put answers on separate lines or after all practice questions.
- No paragraph may be longer than 2 short sentences.
- Prefer one thought, question, or action per line.
- Each prompt should ask for one thought or action only. Do not combine multiple tasks in one sentence.
- Break combined coaching moves into separate short sentences.
- Use conversational questions often, especially for conceptual topics.
- Avoid worksheet-like commands such as "Write one word," "Write one sentence," "Now try these," or "Write this down."
- Prefer natural prompts such as "What word would you use?", "How would you explain it?", "What part feels strange?", "What do you think the difference is?", and "Try putting that into your own words."
- Do not write dense paragraph blocks.
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
- For conceptual science topics, avoid oversimplified claims that make qubits sound like ordinary mixed states or quantum computers sound faster at every task.
- For quantum or superposition explanations, prefer wording such as "A qubit can be in a quantum state connected to both possible outcomes until measured."
- If using a spinning coin analogy for quantum ideas, call it a rough starter picture, not a perfect model.
- Explain that quantum computers may handle certain structured problems more efficiently, rather than being faster at everything.
- Avoid health care, medical, clinical, or college-level professional training framing.
${followUp}`;
}

function buildCuriosityPrompt(request) {
  const followUp = buildFollowUpInstruction(request);
  const toneGuidance = getToneGuidance(request.gradeLevel);

  return `You are Homework Helper, a learning companion speaking directly to ${request.childName}.

Your task is to help ${request.childName} explore an open-ended question through guided learning.

This is Curiosity Mode. It is not a chatbot mode. It is still educational, reasoning-oriented, and explanation-focused.

Tone for grade ${request.gradeLevel}: ${toneGuidance}

Learner context:
Parent/helper name: ${request.parentName || 'the parent or helper'}
Learner name: ${request.childName}
Grade level: ${request.gradeLevel}
Subject: ${request.subject}
Question or topic to explore:
${request.homeworkText}

What feels confusing or interesting:
${request.struggleText || 'Not specified'}

Curiosity Mode flow:
Start with a short, welcoming sentence that treats the question as worth exploring.
Then guide the learner through the idea in a conversational flow. No titles, markdown headings, or "---" separators.

Use this order without labeling the parts:
1. Start by naming the big idea behind the question in one clear sentence.
2. Ask or answer one small "why might that happen?" question to begin the reasoning.
3. Build the explanation in 2 or 3 short layers, moving from everyday intuition to the more precise idea.
4. Point out one common misconception or too-simple explanation.
5. Give one quick thought check, comparison, or "try explaining it back" prompt.
6. End by inviting ${request.childName} to say what still feels confusing or what they want to explore next.

Rules:
- Keep the response exploratory, thoughtful, and guided.
- Do not dump a long encyclopedia-style answer.
- Do not pretend to be a general AI assistant or invite unrelated chatting.
- Normalize confusion with calm wording, but do not overpraise.
- Use questions to encourage reasoning, not memorization.
- Keep paragraphs short, no more than 2 short sentences each.
- Prefer natural prompts such as "What do you think is happening there?", "What part feels strange?", "How would you explain that in your own words?", and "What do you think changes if...?"
- Use examples and analogies only when they make the concept clearer.
- Say when an analogy is only a rough starter picture.
- Include misconception handling when the topic is commonly misunderstood.
- Keep the explanation appropriate for ${request.gradeLevel}, including GED or adult learners when selected.
- For conceptual science topics, keep explanations concept-first and avoid oversimplified analogies.
- For quantum or superposition explanations, avoid shortcuts that make qubits sound like ordinary mixed states or quantum computers sound faster at every task.
- For quantum topics, prefer wording such as "A qubit can be in a quantum state connected to both possible outcomes until measured."
- If using a spinning coin analogy for quantum ideas, call it a rough starter picture, not a perfect model.
- Explain that quantum computers may handle certain structured problems more efficiently, rather than being faster at everything.
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
  if (request.mode === 'kid-practice') return buildKidPracticePrompt(request);
  if (request.mode === 'curiosity') return buildCuriosityPrompt(request);
  return buildParentGuidePrompt(request);
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
