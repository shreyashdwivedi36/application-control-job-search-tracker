require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db');
const { matchSkills } = require('./skillMatcher');

const statuses = new Set(['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn']);
const jsonHeaders = { 'Content-Type': 'application/json' };
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function parseJson(value) {
  if (Array.isArray(value)) return value;
  try { return value ? JSON.parse(value) : []; } catch { return []; }
}

function stringValue(value, field, { required = false, max = 5000 } = {}) {
  if (value === undefined || value === null) {
    if (required) throw Object.assign(new Error(`${field} is required`), { status: 400 });
    return '';
  }
  if (typeof value !== 'string') throw Object.assign(new Error(`${field} must be text`), { status: 400 });
  const cleaned = value.trim();
  if (required && !cleaned) throw Object.assign(new Error(`${field} is required`), { status: 400 });
  if (cleaned.length > max) throw Object.assign(new Error(`${field} is too long`), { status: 400 });
  return cleaned;
}

async function getSkills() {
  const [skills] = await pool.query('SELECT id, name, aliases FROM skills ORDER BY name');
  return skills.map((skill) => ({ ...skill, aliases: parseJson(skill.aliases) }));
}

async function prepareApplication(payload = {}) {
  const company = stringValue(payload.company, 'company', { required: true, max: 150 });
  const roleTitle = stringValue(payload.roleTitle, 'roleTitle', { required: true, max: 150 });
  const status = payload.status || 'saved';
  const jobDescription = stringValue(payload.jobDescription, 'jobDescription', { max: 25000 });
  const notes = stringValue(payload.notes, 'notes', { max: 10000 });
  const applicationDate = payload.applicationDate || null;
  if (!statuses.has(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
  if (applicationDate && !/^\d{4}-\d{2}-\d{2}$/.test(applicationDate)) throw Object.assign(new Error('applicationDate must be YYYY-MM-DD'), { status: 400 });
  if (!Array.isArray(payload.candidateSkills) || payload.candidateSkills.some((skill) => typeof skill !== 'string')) {
    throw Object.assign(new Error('candidateSkills must be an array of text values'), { status: 400 });
  }
  const analysis = matchSkills(jobDescription, await getSkills(), payload.candidateSkills);
  return { company, roleTitle, status, jobDescription, applicationDate, notes, ...analysis };
}

function serializeApplication(row) {
  return { ...row, matched_skills: parseJson(row.matched_skills), missing_skills: parseJson(row.missing_skills) };
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/api/health', (_req, res) => res.status(200).set(jsonHeaders).json({ status: 'ok' }));
  app.get('/api/skills', asyncHandler(async (_req, res) => res.json(await getSkills())));
  app.post('/api/analyze', asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body.candidateSkills || [])) return res.status(400).json({ error: 'candidateSkills must be an array of text values' });
    res.json(matchSkills(stringValue(req.body.jobDescription || '', 'jobDescription', { max: 25000 }), await getSkills(), req.body.candidateSkills));
  }));
  app.get('/api/applications', asyncHandler(async (_req, res) => {
    const [rows] = await pool.query('SELECT * FROM applications ORDER BY updated_at DESC');
    res.json(rows.map(serializeApplication));
  }));
  app.post('/api/applications', asyncHandler(async (req, res) => {
    const data = await prepareApplication(req.body);
    const [result] = await pool.execute(
      'INSERT INTO applications (company, role_title, status, job_description, application_date, notes, match_score, matched_skills, missing_skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.company, data.roleTitle, data.status, data.jobDescription, data.applicationDate, data.notes, data.matchScore, JSON.stringify(data.matchedSkills), JSON.stringify(data.missingSkills)]
    );
    const [rows] = await pool.execute('SELECT * FROM applications WHERE id = ?', [result.insertId]);
    res.status(201).json(serializeApplication(rows[0]));
  }));
  app.put('/api/applications/:id', asyncHandler(async (req, res) => {
    const data = await prepareApplication(req.body);
    const [result] = await pool.execute(
      'UPDATE applications SET company=?, role_title=?, status=?, job_description=?, application_date=?, notes=?, match_score=?, matched_skills=?, missing_skills=? WHERE id=?',
      [data.company, data.roleTitle, data.status, data.jobDescription, data.applicationDate, data.notes, data.matchScore, JSON.stringify(data.matchedSkills), JSON.stringify(data.missingSkills), req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Application not found' });
    const [rows] = await pool.execute('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    res.json(serializeApplication(rows[0]));
  }));
  app.delete('/api/applications/:id', asyncHandler(async (req, res) => {
    const [result] = await pool.execute('DELETE FROM applications WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Application not found' });
    res.status(204).end();
  }));
  app.get('/api/stats', asyncHandler(async (_req, res) => {
    const [outcomes] = await pool.query('SELECT status, COUNT(*) AS applications, ROUND(AVG(match_score)) AS averageMatchScore FROM applications GROUP BY status');
    const [rows] = await pool.query("SELECT missing_skills, status FROM applications WHERE status IN ('applied', 'rejected')");
    const gaps = {};
    rows.forEach((row) => parseJson(row.missing_skills).forEach((skill) => { gaps[skill] = (gaps[skill] || 0) + 1; }));
    const commonUnansweredGaps = Object.entries(gaps).map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
    res.json({ outcomes, commonUnansweredGaps });
  }));
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, () => console.log(`Application Control running at http://localhost:${port}`));
}

module.exports = { createApp, prepareApplication, parseJson };
