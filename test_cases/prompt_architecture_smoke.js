const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  buildPrompt,
  getPromptRouting,
  getGradeBand,
  getSubjectFamily,
  getTaskShape
} = require('../server');

const casesPath = path.join(__dirname, 'prompt_architecture_cases.json');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

function normalizeRequest(testCase) {
  return {
    mode: 'kid-practice',
    parentName: '',
    childName: 'Learner',
    gradeLevel: '5th grade',
    subject: 'Other',
    homeworkText: 'Practice this topic.',
    struggleText: '',
    previousAnswer: '',
    followUpType: '',
    followUpText: '',
    ...testCase.request
  };
}

for (const testCase of cases) {
  const request = normalizeRequest(testCase);
  const routing = getPromptRouting(request);
  const prompt = buildPrompt(request);

  assert.strictEqual(
    routing.gradeBand,
    testCase.expect.gradeBand,
    `${testCase.name}: grade band`
  );

  assert.strictEqual(
    routing.subjectFamily,
    testCase.expect.subjectFamily,
    `${testCase.name}: subject family`
  );

  assert.strictEqual(
    routing.taskShape,
    testCase.expect.taskShape,
    `${testCase.name}: task shape`
  );

  assert(
    prompt.includes('Instructional routing for this response only'),
    `${testCase.name}: missing routing block`
  );

  for (const expectedText of testCase.expect.includes || []) {
    assert(
      prompt.includes(expectedText),
      `${testCase.name}: expected prompt to include "${expectedText}"`
    );
  }

  for (const excludedText of testCase.expect.excludes || []) {
    assert(
      !prompt.includes(excludedText),
      `${testCase.name}: expected prompt to exclude "${excludedText}"`
    );
  }
}

assert.strictEqual(getGradeBand('Pre-K'), 'early-elementary');
assert.strictEqual(getGradeBand('5th grade'), 'upper-elementary');
assert.strictEqual(getGradeBand('8th grade'), 'middle-school');
assert.strictEqual(getGradeBand('GED / Adult Learning'), 'high-school-adult');

assert.strictEqual(getSubjectFamily('Algebra'), 'math');
assert.strictEqual(getSubjectFamily('Physics'), 'science');
assert.strictEqual(getSubjectFamily('ELA'), 'reading');
assert.strictEqual(getSubjectFamily('Essay Writing'), 'writing');
assert.strictEqual(getSubjectFamily('Civics'), 'social-studies');
assert.strictEqual(getSubjectFamily('Study Skills'), 'other');

assert.strictEqual(
  getTaskShape({
    subject: 'Math',
    homeworkText: 'Solve for x: 4x - 2 = 10',
    struggleText: '',
    followUpText: ''
  }),
  'procedural-equation'
);

console.log(`prompt architecture smoke passed (${cases.length} cases)`);
