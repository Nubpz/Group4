# Therapy Appointment Scheduler - Full Stack

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Dependencies](#dependencies)
- [File Structure](#file-structure)
- [Default Credentials](#default-credentials)
- [Installation and Setup](#installation-and-setup)
- [Pulling Latest Changes](#pulling-latest-changes)
- [Running the Application](#running-the-application)
- [Future Enhancements](#future-enhancements)

---

## Project Overview

### Introduction
This project is a web-based **Therapy Appointment Scheduler** designed for multiple user roles:
- **Parents** who manage appointments for their children,
- **Students** who schedule or view their sessions,
- **Doctors** (or Therapists/Tutors) who set availability and manage bookings,
- **Admin** who has elevated privileges for system management.

The application includes:
- A **role-based login system** with secure authentication using JWT tokens.
- A **responsive UI** with real-time validations including email format checking and password visibility toggles.
- A clean, modern, and minimalistic design.

---

## Features

### Role-Based Authentication
- **Registration & Login:**  
  Users register by providing their email (as the username), password, and role (Parent, Therapist/Tutor, or Student). The admin account is preset in the database.
- **Secure Authentication:**  
  Passwords are hashed using bcrypt and JWT tokens are generated upon successful login.
- **Role-Based Navigation:**  
  After login, users are redirected to their respective dashboards based on their role (Parent, Doctor/ Therapist, Student, or Admin).

### User-Friendly Interface
- **Email Format Validation:**  
  The frontend validates the email format (except for the admin user) to ensure valid entries.
- **Password Visibility Toggle:**  
  An eye icon allows users to toggle password visibility while typing.
- **Real-Time Feedback:**  
  Error and success messages are displayed instantly during form submission.

---

## Dependencies

### Backend (Flask):
- **Flask** – Lightweight web framework
- **Flask-CORS** – For handling cross-origin requests
- **mysql-connector-python** – MySQL database connector
- **Flask-Bcrypt** – For secure password hashing
- **Flask-JWT-Extended** – For JWT-based authentication

### Frontend (React):
- **React** – UI library
- **react-router-dom** – Routing
- **jwt-decode** – To decode JWT tokens
- **axios** or **fetch API** – For HTTP requests (our example uses fetch)

_All these libraries are open source._

---

## File Structure

An example file structure for the project:

```
therapy_clinic_project/
├── backend/
│   ├── app.py
│   ├── requirements.txt
├── frontend/
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── ParentPage.js
│   │   │   ├── StudentPage.js
│   │   │   ├── DoctorPage.js
│   │   │   └── AdminPage.js
│   │   └── design/
│   │       └── authPage.css
├── database/
│   ├── schema.sql
└── README.md
```

---

## Default Credentials

| Role    | Username              | Password                        |
|---------|-----------------------|---------------------------------|
| Parent  | *Preset in DB*        | *Preset in DB*                  |
| Student | *Preset in DB*        | *Preset in DB*                  |
| Doctor  | *Preset in DB*        | *Preset in DB*                  |
| Admin   | admin                 | admin123 (or your secure preset)|

*Note:* The admin account is pre-configured in the database with a secure, hashed password.

---

## Installation and Setup

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v14 or above)
- npm (comes with Node.js)
- [Python 3](https://www.python.org/)
- [MySQL](https://dev.mysql.com/downloads/mysql/)
- Git

### **Steps to Set Up the Project**

#### **Database Setup**

1. **Start MySQL and create the database:**
   ```bash
   mysql -u root -p
   ```
   Inside MySQL shell, run:
   ```sql
   CREATE DATABASE therapy_clinic;
   USE therapy_clinic;
   ```
   
2. **Run the provided schema file:**
   ```bash
   mysql -u root -p therapy_clinic < database/schema.sql
   ```

#### **Backend Setup**

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/nubpz/Group4.git
   cd Group4/backend
   ```

2. **Create and Activate a Virtual Environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Backend Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

#### **Frontend Setup**

1. **Navigate to the Frontend Folder:**
   ```bash
   cd ../frontend
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   npm install react react-dom react-router-dom jwt-decode axios
   ```

---

## Running the Application

1. **Start the Backend Server:**
   ```bash
   cd backend
   python3 app.py
   ```

2. **Start the Frontend Server:**
   ```bash
   cd ../frontend
   npm start
   ```

3. **Access the Application:**
   Open your browser and navigate to `http://localhost:3000`, then log in using the default credentials.

---

## Future Enhancements

- **Enhanced Form Validation:**  
  Improve both client- and server-side validations (e.g., stronger password policies, refined email regex).
- **Admin Dashboard:**  
  Develop a comprehensive admin panel for managing users, appointments, and system settings.
- **Appointment Management:**  
  Implement full appointment scheduling, cancellation, and rescheduling.
- **Real-Time Notifications:**  
  Add SMS or email notifications for appointment reminders.
- **UI/UX Improvements:**  
  Further refine design, animations, and responsiveness.

---

This README now includes the **database activation steps** and schema file reference while keeping all dependencies and functionalities intact. Let me know if you need any further modifications! 🚀

