# Therapy Appointment Scheduler - Full Stack

## Table of Contents

* [Project Overview](#project-overview)
* [Features](#features)
* [Tech Stack](#tech-stack)
* [Dependencies](#dependencies)
* [Database Structure](#database-structure)
* [File Structure](#file-structure)
* [Default Credentials](#default-credentials)
* [Installation and Setup](#installation-and-setup)

  * [Prerequisites](#prerequisites)
  * [Database Setup](#database-setup)
  * [Backend Setup](#backend-setup)
  * [Frontend Setup](#frontend-setup)
* [Running the Application](#running-the-application)
* [Pulling Latest Changes](#pulling-latest-changes)
* [API Documentation](#api-documentation)
* [User Guides](#user-guides)
* [Contributing](#contributing)
* [Troubleshooting](#troubleshooting)

---

## Project Overview

### Introduction

This project is a comprehensive web-based **Therapy Appointment Scheduler** designed for multiple user roles within a therapy clinic or educational setting:

* **Parents:** Manage appointments for their children
* **Students:** Schedule or view their therapy sessions
* **Doctors/Therapists/Tutors:** Set availability and manage bookings
* **Admin:** System-wide management with elevated privileges

The application provides an intuitive interface for scheduling, managing, and tracking therapy appointments with a focus on user experience and security.

### Key Components

* Role-based authentication system with JWT token security
* Responsive UI with real-time form validations
* MySQL database for persistent data storage
* RESTful API backend built with Flask
* React frontend with modern, minimalistic design

---

## Features

### Role-Based Authentication

* **Registration & Login:**
  Users register with email (username), password, and role selection (Parent, Therapist/Tutor, or Student). Admin accounts are pre-configured in the database.
* **Secure Authentication:**
  Passwords are securely hashed using bcrypt with JWT tokens generated upon successful login.
* **Role-Based Navigation:**
  Users are redirected to role-specific dashboards after authentication.

### User-Friendly Interface

* **Responsive Design:**
  Fully responsive layout that works on desktop and mobile devices.
* **Form Validations:**
  Real-time email format validation and input field verification.
* **Password Security:**
  Password visibility toggle with strength indicators.
* **Interactive Feedback:**
  Instant error and success messages during form submission.

### Appointment Management

* **Scheduling Interface:**
  Intuitive calendar for booking appointments.
* **Availability Settings:**
  Therapists can set their available time slots.
* **Appointment Status:**
  Track pending, confirmed, and completed sessions.

---

## Tech Stack

* **Frontend:** React.js
* **Backend:** Flask (Python)
* **Database:** MySQL
* **Authentication:** JWT (JSON Web Tokens)
* **Styling:** CSS with responsive design principles

---

## Dependencies

### Backend (Flask)

* Flask (v2.0+) – Lightweight web framework
* Flask-CORS – For handling cross-origin requests
* mysql-connector-python – MySQL database connector
* Flask-Bcrypt – For secure password hashing
* Flask-JWT-Extended – For JWT-based authentication

### Frontend (React)

* React (v17+) – UI library
* react-router-dom (v6+) – Routing library
* jwt-decode – To decode JWT tokens
* Fetch API – For HTTP requests

*All libraries used are open source.*

---

## Database Structure

The database consists of the following tables:

```
+--------------------------+
| Tables_in_therapy_clinic |
+--------------------------+
| ADMIN                    |
| APPOINTMENTS             |
| AVAILABILITY             |
| GUARDIAN                 |
| PARENT                   |
| STUDENT                  |
| THERAPIST                |
| USERS                    |
+--------------------------+
```

**USERS Table Structure**

```
+---------+----------+----------+-------+---------------------+-----------+------------+
| USER_ID | username | password | ROLE  | created_at          | latitude  | longitude  |
+---------+----------+----------+-------+---------------------+-----------+------------+
```

The database is designed with a role-based structure where user authentication data is stored in the **USERS** table, while role-specific information is stored in separate tables (**ADMIN**, **PARENT**, **STUDENT**, **THERAPIST**). Appointment scheduling is managed through the **APPOINTMENTS** and **AVAILABILITY** tables, while the **GUARDIAN** table maintains relationships between parents and students.

---

## File Structure

The project's file structure is represented in an image within the repository. Please refer to the canvas image for the complete visual representation.

Key directories and files:

* **backend/** – Contains Flask server and API endpoints
* **frontend/** – Contains React components and UI
* **database/** – Contains SQL scripts for database setup

---

## Default Credentials

| Role  | Username | Password   |
| ----- | -------- | ---------- |
| Admin | Admin    | \*\*\*\*\* |

> *Note:* The admin account is pre-configured in the database with a secure, hashed password. For production use, change the default admin password immediately after first login.

---

## Installation and Setup

### Prerequisites

* Node.js (v14 or above)
* npm (comes with Node.js)
* Python 3 (v3.8 or above)
* MySQL (v8.0 or above)
* Git

### Database Setup

Start MySQL and create the database:

```bash
mysql -u root -p
```

Inside MySQL shell, create and use the database:

```sql
CREATE DATABASE therapy_clinic;
USE therapy_clinic;
```

Run the provided schema file:

```bash
mysql -u root -p therapy_clinic < database/schema.sql
```

Optionally, seed the database with initial data:

```bash
mysql -u root -p therapy_clinic < database/seed.sql
```

### Backend Setup

Clone the Repository:

```bash
git clone https://github.com/nubpz/Group4.git
cd Group4
```

Create and Activate a Virtual Environment:

```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

Navigate to Backend Directory:

```bash
cd backend
```

Install Backend Dependencies:

```bash
pip install -r requirements.txt
```

Configure Database Connection:

Edit the database connection parameters in `app.py` or create a `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=therapy_clinic
```

### Frontend Setup

Navigate to the Frontend Directory:

```bash
cd ../frontend
```

Install Frontend Dependencies:

```bash
npm install
```

Configure API Endpoint:

Create a `.env.local` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Running the Application

Start the Backend Server:

```bash
# Make sure you're in the backend directory with the virtual environment activated
cd backend
python app.py
```

The backend server will start on `http://localhost:5000`

Start the Frontend Development Server:

```bash
# In a new terminal window/tab
cd frontend
npm start
```

The frontend development server will start on `http://localhost:3000`

Access the Application:

Open your browser and navigate to `http://localhost:3000`
Log in using the default credentials mentioned above.

---

## Pulling Latest Changes

To update your local repository with the latest changes:

```bash
# Navigate to the project directory
cd Group4

# Fetch the latest changes
git fetch origin

# Pull the latest changes
git pull origin main

# Update dependencies (if needed)
cd backend
pip install -r requirements.txt

cd ../frontend
npm install
```

---

## API Documentation

### Authentication Endpoints

* `POST /api/auth/login` - User login
* `POST /api/auth/register` - User registration
* `GET /api/auth/validate` - Validate JWT token

### Parent Endpoints

* `GET /api/parents/appointments` - Get appointments for parent's children
* `POST /api/parents/appointments` - Schedule new appointment

### Student Endpoints

* `GET /api/students/appointments` - Get student's appointments
* `POST /api/students/appointments` - Schedule appointment

### Doctor/Therapist Endpoints

* `GET /api/doctors/availability` - Get doctor's availability
* `POST /api/doctors/availability` - Set availability
* `GET /api/doctors/appointments` - Get doctor's appointments

### Admin Endpoints

* `GET /api/admin/users` - Get all users
* `POST /api/admin/users` - Create new user
* `PUT /api/admin/users/:id` - Update user
* `DELETE /api/admin/users/:id` - Delete user

---

## User Guides

### For Parents

* Log in using your credentials
* View your children's appointments
* Schedule new appointments by selecting available time slots
* Manage existing appointments

### For Students

* Log in using your credentials
* View your scheduled appointments
* Request new appointments

### For Doctors/Therapists

* Log in using your credentials
* Set your availability for appointments
* View and manage scheduled appointments
* Update appointment status

### For Admins

* Log in using admin credentials
* Manage all users and appointments
* Configure system settings

---

## Contributing

* Fork the repository
* Create a feature branch: `git checkout -b feature-name`
* Commit your changes: `git commit -m 'Add some feature'`
* Push to the branch: `git push origin feature-name`
* Submit a pull request

---

## Troubleshooting

### Common Issues

**Backend server won't start:**

* Check if the correct Python version is installed
* Verify that all dependencies are installed
* Confirm database connection parameters are correct

**Frontend development server issues:**

* Clear npm cache: `npm cache clean --force`
* Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Database connection errors:**

* Verify MySQL service is running
* Check database credentials
* Ensure database and tables exist

### Getting Help

If you encounter any issues not covered in this troubleshooting section, please:

* Check existing GitHub issues
* Create a new issue with detailed information about the problem
* Contact the project maintainers at \[team email or contact method]

© 2023-2025 Therapy Appointment Scheduler Team - Group 4
