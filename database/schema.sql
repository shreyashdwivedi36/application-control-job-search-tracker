CREATE DATABASE IF NOT EXISTS application_control;
USE application_control;

CREATE TABLE IF NOT EXISTS skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  aliases JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
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
);

INSERT IGNORE INTO skills (name, aliases) VALUES
  ('JavaScript', JSON_ARRAY('javascript', 'js', 'ecmascript')),
  ('TypeScript', JSON_ARRAY('typescript', 'ts')),
  ('Node.js', JSON_ARRAY('node.js', 'nodejs', 'node')),
  ('Express', JSON_ARRAY('express', 'express.js')),
  ('React', JSON_ARRAY('react', 'reactjs', 'react.js')),
  ('SQL', JSON_ARRAY('sql', 'mysql', 'postgresql', 'postgres')),
  ('Python', JSON_ARRAY('python')),
  ('Docker', JSON_ARRAY('docker', 'containers')),
  ('AWS', JSON_ARRAY('aws', 'amazon web services')),
  ('Git', JSON_ARRAY('git', 'github', 'gitlab'));
