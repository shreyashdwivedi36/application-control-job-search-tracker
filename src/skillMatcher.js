function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesTerm(text, term) {
  const escaped = escapeRegex(normalise(term));
  // A full stop can be part of a skill (Node.js) but can also end a sentence.
  return escaped && new RegExp(`(^|[^a-z0-9+#.])${escaped}(?=$|[^a-z0-9+#.]|\\.(?=$|[^a-z0-9]))`, 'i').test(text);
}

function matchesSkill(text, skill) {
  return [skill.name, ...(skill.aliases || [])].some((term) => matchesTerm(text, term));
}

function candidateHasSkill(candidateSkills, skill) {
  const terms = [skill.name, ...(skill.aliases || [])].map(normalise);
  return candidateSkills.some((candidate) => terms.includes(normalise(candidate)));
}

function matchSkills(description, skills, candidateSkills = []) {
  const text = normalise(description);
  const requiredSkills = skills.filter((skill) => matchesSkill(text, skill));
  const matchedSkills = requiredSkills
    .filter((skill) => candidateHasSkill(candidateSkills, skill))
    .map((skill) => skill.name);
  const missingSkills = requiredSkills
    .filter((skill) => !candidateHasSkill(candidateSkills, skill))
    .map((skill) => skill.name);
  const matchScore = requiredSkills.length === 0
    ? 0
    : Math.round((matchedSkills.length / requiredSkills.length) * 100);

  return {
    requiredSkills: requiredSkills.map((skill) => skill.name),
    matchedSkills,
    missingSkills,
    matchScore
  };
}

module.exports = { matchSkills, matchesSkill, candidateHasSkill };
