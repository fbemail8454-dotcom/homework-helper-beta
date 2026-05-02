let feedbackLog = [];
let feedbackSelections = { q1: null, q2: null, q3: null };
let latestOutputId = 'tutorOutput';

function getSelectedMode() {
  const selected = document.querySelector('input[name="mode"]:checked');
  return selected ? selected.value : 'parent-guide';
}

function getSubjectValue() {
  const selectedSubject = document.getElementById('subjectSelect').value;
  const customSubject = document.getElementById('customSubject').value.trim();
  return customSubject || selectedSubject;
}

function normalizeHomeworkText(text) {
  if (!text) return text;

  let cleaned = text.trim();
  const lines = cleaned.split('\n');
  const shortLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && trimmed.length <= 3;
  });

  const isLikelyBrokenMath =
    lines.length > 6 && shortLines.length / lines.length > 0.6;

  if (isLikelyBrokenMath) {
    cleaned = lines.map(line => line.trim()).join(' ');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\u2212/g, '-').replace(/\u00d7/g, '*');
  }

  return cleaned;
}

function cleanHomeworkTextarea() {
  const textarea = document.getElementById('homeworkText');
  const cleaned = normalizeHomeworkText(textarea.value);
  textarea.value = cleaned;
  return cleaned;
}

function toggleCustomSubject() {
  const subjectSelect = document.getElementById('subjectSelect');
  const customSubject = document.getElementById('customSubject');
  const useCustom = subjectSelect.value === 'Other';

  if (useCustom) {
    customSubject.focus();
  }
}

function getTutorPayload(extra = {}) {
  return {
    mode: getSelectedMode(),
    parentName: document.getElementById('parentName').value.trim(),
    childName: document.getElementById('childName').value.trim(),
    gradeLevel: document.getElementById('gradeLevel').value,
    subject: getSubjectValue(),
    homeworkText: cleanHomeworkTextarea(),
    struggleText: document.getElementById('struggleText').value.trim(),
    ...extra
  };
}

function validateTutorPayload(payload) {
  if (!payload.childName) return 'Please enter the child name.';
  if (!payload.gradeLevel) return 'Please choose a grade level.';
  if (!payload.subject) return 'Please enter a subject.';
  if (!payload.homeworkText) return 'Please enter homework or problem text.';
  return '';
}

async function generateTutorResponse() {
  const payload = getTutorPayload();
  const error = validateTutorPayload(payload);
  if (error) {
    alert(error);
    return;
  }

  latestOutputId = 'tutorOutput';
  await callTutor(payload, 'tutorOutput');
}

async function generateFollowUp(followUpType) {
  const previousAnswer = document.getElementById(latestOutputId).value.trim()
    || document.getElementById('tutorOutput').value.trim();

  if (!previousAnswer) {
    alert('Generate a Homework Helper response before asking for a follow-up.');
    return;
  }

  const payload = getTutorPayload({ previousAnswer, followUpType });
  const error = validateTutorPayload(payload);
  if (error) {
    alert(error);
    return;
  }

  latestOutputId = 'followUpOutput';
  await callTutor(payload, 'followUpOutput');
}

async function callTutor(payload, targetId) {
  const target = document.getElementById(targetId);
  target.value = 'Thinking...';
  target.setAttribute('readonly', true);

  try {
    const response = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      target.value = 'Something went wrong: ' + (data.error || 'Unknown error.');
      target.removeAttribute('readonly');
      return;
    }

    target.value = data.text || '';
    target.removeAttribute('readonly');
    target.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    target.value = 'Could not reach the Homework Helper server. Make sure it is running.';
    target.removeAttribute('readonly');
  }
}

async function prepareTutorRequest() {
  const payload = getTutorPayload();
  const error = validateTutorPayload(payload);
  if (error) {
    alert(error);
    return;
  }

  const target = document.getElementById('tutorRequest');
  target.value = 'Building request...';

  try {
    const response = await fetch('/api/tutor-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    target.value = response.ok ? data.prompt : 'Something went wrong: ' + (data.error || 'Unknown error.');
  } catch (err) {
    target.value = 'Could not reach the Homework Helper server. Make sure it is running.';
  }
}

function sendToExplanation() {
  const raw = document.getElementById('claudeAnswer').value.trim();
  if (!raw) {
    alert("Please paste Claude's answer first.");
    return;
  }

  const target = document.getElementById('tutorOutput');
  target.value = raw;
  target.removeAttribute('readonly');
  latestOutputId = 'tutorOutput';
  target.scrollIntoView({ behavior: 'smooth' });
}

function copyText(elementId) {
  const textArea = document.getElementById(elementId);
  textArea.select();
  textArea.setSelectionRange(0, 999999);
  navigator.clipboard.writeText(textArea.value);
  alert('Copied!');
}

function saveExplanation(sourceId, btn) {
  const text = document.getElementById(sourceId).value.trim();
  if (!text) return;

  const labelMap = { tutorOutput: 'response', followUpOutput: 'followup' };
  const label = labelMap[sourceId] || 'response';
  const dateStr = getDateStamp();
  const timeStr = getTimeStamp();
  const uid = Math.random().toString(36).slice(2, 6);

  downloadText(text, 'kidtutor-' + label + '-' + dateStr + '-' + timeStr + '-' + uid + '.txt');

  btn.textContent = 'Saved';
  btn.classList.add('saved');
}

function saveTutorSession() {
  const payload = getTutorPayload();
  const first = document.getElementById('tutorOutput').value.trim();
  const followUp = document.getElementById('followUpOutput').value.trim();

  if (!payload.homeworkText && !first) {
    alert('No Homework Helper session to save yet.');
    return;
  }

  const sep = '====================================';
  let content = sep + '\n';
  content += '=== HOMEWORK HELPER SESSION ===\n';
  content += sep + '\n';
  content += 'Date: ' + new Date().toLocaleString() + '\n';
  content += 'Mode: ' + getModeLabel(payload.mode) + '\n';
  content += 'Parent/helper: ' + (payload.parentName || '(not provided)') + '\n';
  content += 'Child: ' + (payload.childName || '(not provided)') + '\n';
  content += 'Grade level: ' + (payload.gradeLevel || '(not provided)') + '\n';
  content += 'Subject: ' + (payload.subject || '(not provided)') + '\n';

  content += '\n' + sep + '\n';
  content += '=== HOMEWORK / PROBLEM TEXT ===\n';
  content += sep + '\n';
  content += (payload.homeworkText || '(none)') + '\n';

  content += '\n' + sep + '\n';
  content += '=== STRUGGLE NOTES ===\n';
  content += sep + '\n';
  content += (payload.struggleText || '(none)') + '\n';

  content += '\n' + sep + '\n';
  content += '=== HOMEWORK HELPER RESPONSE ===\n';
  content += sep + '\n';
  content += (first || '(none)') + '\n';

  if (followUp) {
    content += '\n' + sep + '\n';
    content += '=== FOLLOW-UP RESPONSE ===\n';
    content += sep + '\n';
    content += followUp + '\n';
  }

  if (feedbackLog.length > 0) {
    content += '\n' + sep + '\n';
    content += '=== QUICK FEEDBACK ===\n';
    content += sep + '\n';
    feedbackLog.forEach((entry, i) => {
      content += '\nEntry ' + (i + 1) + ' - ' + entry.timestamp + '\n';
      content += 'Helpful? ' + entry.q1 + '\n';
      content += 'What would help? ' + entry.q2 + '\n';
      content += 'How it felt: ' + entry.q3 + '\n';
      if (entry.comment) content += 'Note: ' + entry.comment + '\n';
    });
  }

  downloadText(content, 'HomeworkHelper_Session_' + getDateStamp() + '.txt');
}

function downloadFeedback() {
  if (feedbackLog.length === 0) {
    alert('No feedback saved yet.');
    return;
  }

  let content = 'HOMEWORK HELPER TESTER FEEDBACK\n';
  content += 'Exported: ' + new Date().toLocaleString() + '\n';
  content += 'Total entries: ' + feedbackLog.length + '\n\n';

  feedbackLog.forEach((entry, i) => {
    content += '---\n';
    content += 'Entry ' + (i + 1) + ' - ' + entry.timestamp + '\n';
    content += 'Helpful? ' + entry.q1 + '\n';
    content += 'What would help? ' + entry.q2 + '\n';
    content += 'How it felt: ' + entry.q3 + '\n';
    if (entry.comment) content += 'Note: ' + entry.comment + '\n';
  });

  downloadText(content, 'HomeworkHelper_Feedback_' + getDateStamp() + '.txt');
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
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
  const comment = document.getElementById('feedbackComment').value.trim();

  if (!q1 && !q2 && !q3) {
    alert('Please answer at least one question before saving.');
    return;
  }

  const payload = getTutorPayload();
  const entry = {
    timestamp: new Date().toLocaleString(),
    mode: getModeLabel(payload.mode),
    parentName: payload.parentName,
    childName: payload.childName,
    gradeLevel: payload.gradeLevel,
    subject: payload.subject,
    homeworkText: payload.homeworkText,
    struggleText: payload.struggleText,
    response: document.getElementById('tutorOutput').value.trim(),
    followUpResponse: document.getElementById('followUpOutput').value.trim(),
    q1: q1 || '-',
    q2: q2 || '-',
    q3: q3 || '-',
    comment
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
  document.getElementById('feedbackComment').value = '';
}

function renderFeedbackLog() {
  const log = document.getElementById('feedbackLog');
  if (feedbackLog.length === 0) {
    log.innerHTML = '';
    return;
  }

  log.innerHTML = feedbackLog.map(entry => `
    <div class="feedback-log-entry">
      <div class="feedback-log-time">${entry.timestamp}</div>
      <div><strong>Helpful?</strong> ${entry.q1}</div>
      <div><strong>What would help?</strong> ${entry.q2}</div>
      <div><strong>How it felt:</strong> ${entry.q3}</div>
      ${entry.comment ? `<div><strong>Note:</strong> ${entry.comment}</div>` : ''}
    </div>
  `).join('');
}

function toggleDevMode() {
  const container = document.getElementById('devModeContainer');
  const btn = document.getElementById('devToggleBtn');
  if (container.style.display === 'none') {
    container.style.display = 'block';
    btn.textContent = 'Hide Developer Mode';
  } else {
    container.style.display = 'none';
    btn.textContent = 'Show Developer Mode';
  }
}

function resetApp() {
  clearSessionState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetAllSettings() {
  const confirmed = confirm(
    'Switch to a different student and clear current setup information? This will clear names, grade, subject selections, custom subjects, and current assignment responses.'
  );

  if (!confirmed) {
    return;
  }

  document.getElementById('parentName').value = '';
  document.getElementById('childName').value = '';
  document.getElementById('gradeLevel').selectedIndex = 0;
  document.getElementById('subjectSelect').selectedIndex = 0;
  document.getElementById('customSubject').value = '';
  document.querySelector('input[name="mode"][value="parent-guide"]').checked = true;
  clearSessionState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearSessionState() {
  document.getElementById('homeworkText').value = '';
  document.getElementById('struggleText').value = '';
  document.getElementById('tutorOutput').value = '';
  document.getElementById('followUpOutput').value = '';
  document.getElementById('tutorRequest').value = '';
  document.getElementById('claudeAnswer').value = '';
  feedbackLog = [];
  feedbackSelections = { q1: null, q2: null, q3: null };
  latestOutputId = 'tutorOutput';
  document.querySelectorAll('.feedback-option-btn').forEach(btn => btn.classList.remove('selected'));
  document.getElementById('feedbackComment').value = '';
  ['tutorOutput', 'followUpOutput'].forEach(id => {
    const btn = document.getElementById('saveBtn_' + id);
    if (btn) {
      btn.textContent = 'Save Response';
      btn.classList.remove('saved');
    }
  });
  renderFeedbackLog();
}

function getModeLabel(mode) {
  return mode === 'kid-practice' ? 'Student Practice' : 'Parent Guide';
}

function getDateStamp() {
  const today = new Date();
  return today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
}

function getTimeStamp() {
  const today = new Date();
  return String(today.getHours()).padStart(2, '0') +
    String(today.getMinutes()).padStart(2, '0') +
    String(today.getSeconds()).padStart(2, '0');
}

const homeworkTextarea = document.getElementById('homeworkText');
homeworkTextarea.addEventListener('blur', cleanHomeworkTextarea);
homeworkTextarea.addEventListener('paste', () => {
  setTimeout(cleanHomeworkTextarea, 0);
});
