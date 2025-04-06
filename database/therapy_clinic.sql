CREATE DATABASE IF NOT EXISTS therapy_clinic;
USE therapy_clinic;

-- ====================================
-- 1) User-Type Tables
-- ====================================

-- PARENTS table for users who are parents.
CREATE TABLE IF NOT EXISTS parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(200) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STUDENTS table for users who are students.
-- Includes a date_of_birth column to calculate age.
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(200) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  date_of_birth DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ADMINS table for admin users.
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(200) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- THERAPISTS table for therapist users.
-- Therapists must be verified by an admin (verified = FALSE by default).
CREATE TABLE IF NOT EXISTS therapists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(200) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  license_number VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  verified_by_admin_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (verified_by_admin_id) REFERENCES admins(id)
);

-- ====================================
-- 2) Bridging Tables for Many-to-Many Relationships
-- ====================================

-- Parent_Student: A bridging table so that one parent can have multiple students (children)
-- and one student can have multiple parents.
CREATE TABLE IF NOT EXISTS parent_student (
  parent_id INT NOT NULL,
  student_id INT NOT NULL,
  PRIMARY KEY (parent_id, student_id),
  FOREIGN KEY (parent_id) REFERENCES parents(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- (Optional) Therapist_Student: In case you want to directly model an assignment
-- between therapists and students outside of appointments.
CREATE TABLE IF NOT EXISTS therapist_student (
  therapist_id INT NOT NULL,
  student_id INT NOT NULL,
  PRIMARY KEY (therapist_id, student_id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- ====================================
-- 3) Appointments and Availability
-- ====================================

-- APPOINTMENTS table
-- Records therapy sessions between a student and a therapist.
-- For students who are minors, the parent who booked the appointment is recorded in booked_by_parent_id.
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  therapist_id INT NOT NULL,
  appointment_time DATETIME NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  booked_by_parent_id INT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id),
  FOREIGN KEY (booked_by_parent_id) REFERENCES parents(id)
);

-- AVAILABILITY table
-- Stores available time slots for therapists.
CREATE TABLE IF NOT EXISTS availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  therapist_id INT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE (therapist_id, date, start_time),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id)
);
