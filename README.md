# Therapy Appointment Scheduler - Full Stack

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [File Structure](#file-structure)
- [Default Credentials](#default-credentials)
- [Installation and Setup](#installation-and-setup)
- [Pulling Latest Changes](#pulling-latest-changes)
- [Running the Application](#running-the-application)
- [Future Enhancements](#future-enhancements)
- [License](#license)
- [Contact](#contact)

---

## Project Overview

### Introduction
This project is a web-based **Therapy Appointment Scheduler** designed to assist:
- **Parents** who can manage appointments for their children,
- **Students** who may also schedule or view their sessions,
- **Doctors** who can set availability and manage bookings,
- **Admin** who has elevated privileges to manage system-wide settings.

The application includes:
- A **role-based login system** with default credentials.
- Navigation using **React Router** to load specific dashboards.
- A clean, responsive UI that centers on simplicity and clarity.

---

## Features

### Role-Based Login
- Users may select **Parents**, **Students**, or **Doctors** from a dropdown.
- A special **Admin** login is handled with a hardcoded username and password.

### Appointment Booking
- Users can view and book therapy sessions based on available slots.
- Doctors can define their availability.
- Parents and students can cancel or reschedule appointments.

### User Management
- Admins can manage user accounts (create, edit, delete users).
- Role-based access ensures that each user type has specific permissions.

### Automated Reminders
- Email notifications for upcoming appointments.
- Users receive alerts for canceled or rescheduled sessions.

### Patient Records Management
- Doctors can maintain notes on therapy sessions.
- Patients and parents can review previous session details.

### Secure Authentication
- Integration with OAuth or JWT authentication for user security.
- Password hashing and role-based authentication system.

### Reporting and Analytics
- Admins can generate reports on appointment history.
- Insights into session durations and frequency of therapy sessions.

### Responsive UI
- A clean and accessible UI optimized for desktop and mobile views.

---

## File Structure

Below is the rough file directory structure :

![File Structure](./images/frontend.png)


## Default Credentials

| Role    | Username      | Password  |
|---------|-------------|----------|
| Parent  | "space"    | "space"|
| Student | "space"    | "space" |
| Doctor  | "space"    | "space" |
| Admin   | admin      | admin123 |

---

## Installation and Setup

### **Prerequisites**
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 14 or above)
- npm (installed with Node.js)
- [Git](https://git-scm.com/)

### **Steps to Set Up the Project**

#### **If React is Not Installed (Fresh Setup)**
If the frontend directory is missing or React is not set up, run:
```bash
npx create-react-app frontend
cd frontend
```
This will create a new React project and set up the necessary files.

1. **Clone the Repository**
   ```bash
   git clone https://github.com/nubpz/Group4.git
   cd Group4
   ```

2. **Install Dependencies for Frontend (Including React)**
   ```bash
   cd frontend
   npm install
   npm install react react-dom react-router-dom axios dotenv @mui/material @mui/icons-material
   ```
   ```bash
   cd frontend
   npm install
   ```

3. **Install Dependencies for Backend**
   ```bash
   cd ../backend
   npm install
   ```


---

## Pulling Latest Changes

1. **Navigate to the project directory**
   ```bash
   cd Group4
   ```

2. **Pull the latest code from GitHub** (Standard method)
   ```bash
   git pull origin main
   ```
   
   **Alternative (Using Rebase)**
   ```bash
   git pull origin main --rebase
   ```
   
   **What is Rebase?**
   Rebase ensures your local commits are applied on top of the latest remote commits, keeping a clean commit history. It avoids unnecessary merge commits and is useful when working collaboratively. If conflicts arise during rebase, resolve them using:
   ```bash
   git add .
   git rebase --continue
   ```
   If you prefer not to use rebase, simply stick with `git pull origin main`.

3. **Reinstall dependencies (if any new packages were added)**
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

1. **Navigate to the project directory**
   ```bash
   cd Group4
   ```

2. **Pull the latest code from GitHub**
   ```bash
   git pull origin main
   ```

3. **Reinstall dependencies (if any new packages were added)**
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

---

## Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm start
   ```
   The backend should now be running on `http://localhost:5000`.

2. **Start the Frontend Server**
   ```bash
   cd frontend
   npm start
   ```
   The frontend should now be running on `http://localhost:3000`.

3. **Access the Application**
   - Open `http://localhost:3000` in your browser.
   - Log in using the provided credentials.

---

## Future Enhancements
- Add a **real authentication system** instead of hardcoded credentials.
- Improve **form validation** with error handling.
- Implement **API calls** to fetch and store data in a backend database.
- Enhance UI design and animations.
- OTHER....
---





