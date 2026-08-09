const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'application_control',
  waitForConnections: true,
  connectionLimit: 10
});

async function initializeDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    aliases JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company VARCHAR(150) NOT NULL,
    role_title VARCHAR(150) NOT NULL,
    status ENUM('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn') NOT NULL DEFAULT 'saved',
    job_description TEXT NULL,
    application_date DATE NULL,
    notes TEXT NULL,
    match_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
    matched_skills JSON NULL,
    missing_skills JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  const skills = [
    ['JavaScript', ['javascript', 'js', 'ecmascript']], ['TypeScript', ['typescript', 'ts']],
    ['Node.js', ['node.js', 'nodejs', 'node']], ['Express', ['express', 'express.js']],
    ['React', ['react', 'reactjs', 'react.js']], ['SQL', ['sql', 'mysql', 'postgresql', 'postgres']],
    ['Python', ['python']], ['Docker', ['docker', 'containers']], ['AWS', ['aws', 'amazon web services']],
    ['Git', ['git', 'github', 'gitlab']]
  ];
  await pool.query('INSERT IGNORE INTO skills (name, aliases) VALUES ?', [skills.map(([name, aliases]) => [name, JSON.stringify(aliases)])]);
}

module.exports = { pool, initializeDatabase };
