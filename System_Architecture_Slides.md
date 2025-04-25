# System Architecture Documentation

## 1. System Architecture Overview

### High-Level Architecture
- **Frontend**: React-based web application
  - Components-based architecture
  - State management using React Context
  - Responsive design with CSS modules
  - JWT-based authentication

- **Backend**: Flask REST API
  - Modular route structure
  - MySQL database integration
  - JWT authentication middleware
  - Role-based access control

- **Database**: MySQL
  - Relational database design
  - Normalized schema
  - Stored procedures for complex operations

### System Components
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │  Database   │
│  (React)    │◄───►│  (Flask)    │◄───►│  (MySQL)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 2. Database Architecture

### Database Schema
```sql
-- Users Table (Base for all user types)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'therapist', 'parent', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Therapists Table
CREATE TABLE therapists (
    therapist_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(255),
    qualification VARCHAR(255),
    experience_years INT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Parents Table
CREATE TABLE parents (
    parent_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Students Table
CREATE TABLE students (
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    parent_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    grade VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (parent_id) REFERENCES parents(parent_id)
);

-- Appointments Table
CREATE TABLE appointments (
    appointment_id INT PRIMARY KEY AUTO_INCREMENT,
    therapist_id INT,
    student_id INT,
    parent_id INT,
    appointment_date DATETIME NOT NULL,
    duration INT NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES therapists(therapist_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (parent_id) REFERENCES parents(parent_id)
);
```

### Key Relationships
- One-to-One: Users to Therapists/Parents/Students
- One-to-Many: Parents to Students
- Many-to-Many: Therapists to Students (through Appointments)

## 3. Security Architecture

### Authentication System
- **JWT Implementation**
  ```python
  # JWT Configuration
  app.config['JWT_SECRET_KEY'] = 'your-secret-key'
  app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
  ```

- **Token Structure**
  ```json
  {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
  ```

### Authorization Levels
1. **Admin**
   - Full system access
   - User management
   - System configuration

2. **Therapist**
   - View own profile
   - Manage appointments
   - View assigned students

3. **Parent**
   - View own profile
   - Manage child's appointments
   - View child's progress

4. **Student**
   - View own profile
   - View appointments
   - Limited access to system features

### Security Measures
1. **Password Security**
   - Bcrypt hashing
   - Salt generation
   - Minimum password requirements

2. **API Security**
   - HTTPS enforcement
   - CORS configuration
   - Rate limiting
   - Input validation

3. **Data Protection**
   - SQL injection prevention
   - XSS protection
   - CSRF tokens
   - Secure session management

## 4. Backend Architecture

### Route Structure
```
backend/
├── app.py                 # Main application file
├── config.py             # Configuration settings
├── auth_routes.py        # Authentication endpoints
├── admin_routes.py       # Admin-specific endpoints
├── therapist_routes.py   # Therapist-specific endpoints
├── parent_routes.py      # Parent-specific endpoints
└── student_routes.py     # Student-specific endpoints
```

### Key Components
1. **Database Connection**
   ```python
   def get_db_connection():
       return mysql.connector.connect(
           host=app.config['MYSQL_HOST'],
           user=app.config['MYSQL_USER'],
           password=app.config['MYSQL_PASSWORD'],
           database=app.config['MYSQL_DB']
       )
   ```

2. **Error Handling**
   ```python
   @app.errorhandler(Exception)
   def handle_error(error):
       return jsonify({
           'error': str(error),
           'status': 'error'
       }), 500
   ```

3. **Request Validation**
   ```python
   def validate_request_data(data, required_fields):
       for field in required_fields:
           if field not in data:
               raise ValueError(f"Missing required field: {field}")
   ```

### API Endpoints
1. **Authentication**
   - POST /api/auth/login
   - POST /api/auth/register
   - POST /api/auth/refresh

2. **User Management**
   - GET /api/users/profile
   - PUT /api/users/profile
   - GET /api/users/{role}

3. **Appointment Management**
   - GET /api/appointments
   - POST /api/appointments
   - PUT /api/appointments/{id}
   - DELETE /api/appointments/{id}

## 5. System Integration

### Frontend-Backend Communication
1. **API Calls**
   ```javascript
   // Example API call structure
   const api = axios.create({
       baseURL: 'http://localhost:3000/api',
       headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
       }
   });
   ```

2. **Error Handling**
   ```javascript
   // Global error handling
   api.interceptors.response.use(
       response => response,
       error => {
           if (error.response.status === 401) {
               // Handle unauthorized access
           }
           return Promise.reject(error);
       }
   );
   ```

### Data Flow
1. **User Authentication**
   ```
   Frontend -> Login Request -> Backend -> JWT Generation -> Frontend Storage
   ```

2. **Protected Resource Access**
   ```
   Frontend -> Request with JWT -> Backend -> Token Validation -> Resource Access
   ```

3. **Data Updates**
   ```
   Frontend -> Update Request -> Backend -> Database Update -> Response -> Frontend
   ```

## 6. Scalability and Performance

### Scaling Strategies
1. **Horizontal Scaling**
   - Multiple backend instances
   - Load balancing
   - Database replication

2. **Caching**
   - Redis for session storage
   - Query result caching
   - Static content caching

3. **Database Optimization**
   - Indexing strategy
   - Query optimization
   - Connection pooling

### Performance Monitoring
1. **Metrics**
   - Response times
   - Error rates
   - Database query performance
   - Resource utilization

2. **Logging**
   - Application logs
   - Error logs
   - Access logs
   - Audit logs 