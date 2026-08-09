const test = require('node:test');
const assert = require('node:assert/strict');
const { matchSkills } = require('../src/skillMatcher');

const skills = [
  { name: 'JavaScript', aliases: ['javascript', 'js'] },
  { name: 'Node.js', aliases: ['node.js', 'nodejs'] },
  { name: 'SQL', aliases: ['sql', 'mysql'] }
];

test('scores skills found in a description against candidate skills', () => {
  const result = matchSkills('Use JavaScript, Node.js and MySQL.', skills, ['JavaScript', 'Node.js']);
  assert.deepEqual(result.missingSkills, ['SQL']);
  assert.equal(result.matchScore, 67);
});

test('does not falsely match a skill inside another word', () => {
  const result = matchSkills('We value java developers.', skills, ['JavaScript']);
  assert.deepEqual(result.requiredSkills, []);
});

test('recognises a candidate skill supplied through an alias', () => {
  const result = matchSkills('Build APIs with Node.js and MySQL.', skills, ['nodejs', 'mysql']);
  assert.deepEqual(result.matchedSkills, ['Node.js', 'SQL']);
  assert.equal(result.matchScore, 100);
});

test('returns an empty requirement set when there are no known skills', () => {
  const result = matchSkills('Strong communication and curiosity required.', skills, ['JavaScript']);
  assert.deepEqual(result.requiredSkills, []);
  assert.equal(result.matchScore, 0);
});
