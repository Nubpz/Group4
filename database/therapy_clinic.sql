-- Create the therapy_clinic database if it doesn't exist
CREATE DATABASE IF NOT EXISTS therapy_clinic;
USE therapy_clinic;

-- Create the users table for the Therapy Clinic authentication system
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(200) NOT NULL,
  role VARCHAR(50) NOT NULL,
  license_number VARCHAR(50),
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
