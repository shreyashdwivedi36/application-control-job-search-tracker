const state = { applications: [], editingId: null };
const $ = (selector, root = document) => root.querySelector(selector);

async function api(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Something went wrong. Please try again.');
  }
  return response.status === 204 ? null : response.json();
}

function profileSkills() {
  return $('#profile-skills').value.split(',').map((skill) => skill.trim()).filter(Boolean);
}

function showMessage(message, type = 'success') {
  const element = $('#message');
  element.textContent = message;
  element.className = `message ${type}`;
  element.hidden = false;
}

function tag(text, className) {
  const element = document.createElement('span');
  element.className = `tag ${className}`;
  element.textContent = text;
  return element;
}

function renderAnalysis(analysis) {
  const target = $('#analysis');
  target.replaceChildren();
  if (!analysis.requiredSkills.length) {
    target.textContent = 'No tracked skills were found in this description yet.';
    target.classList.add('empty-analysis');
    return;
  }
  target.classList.remove('empty-analysis');
  target.append(tag(`${analysis.matchScore}% match`, 'score'));
  analysis.matchedSkills.forEach((skill) => target.append(tag(skill, 'matched')));
  analysis.missingSkills.forEach((skill) => target.append(tag(`Gap: ${skill}`, 'missing')));
}

function renderApplications() {
  const target = $('#applications');
  const query = $('#search').value.trim().toLowerCase();
  const results = state.applications.filter((application) => `${application.company} ${application.role_title}`.toLowerCase().includes(query));
  $('#application-count').textContent = state.applications.length;
  target.replaceChildren();
  if (!results.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state muted';
    empty.textContent = query ? 'No applications match that search.' : 'Your applications will appear here.';
    target.append(empty);
    return;
  }
  const template = $('#application-template');
  results.forEach((application) => {
    const card = template.content.firstElementChild.cloneNode(true);
    $('h3', card).textContent = application.company;
    $('.role', card).textContent = application.role_title;
    $('.date', card).textContent = application.application_date
  ? `Applied ${typeof application.application_date === 'string'
      ? application.application_date.split('T')[0]
      : application.application_date.toLocaleDateString()}`
  : 'No date recorded';
    const status = $('.status', card); status.textContent = application.status; status.classList.add(`status-${application.status}`);
    $('.score', card).textContent = `${application.match_score}% match`;
    $('.missing', card).textContent = application.missing_skills.length ? `Gaps: ${application.missing_skills.join(', ')}` : 'No detected gaps';
    $('.edit', card).dataset.edit = application.id;
    $('.delete', card).dataset.delete = application.id;
    target.append(card);
  });
}

function renderStats(stats) {
  const outcomes = $('#outcomes'); outcomes.replaceChildren();
  if (!stats.outcomes.length) outcomes.innerHTML = '<p class="muted">Add applications to see your outcome trends.</p>';
  stats.outcomes.forEach((outcome) => {
    const line = document.createElement('div'); line.className = 'outcome';
    const header = document.createElement('p');
    const label = document.createElement('strong'); label.textContent = outcome.status;
    const value = document.createElement('span'); value.textContent = `${outcome.applications} application${outcome.applications === 1 ? '' : 's'} · ${outcome.averageMatchScore || 0}% avg match`;
    header.append(label, value);
    const bar = document.createElement('div'); bar.className = 'bar';
    const fill = document.createElement('i'); fill.style.width = `${outcome.averageMatchScore || 0}%`; bar.append(fill);
    line.append(header, bar); outcomes.append(line);
  });
  const gaps = $('#gaps'); gaps.replaceChildren();
  if (!stats.commonUnansweredGaps.length) gaps.innerHTML = '<p class="muted">No recurring gaps yet.</p>';
  stats.commonUnansweredGaps.slice(0, 6).forEach((gap) => {
    const row = document.createElement('p'); row.className = 'gap-row'; row.append(tag(gap.skill, 'missing'));
    const count = document.createElement('span'); count.className = 'muted'; count.textContent = `${gap.count} occurrence${gap.count === 1 ? '' : 's'}`; row.append(count); gaps.append(row);
  });
}

async function refresh() {
  const [applications, stats] = await Promise.all([api('/api/applications'), api('/api/stats')]);
  state.applications = applications;
  renderApplications(); renderStats(stats);
}

function resetForm() {
  state.editingId = null;
  $('#application-form').reset();
  $('#form-title').textContent = 'Add an application';
  $('#save-button').textContent = 'Save application';
  $('#cancel-edit').hidden = true;
  $('#analysis').replaceChildren();
}

function beginEdit(id) {
  const application = state.applications.find((item) => item.id === Number(id));
  if (!application) return;
  state.editingId = application.id;
  const form = $('#application-form');
  form.company.value = application.company; form.roleTitle.value = application.role_title; form.status.value = application.status;
  form.applicationDate.value = application.application_date || ''; form.jobDescription.value = application.job_description || ''; form.notes.value = application.notes || '';
  $('#form-title').textContent = `Edit ${application.company}`; $('#save-button').textContent = 'Update application'; $('#cancel-edit').hidden = false;
  renderAnalysis({ requiredSkills: [...application.matched_skills, ...application.missing_skills], matchedSkills: application.matched_skills, missingSkills: application.missing_skills, matchScore: application.match_score });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initializeProfile() {
  $('#profile-skills').value = localStorage.getItem('application-control-profile-skills') || '';
  $('#profile-skills').addEventListener('change', () => {
    localStorage.setItem('application-control-profile-skills', $('#profile-skills').value);
    showMessage('Your skill profile has been saved in this browser.');
  });
}

$('#application-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  data.candidateSkills = profileSkills();
  try {
    const analysis = await api('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    renderAnalysis(analysis);
    const endpoint = state.editingId ? `/api/applications/${state.editingId}` : '/api/applications';
    await api(endpoint, { method: state.editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    showMessage(state.editingId ? 'Application updated.' : 'Application saved.'); resetForm(); await refresh();
  } catch (error) { showMessage(error.message, 'error'); }
});

$('#applications').addEventListener('click', async (event) => {
  if (event.target.dataset.edit) return beginEdit(event.target.dataset.edit);
  if (!event.target.dataset.delete || !window.confirm('Delete this application?')) return;
  try { await api(`/api/applications/${event.target.dataset.delete}`, { method: 'DELETE' }); showMessage('Application deleted.'); await refresh(); } catch (error) { showMessage(error.message, 'error'); }
});
$('#cancel-edit').addEventListener('click', resetForm);
$('#search').addEventListener('input', renderApplications);
initializeProfile();
refresh().catch((error) => showMessage(`Could not load your dashboard: ${error.message}`, 'error'));
