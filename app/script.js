let feedbackCount = 0;
let feedbackLog = [];
let feedbackSelections = { q1: null, q2: null, q3: null };
let explanationStep = 0;
let rawTutorOutput = '';

function buildTutorPrompt() {
  const level = document.getElementById("level").value;
  const course = document.getElementById("course").value;
  const input = document.getElementById("studentInput").value.trim();

  if (!input) {
    alert("Please type your question in the 'What are you confused about?' box before building the prompt.");
    return;
  }

  const prompt = `CRITICAL OUTPUT RULE — HIGHEST PRIORITY:

If the user includes ANY numeric clinical value (e.g., 65 mg/dL, 70 mg/dL, 18 mg/dL, 3.1 mEq/L):

1. You MUST repeat that exact value in your response.
2. You MUST include the number + unit exactly as written.
3. You MUST use the value in your explanation.

You are NOT allowed to replace it with:
- "within the normal range"
- "slightly low"
- "a typical value"
- "a normal level"
- any generalized phrase

If you fail to include the number, the response is incorrect.

This rule overrides ALL other formatting, teaching, or safety rules.

---

VALUE EXTRACTION STEP — REQUIRED:

Before writing the answer:

1. Identify every numeric clinical value in the student's question.
   Examples:
   - 65 mg/dL
   - 18 mg/dL
   - 3.1 mEq/L

2. Treat those extracted values as protected scenario facts.

3. In the response, repeat each extracted value exactly as written at least once.

4. Use each extracted value in the clinical reasoning.

5. After each value has been stated clearly once, you may use plain language such as "this value" or "this level" to avoid making the explanation feel like a math problem.

FORBIDDEN:
Do NOT replace extracted values with:
- "within the normal range"
- "slightly low"
- "a typical value"
- "a normal level"
- any vague phrase that hides the number

FAIL CONDITION:
If any student-provided numeric value is missing from the response, the answer is incomplete.

---

ROLE:
You are a clinical reasoning tutor for nursing students.

Your job is to teach HOW to think through a clinical situation step-by-step using specific clinical details.

You do NOT give generic explanations.

---

STUDENT CONTEXT:
Nursing Level: ${level}
Course: ${course}

STUDENT CONFUSION:
${input}

---

CORE RULE:

You MUST NOT generate any explanation until you complete the PRE-PROCESSING block below.

---

PRE-PROCESSING BLOCK (MUST OUTPUT FIRST):

Extract and name the specific entities from the student question.

Drug: [exact drug name + class]
Lab/Value: [exact lab + normal range]
Condition: [name of abnormal condition]
Mechanism: [1 sentence explaining how the drug or condition works]
Risk: [specific clinical danger caused]
Nursing Action: [what the nurse must check or do]
Confusion Type: [mechanism / risk / action / threshold — choose one]

MULTI-DRUG DETECTION:
If the question involves more than one drug, system, or concept, you MUST also complete ALL of the following fields before continuing. Do not skip or merge them.

Primary Drug: [exact name + class]
Secondary Drug: [exact name + class, or "none"]
Primary Mechanism: [1 sentence — what the first drug does specifically]
Secondary Mechanism: [1 sentence — what the second drug does specifically, or "none"]
Shared Goal: [what both drugs are working toward together]
Key Difference: [how their mechanisms differ from each other]

---

CRITICAL ENFORCEMENT RULES:

- You MUST use the exact drug name (e.g., furosemide / Lasix)
- You MUST use the exact lab value (e.g., potassium, 3.5–5.0 mEq/L)
- You MUST NOT use generic terms like "the medication"
- You MUST commit to a specific mechanism before continuing
- If any field is missing, STOP and correct it before continuing

---

REASONING CHAIN (ALL STEPS MUST USE THE EXTRACTED ENTITIES):

If only one drug is present, follow Steps 1–5 below.

If two or more drugs or mechanisms are present, follow Steps 1–7 below. Do NOT collapse them into one explanation.

Step 1 — Normal Physiology
Explain the normal role of the lab/value in the body (use the exact lab name and range)

Step 2 — Mechanism
Explain what the specific drug does (use the exact drug name and mechanism)

Step 3 — Effect on Patient
Explain what happens to the patient because of that mechanism

Step 4 — Clinical Risk
Explain the exact danger created (must be specific, e.g., arrhythmia)

Step 5 — Nursing Action
Explain exactly what the nurse must check or do and why

Step 6 — Second Drug or Mechanism (use ONLY if multi-drug detected)
Name the second drug exactly.
Explain its mechanism separately — do NOT merge it with Step 2.
Explain what it does to the patient independently.

Step 7 — Combined Effect (use ONLY if multi-drug detected)
Explain how both drugs work together toward the shared goal.
Explain why both are needed — what each one does that the other cannot.
Explain the key difference in their mechanisms.
Do NOT simplify into one explanation. Each drug must be named and its role must be distinct.

---

SELF-CHECK (MUST PERFORM BEFORE FINAL OUTPUT):

Verify:
- Each step uses the exact drug name
- Each step uses the exact lab/value
- No sentence could apply to a different drug or lab

If any rule fails, revise before continuing.

---

ACCURACY CHECK (MUST PERFORM BEFORE FINAL OUTPUT):

Verify each of the following before writing the student-facing output:

1. Drug name and class — Is the drug name correct and is the class accurate?
2. Lab/value relationship — Is the relationship between this drug and this lab value clinically correct?
3. Mechanism — Is the mechanism described clinically reasonable and specific to this drug?
4. Risk — Is the risk specific and not exaggerated or overstated?
5. Nursing action — Is the nursing action appropriate for a student level?

NUMERIC USE RULE:

You MAY use numeric values in the student-facing output for teaching purposes.

MEDICATION CALCULATION EXCEPTION — MANDATORY:
If the question involves medication math (dose calculation, concentration, mL to draw up, unit conversion):
- You MUST show ALL numbers exactly as given or calculated
- You MUST show the formula and each step with real numeric values
- You MUST state the final answer as a specific number with unit (e.g., "25 mL")
- Do NOT replace any value with a vague placeholder or generalized phrase
- Numeric values in a calculation are educational facts, not clinical directives

For all other questions:
Do NOT present any number as a clinical directive — do not state thresholds as universal rules the student should act on without a provider order (e.g., "hold if K+ < 3.5").

If you introduce a reference range as context, note that exact parameters vary by institution.

If any accuracy check fails, correct it before continuing.

---

MEDICATION OUTPUT HARD RULE:

In any medication calculation:
- You MUST use exact numeric values (e.g., 1 g, 2 g, 50 mL)
- You MUST NOT use any placeholder or generalized phrase
- You MUST show numbers exactly as given and calculated
- Final answer MUST be a number with unit

FAIL CONDITION:
If any numeric value is replaced with a word or phrase, the answer is incorrect.

---

STUDENT-FACING OUTPUT (AFTER ALL ABOVE):

1. Restated Confusion
Use the SAME specific terms from the question

2. Step-by-Step Clinical Reasoning
(use the reasoning chain above)

3. Real Patient Scenario
Give a realistic example using the exact drug and lab

4. Common Mistake
Explain what students misunderstand about THIS specific situation

5. Guided Thinking Questions
Ask 2–4 questions tied to THIS exact scenario

6. Teach-Back Prompt
Ask the student to explain THIS reasoning chain back

---

TONE:

- Clear
- Practical
- Clinical
- No fluff

---

CLINICAL REASONING TONE RULE:

Do NOT use rigid clinical directives in the student-facing output.

Prohibited phrasing:
- "Hold the medication"
- "Do not give"
- "Administer X immediately"
- Any instruction phrased as a direct order to the student

EXCEPTION — Medication calculations:
This rule does NOT apply to medication math explanations.
When walking through a calculation, stating "draw up 25 mL" or "the answer is 500 mg" is an educational fact, not a clinical directive.
Never substitute a vague placeholder for a numeric value in a calculation.

Instead, frame all actions as clinical reasoning:
- "This would raise concern and prompt the nurse to assess further"
- "The nurse would typically pause and consult the provider before proceeding"
- "This situation would require clarification before the dose is given"
- "The nurse would recognize this as a signal that something needs attention"

Focus on:
- What the nurse is thinking and why
- What clinical signals matter and what they indicate
- Why the situation is potentially risky
- What reasoning leads to the next step

Do NOT sound like:
- A protocol manual listing steps to follow
- A provider giving orders
- A checklist the student must execute

Every explanation must be educational and reasoning-based, not prescriptive.

---

TEST QUESTION HANDLING RULE:

When the student question is a multiple-choice or test-style question:

- Do NOT begin the response by stating the correct answer, such as "The answer is C."
- First guide the student through reasoning:
  - Identify what the question is really asking
  - Explain the mechanism or concept involved
  - Walk through why each option does or does not fit
- Use elimination logic where appropriate
- Only confirm the correct answer AFTER the reasoning is complete
- The answer should appear naturally as the conclusion of the explanation, not as the starting point

This rule is intended to:
- Encourage active thinking
- Prevent answer-first responses
- Maintain a tutor-style learning experience

---

FINAL OUTPUT MODE (MANDATORY):

You are now switching to STUDENT MODE.

You MUST output ONLY the STUDENT-FACING OUTPUT section.

You MUST NOT output:
- PRE-PROCESSING BLOCK
- REASONING CHAIN
- SELF-CHECK
- ACCURACY CHECK
- Any internal instructions or logic

These sections are for internal reasoning only and must NEVER be shown.

The final output must:
- Read like a human tutor explanation
- Be clear and conversational
- Contain no system language
- Contain no labels like "Step 1", "Mechanism", etc.

If any internal section appears in the output, the answer is invalid and must be rewritten before output.

Return ONLY the final explanation.`;

  explanationStep = 0;
  callAI(prompt);
}

async function callAI(prompt) {
  const targetId = explanationStep === 0 ? "tutorOutput"
                 : explanationStep === 1 ? "followUpOutput"
                 : "thirdOutput";
  const target = document.getElementById(targetId);
  target.value = "Thinking...";
  target.setAttribute("readonly", true);

  try {
    const response = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) {
      target.value = "Something went wrong: " + (data.error || "Unknown error.");
      target.removeAttribute("readonly");
      return;
    }

    rawTutorOutput = data.text || '';
    const cleaned = validateOutput(rawTutorOutput);
    target.value = cleaned;
    target.removeAttribute("readonly");
    target.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    target.value = "Could not reach the tutor server. Make sure it is running.";
    target.removeAttribute("readonly");
  }
}

function sendToExplanation() {
  const raw = document.getElementById("claudeAnswer").value.trim();
  if (!raw) {
    alert("Please paste Claude's answer into the 'Paste Claude's Answer Here' box first.");
    return;
  }
  const cleaned = validateOutput(raw);
  const targetId = explanationStep === 0 ? "tutorOutput"
                 : explanationStep === 1 ? "followUpOutput"
                 : "thirdOutput";
  const target = document.getElementById(targetId);
  target.value = cleaned;
  target.removeAttribute("readonly");
  target.scrollIntoView({ behavior: "smooth" });
}

function copyText(elementId) {
  const textArea = document.getElementById(elementId);
  textArea.select();
  textArea.setSelectionRange(0, 999999);
  navigator.clipboard.writeText(textArea.value);
  alert("Copied!");
}

function validateOutput(text) {
  const match = text.match(/Confusion Type:.*?(\n|$)/i);
  if (!match) return scrubNumbers(text);
  const splitIndex = text.indexOf(match[0]) + match[0].length;
  return text.substring(0, splitIndex) + scrubNumbers(text.substring(splitIndex));
}

function scrubNumbers(text) {
  // Guard: blood glucose < 70 mg/dL labeled hypoglycemia only when glucose keywords appear nearby
  text = text.replace(/\b(\d+(?:\.\d+)?)\s*mg\/dL\b/gi, (match, numStr, offset, original) => {
    if (parseFloat(numStr) < 70) {
      const nearby = original.slice(Math.max(0, offset - 120), offset + match.length + 120).toLowerCase();
      if (!/glucose|blood sugar|\bbg\b|glycemi/.test(nearby)) return match;
      if (/\bbun\b|creatinine|urea|cholesterol|bilirubin/.test(nearby)) return match;
      return `${match}, which is low blood glucose (hypoglycemia)`;
    }
    return match;
  });

  return text;
}

function buildFeedbackPrompt(feedbackType) {
  const studentInput = document.getElementById("studentInput").value.trim();
  const explanation = rawTutorOutput.trim() || document.getElementById("tutorOutput").value.trim();
  const level = document.getElementById("level").value;
  const course = document.getElementById("course").value;

  if (!explanation) {
    alert("Generate an explanation before using feedback.");
    return;
  }

  const feedbackMap = {
    understand:
      "The student says they understand. Do NOT re-explain the full concept.\n" +
      "Summarize the single most important clinical takeaway in 2-3 sentences.\n" +
      "Then provide one short self-check question the student can answer mentally to confirm their understanding.\n" +
      "Do not provide the answer to the self-check question — let them think it through.",

    confused:
      "The student is still confused. Do NOT repeat the previous explanation in any form.\n" +
      "Use a completely different strategy:\n" +
      "- Try a different analogy or real-world comparison\n" +
      "- Change the order: lead with the clinical consequence first, then explain the cause\n" +
      "- Use shorter sentences and simpler structure\n" +
      "Do not reuse any sentence or phrase from the previous explanation.",

    too_technical:
      "The explanation was too technical. Rewrite it from scratch using only everyday language.\n" +
      "Required:\n" +
      "- Begin the response with the exact words: Let's simplify this.\n" +
      "- Use only words a non-medical person would understand\n" +
      "- If a medical term must appear, define it immediately in plain words before using it\n" +
      "- Include exactly one simple analogy (for example: a thermostat, a traffic jam, a garden hose, a locked door) to explain the core concept\n" +
      "- Write in short paragraphs of 2-3 sentences maximum\n" +
      "- Do not use bullet points or numbered lists\n" +
      "- Do not assume the student knows any clinical terminology\n" +
      "The goal is clarity only. Completeness is secondary.",

    not_technical:
      "The explanation was not technical enough. Add mechanism detail.\n" +
      "Rules:\n" +
      "- Name the specific physiological process, receptor, transporter, or pathway involved\n" +
      "- Explain WHY the mechanism works at a cellular or organ level, not just what it does\n" +
      "- Stay student-friendly: surround technical details with plain-language context\n" +
      "Do not remove the nursing application — add depth before it.",

    missed:
      "The explanation did not address the student's actual confusion.\n" +
      "Do NOT give a general topic explanation.\n" +
      "Required structure:\n" +
      "1. Restate the student's original question exactly as they asked it\n" +
      "2. Identify the specific part of the question that was not answered\n" +
      "3. Answer that specific part directly before anything else\n" +
      "Only then add supporting context if needed.",

    example:
      "Provide a realistic patient scenario that demonstrates this concept.\n" +
      "The scenario must:\n" +
      "- Name a specific patient using initials only\n" +
      "- Include the specific drug, lab value, or condition from the original question\n" +
      "- Show nurse observations, clinical reasoning, and nursing action in sequence\n" +
      "- End with the outcome of the nursing action\n" +
      "Do not use a generic example. Every detail must connect directly to the original question.",

    step_by_step:
      "Break this explanation into a numbered cause-and-effect chain.\n" +
      "Required format — one idea per step, no merging:\n" +
      "1. What is normal in the body related to this topic\n" +
      "2. What the drug or condition changes\n" +
      "3. What happens to the patient as a direct result\n" +
      "4. What clinical risk or danger that creates\n" +
      "5. What the nurse must check or do, and why\n" +
      "Each step must follow from the previous one. Do not skip or combine steps.",

    theory:
      "The student needs the underlying theory before the nursing application.\n" +
      "Required structure:\n" +
      "1. Start with the normal body process involved\n" +
      "2. Explain what changes at a physiological or pharmacological level, and why\n" +
      "3. Connect that mechanism to the patient effect\n" +
      "4. Only then connect to the nursing action\n" +
      "Do not lead with nursing action. Lead with the science, then build to the clinical application.",

    practice:
      "Create one NCLEX-style multiple choice question based on the student's original confusion.\n" +
      "Required format:\n" +
      "- Write the question stem\n" +
      "- Provide four answer choices labeled A, B, C, D\n" +
      "- Write: 'Think about your answer before reading on.'\n" +
      "- Then state the correct answer\n" +
      "- Explain why it is correct\n" +
      "- Explain why each of the other three options is wrong\n" +
      "The question must test clinical reasoning, not memorization."
  };

  const instruction = feedbackMap[feedbackType] || "Please clarify the explanation.";

  const prompt = `FOLLOW-UP TUTOR REQUEST

Student Level: ${level}
Course: ${course}

Original Question:
${studentInput}

Previous Explanation:
${explanation}

Student Feedback — What to do next:
${instruction}

RULES:
- Address the student's feedback directly
- Use the same specific drug, lab, or condition from the original question
- Do not give a generic response
- Keep it focused and clear`;

  explanationStep++;
  feedbackCount++;
  if (feedbackCount >= 4) {
    showLimitModal();
  }
  callAI(prompt);
}

function showLimitModal() {
  const modal = document.getElementById("limitModal");
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-card">
        <p class="modal-message">You've built a good learning thread. Save this session before starting fresh?</p>
        <div class="modal-buttons">
          <button onclick="downloadSession()">Download Session</button>
          <button onclick="continueAnyway()">Continue Anyway</button>
          <button class="reset-btn" onclick="startNewSession()">Start New Session</button>
        </div>
      </div>
    </div>
  `;
  modal.style.display = "block";
}

function downloadSession() {
  const level = document.getElementById("level").value;
  const course = document.getElementById("course").value;
  const question = document.getElementById("studentInput").value.trim();
  const current = document.getElementById("tutorOutput").value.trim();

  let content = "NURSING TUTOR SESSION\n";
  content += "Date: " + new Date().toLocaleDateString() + "\n";
  content += "Level: " + level + "\n";
  content += "Course: " + course + "\n\n";
  content += "ORIGINAL QUESTION:\n" + (question || "(none)") + "\n\n";
  content += "EXPLANATION:\n" + (current || "(none)") + "\n";

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nursing-tutor-session.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function saveTutorSession() {
  const question = document.getElementById("studentInput").value.trim();
  const first = document.getElementById("tutorOutput").value.trim();
  const followUp = document.getElementById("followUpOutput").value.trim();
  const third = document.getElementById("thirdOutput").value.trim();

  if (!question && !first) {
    alert("No tutor session to save yet.");
    return;
  }

  const level = document.getElementById("level").value;
  const course = document.getElementById("course").value;

  const today = new Date();
  const dateStr = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  const sep = "====================================";

  let content = sep + "\n";
  content += "=== NURSING TUTOR SESSION ===\n";
  content += sep + "\n";
  content += "Date: " + today.toLocaleString() + "\n";
  content += "Level: " + level + "\n";
  content += "Course: " + course + "\n";

  content += "\n" + sep + "\n";
  content += "=== ORIGINAL QUESTION ===\n";
  content += sep + "\n";
  content += (question || "(none)") + "\n";

  content += "\n" + sep + "\n";
  content += "=== FIRST EXPLANATION ===\n";
  content += sep + "\n";
  content += (first || "(none)") + "\n";

  if (followUp) {
    content += "\n" + sep + "\n";
    content += "=== FOLLOW-UP EXPLANATION ===\n";
    content += sep + "\n";
    content += followUp + "\n";
  }

  if (third) {
    content += "\n" + sep + "\n";
    content += "=== SECOND FOLLOW-UP EXPLANATION ===\n";
    content += sep + "\n";
    content += third + "\n";
  }

  if (feedbackLog.length > 0) {
    content += "\n" + sep + "\n";
    content += "=== QUICK FEEDBACK ===\n";
    content += sep + "\n";
    feedbackLog.forEach((entry, i) => {
      content += "\nEntry " + (i + 1) + " — " + entry.timestamp + "\n";
      content += "Helpful? " + entry.q1 + "\n";
      content += "What would help? " + entry.q2 + "\n";
      content += "How it felt: " + entry.q3 + "\n";
      if (entry.comment) content += "Note: " + entry.comment + "\n";
    });
  }

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "NursingTutor_Session_" + dateStr + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}

function continueAnyway() {
  feedbackCount = 0;
  document.getElementById("limitModal").style.display = "none";
}

function startNewSession() {
  document.getElementById("limitModal").style.display = "none";
  resetApp();
}

function downloadFeedback() {
  if (feedbackLog.length === 0) {
    alert("No feedback saved yet.");
    return;
  }

  const today = new Date();
  const dateStr = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  let content = "NURSING TUTOR — TESTER FEEDBACK\n";
  content += "Exported: " + today.toLocaleString() + "\n";
  content += "Total entries: " + feedbackLog.length + "\n";
  content += "\n";

  feedbackLog.forEach((entry, i) => {
    content += "---\n";
    content += "Entry " + (i + 1) + " — " + entry.timestamp + "\n";
    content += "Helpful? " + entry.q1 + "\n";
    content += "What would help? " + entry.q2 + "\n";
    content += "How it felt: " + entry.q3 + "\n";
    if (entry.comment) content += "Note: " + entry.comment + "\n";
  });

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "NursingTutor_Feedback_" + dateStr + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}

function selectFeedback(question, value, el) {
  feedbackSelections[question] = value;
  const group = el.parentElement;
  group.querySelectorAll('.feedback-option-btn').forEach(btn => btn.classList.remove('selected'));
  el.classList.add('selected');
}

function saveFeedback() {
  const q1 = feedbackSelections.q1;
  const q2 = feedbackSelections.q2;
  const q3 = feedbackSelections.q3;
  const comment = document.getElementById("feedbackComment").value.trim();

  if (!q1 && !q2 && !q3) {
    alert("Please answer at least one question before saving.");
    return;
  }

  const entry = {
    timestamp: new Date().toLocaleString(),
    level: document.getElementById("level").value,
    course: document.getElementById("course").value,
    question: document.getElementById("studentInput").value.trim(),
    firstExplanation: document.getElementById("tutorOutput").value.trim(),
    followUpExplanation: document.getElementById("followUpOutput").value.trim(),
    q1: q1 || "—",
    q2: q2 || "—",
    q3: q3 || "—",
    comment: comment
  };

  feedbackLog.unshift({
    timestamp: entry.timestamp,
    q1: entry.q1,
    q2: entry.q2,
    q3: entry.q3,
    comment: entry.comment
  });

  renderFeedbackLog();

  fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  }).catch(err => {
    console.warn('Feedback file save failed:', err.message);
  }).then(res => {
    if (res && !res.ok) {
      res.json().then(data => {
        console.warn('Feedback file save failed:', data.error || 'Unknown error');
      }).catch(() => {});
    }
  });

  feedbackSelections = { q1: null, q2: null, q3: null };
  document.querySelectorAll('.feedback-option-btn').forEach(btn => btn.classList.remove('selected'));
  document.getElementById("feedbackComment").value = "";
}

function renderFeedbackLog() {
  const log = document.getElementById("feedbackLog");
  if (feedbackLog.length === 0) {
    log.innerHTML = "";
    return;
  }
  log.innerHTML = feedbackLog.map(entry => `
    <div class="feedback-log-entry">
      <div class="feedback-log-time">${entry.timestamp}</div>
      <div><strong>Helpful?</strong> ${entry.q1}</div>
      <div><strong>What would help?</strong> ${entry.q2}</div>
      <div><strong>How it felt:</strong> ${entry.q3}</div>
      ${entry.comment ? `<div><strong>Note:</strong> ${entry.comment}</div>` : ""}
    </div>
  `).join("");
}

function toggleDevMode() {
  const container = document.getElementById("devModeContainer");
  const btn = document.getElementById("devToggleBtn");
  if (container.style.display === "none") {
    container.style.display = "block";
    btn.textContent = "Hide Developer Mode";
  } else {
    container.style.display = "none";
    btn.textContent = "Show Developer Mode";
  }
}

function openDevMode() {
  const container = document.getElementById("devModeContainer");
  const btn = document.getElementById("devToggleBtn");
  if (container.style.display === "none") {
    container.style.display = "block";
    btn.textContent = "Hide Developer Mode";
  }
}

function resetAll() {
  resetApp();
}

function resetApp() {
  document.getElementById("studentInput").value = "";
  document.getElementById("tutorOutput").value = "";
  document.getElementById("tutorRequest").value = "";
  document.getElementById("claudeAnswer").value = "";
  document.getElementById("level").selectedIndex = 0;
  document.getElementById("course").selectedIndex = 0;
  feedbackCount = 0;
  feedbackLog = [];
  feedbackSelections = { q1: null, q2: null, q3: null };
  explanationStep = 0;
  rawTutorOutput = '';
  document.getElementById("followUpOutput").value = "";
  document.getElementById("thirdOutput").value = "";
  document.querySelectorAll('.feedback-option-btn').forEach(btn => btn.classList.remove('selected'));
  document.getElementById("feedbackComment").value = "";
  renderFeedbackLog();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
