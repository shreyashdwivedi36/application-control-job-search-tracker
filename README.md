# Application Control

Application Control is a full-stack job-search tracker that connects every saved role to the skills it asks for. It gives candidates a simple way to measure fit before applying, keep their pipeline organised, and identify skill gaps that recur in applications without a positive outcome.

## What it demonstrates

- Node.js and Express REST API design with validated create, update, list, and delete operations.
- MySQL data modelling for applications, skills, outcomes, and persisted analysis results.
- A deterministic skill-matching engine using aliases and safe word boundaries to avoid false matches.
- Outcome analytics that aggregate match scores and prioritise repeated gaps among applied and rejected roles.
- A responsive, dependency-free dashboard with editable records, search, local skill-profile persistence, and accessible status messages.

## Screens and workflows

1. Enter your technical skills once in **Your profile**; they stay in the current browser.
2. Add a company, role, status, job description, and optional notes.
3. The app extracts tracked skills, scores the match, and records matched and missing skills with the application.
4. Use the dashboard to review average match score by outcome and the gaps that occur most often in applied or rejected roles.

## Run locally

### With Docker (fastest)

Install Docker Desktop, then run:

```bash
docker compose up --build
```

Open `http://localhost:3000`. The MySQL schema and seed skills load automatically on the first run.

### With a local MySQL server

1. Run `database/schema.sql` in MySQL.
2. Copy `.env.example` to `.env`, then provide your local database credentials.
3. Install dependencies with `npm install`.
4. Run `npm start` and open `http://localhost:3000`.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Basic service health check |
| `GET` | `/api/skills` | List tracked skills and aliases |
| `POST` | `/api/analyze` | Score a job description without saving it |
| `GET`, `POST` | `/api/applications` | List or create applications |
| `PUT`, `DELETE` | `/api/applications/:id` | Update or delete one application |
| `GET` | `/api/stats` | Outcome averages and recurring gaps |

`POST /api/analyze` accepts a body like:

```json
{
  "jobDescription": "Node.js, JavaScript and MySQL required.",
  "candidateSkills": ["JavaScript", "Node.js"]
}
```

## Tests

Run `npm test`. The test suite covers match-score calculation, aliases, boundaries that prevent false positives, and descriptions without recognised skills.

## Deployment

The included `Dockerfile` is ready for any Docker-compatible host. Provision a managed MySQL 8 database, set `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` as environment variables, and run `database/schema.sql` once against that database. Do not commit a `.env` file or real credentials.

## Resume description

Built full-stack job-application tracker using Node.js, Express, MySQL, Docker, and REST APIs; developed a skill-matching engine that parses job descriptions, scores candidate fit, and surfaces recurring gaps across application outcomes.
