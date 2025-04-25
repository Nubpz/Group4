# Detailed System Architecture Documentation

## 1. System Architecture Overview

### High-Level Architecture
The system follows a three-tier architecture pattern:

1. **Frontend Layer (React)**
   - **Purpose**: User interface and client-side logic
   - **Key Features**:
     * Component-based architecture for modular development
     * React Context for global state management
     * CSS Modules for scoped styling
     * JWT-based authentication for secure access
   - **Implementation Details**:
     * Uses React Router for navigation
     * Implements protected routes for role-based access
     * Uses Axios for API communication
     * Implements form validation and error handling

2. **Backend Layer (Flask)**
   - **Purpose**: Business logic and API services
   - **Key Features**:
     * RESTful API design
     * Modular route structure
     * JWT authentication
     * Role-based access control
   - **Implementation Details**:
     * Uses Blueprint for route organization
     * Implements middleware for authentication
     * Uses SQLAlchemy for database operations
     * Implements comprehensive error handling

3. **Database Layer (MySQL)**
   - **Purpose**: Data persistence and management
   - **Key Features**:
     * Relational database design
     * Normalized schema
     * Optimized queries
     * Data integrity constraints
   - **Implementation Details**:
     * Uses foreign keys for relationships
     * Implements indexes for performance
     * Uses transactions for data consistency
     * Implements stored procedures for complex operations

### System Components Interaction
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │  Database   │
│  (React)    │◄───►│  (Flask)    │◄───►│  (MySQL)   │
└─────────────┘     └─────────────┘     └─────────────┘
     ▲                    ▲                    ▲
     │                    │                    │
     ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │   Server    │     │  Storage    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 2. Database Architecture

### Database Schema Design
The database follows a normalized design with the following key tables:

1. **Users Table**
   ```sql
   CREATE TABLE users (
       user_id INT PRIMARY KEY AUTO_INCREMENT,
       email VARCHAR(255) UNIQUE NOT NULL,
       password_hash VARCHAR(255) NOT NULL,
       role ENUM('admin', 'therapist', 'parent', 'student') NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```
   - **Purpose**: Central authentication and user management
   - **Key Features**:
     * Unique email constraint
     * Role-based access control
     * Timestamp tracking
   - **Relationships**:
     * One-to-one with therapist/parent/student profiles
     * Used for authentication across the system

2. **Therapists Table**
   ```sql
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
   ```
   - **Purpose**: Therapist profile management
   - **Key Features**:
     * Professional information storage
     * Active status tracking
     * User account linkage
   - **Relationships**:
     * One-to-one with users table
     * One-to-many with appointments

3. **Appointments Table**
   ```sql
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
   - **Purpose**: Appointment scheduling and management
   - **Key Features**:
     * Status tracking
     * Duration management
     * Notes storage
     * Timestamp tracking
   - **Relationships**:
     * Many-to-one with therapists
     * Many-to-one with students
     * Many-to-one with parents

### Database Optimization
1. **Indexing Strategy**
   ```sql
   -- Example indexes for common queries
   CREATE INDEX idx_appointments_date ON appointments(appointment_date);
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_therapists_active ON therapists(is_active);
   ```

2. **Query Optimization**
   ```sql
   -- Example optimized query
   SELECT t.*, u.email 
   FROM therapists t
   JOIN users u ON t.user_id = u.user_id
   WHERE t.is_active = TRUE
   AND t.specialization = 'Child Psychology';
   ```

3. **Connection Pooling**
   ```python
   # Example connection pool configuration
   pool_config = {
       'pool_name': 'mypool',
       'pool_size': 5,
       'pool_reset_session': True
   }
   ```

## 3. Security Architecture

### Authentication System
1. **JWT Implementation**
   ```python
   # JWT Configuration
   app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
   app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
   app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
   
   # Token Generation
   def generate_tokens(user_id, role):
       access_token = create_access_token(
           identity=user_id,
           additional_claims={'role': role}
       )
       refresh_token = create_refresh_token(identity=user_id)
       return {'access_token': access_token, 'refresh_token': refresh_token}
   ```

2. **Password Security**
   ```python
   # Password Hashing
   def hash_password(password):
       salt = bcrypt.gensalt()
       return bcrypt.hashpw(password.encode('utf-8'), salt)
   
   # Password Verification
   def verify_password(password, hashed):
       return bcrypt.checkpw(password.encode('utf-8'), hashed)
   ```

### Authorization System
1. **Role-Based Access Control**
   ```python
   # Role-based decorator
   def role_required(role):
       def wrapper(fn):
           @wraps(fn)
           def decorated_view(*args, **kwargs):
               if not current_user.role == role:
                   return jsonify({'error': 'Unauthorized'}), 403
               return fn(*args, **kwargs)
           return decorated_view
       return wrapper
   ```

2. **Endpoint Protection**
   ```python
   @app.route('/api/admin/users')
   @jwt_required()
   @role_required('admin')
   def get_users():
       # Admin-only endpoint implementation
       pass
   ```

### Security Measures
1. **API Security**
   ```python
   # CORS Configuration
   CORS(app, resources={
       r"/api/*": {
           "origins": ["https://yourdomain.com"],
           "methods": ["GET", "POST", "PUT", "DELETE"],
           "allow_headers": ["Content-Type", "Authorization"]
       }
   })
   
   # Rate Limiting
   limiter = Limiter(
       app,
       key_func=get_remote_address,
       default_limits=["200 per day", "50 per hour"]
   )
   ```

2. **Data Protection**
   ```python
   # Input Sanitization
   def sanitize_input(data):
       if isinstance(data, str):
           return html.escape(data)
       elif isinstance(data, dict):
           return {k: sanitize_input(v) for k, v in data.items()}
       elif isinstance(data, list):
           return [sanitize_input(item) for item in data]
       return data
   ```

## 4. Backend Implementation

### API Development
1. **Route Structure**
   ```
   backend/
   ├── app.py                 # Main application
   ├── config.py             # Configuration
   ├── models/               # Database models
   │   ├── user.py
   │   ├── therapist.py
   │   └── appointment.py
   ├── routes/               # API routes
   │   ├── auth.py
   │   ├── admin.py
   │   ├── therapist.py
   │   └── appointment.py
   └── utils/                # Utility functions
       ├── auth.py
       ├── validation.py
       └── error.py
   ```

2. **Endpoint Implementation**
   ```python
   # Example endpoint implementation
   @app.route('/api/appointments', methods=['POST'])
   @jwt_required()
   def create_appointment():
       try:
           data = request.get_json()
           validate_appointment_data(data)
           
           appointment = Appointment(
               therapist_id=data['therapist_id'],
               student_id=data['student_id'],
               appointment_date=data['appointment_date'],
               duration=data['duration']
           )
           
           db.session.add(appointment)
           db.session.commit()
           
           return jsonify({
               'message': 'Appointment created successfully',
               'appointment_id': appointment.id
           }), 201
           
       except ValidationError as e:
           return jsonify({'error': str(e)}), 400
       except Exception as e:
           db.session.rollback()
           return jsonify({'error': 'Internal server error'}), 500
   ```

### Business Logic
1. **Appointment Management**
   ```python
   # Appointment validation
   def validate_appointment_slot(therapist_id, date, duration):
       # Check therapist availability
       existing = Appointment.query.filter(
           Appointment.therapist_id == therapist_id,
           Appointment.appointment_date == date,
           Appointment.status == 'scheduled'
       ).first()
       
       if existing:
           raise ValidationError('Time slot already booked')
           
       # Check business hours
       if not is_business_hours(date):
           raise ValidationError('Appointment outside business hours')
   ```

2. **User Management**
   ```python
   # User registration
   def register_user(email, password, role):
       # Check email uniqueness
       if User.query.filter_by(email=email).first():
           raise ValidationError('Email already registered')
           
       # Create user
       user = User(
           email=email,
           password_hash=hash_password(password),
           role=role
       )
       
       db.session.add(user)
       db.session.commit()
       
       return user
   ```

## 5. System Integration

### Frontend-Backend Communication
1. **API Client Implementation**
   ```javascript
   // API client configuration
   const api = axios.create({
       baseURL: process.env.REACT_APP_API_URL,
       headers: {
           'Content-Type': 'application/json'
       }
   });
   
   // Request interceptor
   api.interceptors.request.use(config => {
       const token = localStorage.getItem('token');
       if (token) {
           config.headers.Authorization = `Bearer ${token}`;
       }
       return config;
   });
   
   // Response interceptor
   api.interceptors.response.use(
       response => response,
       error => {
           if (error.response.status === 401) {
               // Handle token expiration
               localStorage.removeItem('token');
               window.location.href = '/login';
           }
           return Promise.reject(error);
       }
   );
   ```

2. **Data Flow Implementation**
   ```javascript
   // Example data flow
   const fetchAppointments = async () => {
       try {
           const response = await api.get('/api/appointments');
           setAppointments(response.data);
       } catch (error) {
           setError(error.message);
       }
   };
   
   const createAppointment = async (data) => {
       try {
           const response = await api.post('/api/appointments', data);
           setAppointments(prev => [...prev, response.data]);
       } catch (error) {
           setError(error.message);
       }
   };
   ```

## 6. Performance Optimization

### Caching Strategy
1. **Redis Implementation**
   ```python
   # Redis configuration
   redis_client = Redis(
       host=app.config['REDIS_HOST'],
       port=app.config['REDIS_PORT'],
       db=0
   )
   
   # Cache decorator
   def cache(ttl=300):
       def decorator(f):
           @wraps(f)
           def decorated_function(*args, **kwargs):
               cache_key = f"{f.__name__}:{args}:{kwargs}"
               cached = redis_client.get(cache_key)
               if cached:
                   return json.loads(cached)
               result = f(*args, **kwargs)
               redis_client.setex(cache_key, ttl, json.dumps(result))
               return result
           return decorated_function
       return decorator
   ```

2. **Query Caching**
   ```python
   @app.route('/api/therapists')
   @cache(ttl=3600)
   def get_therapists():
       return Therapist.query.filter_by(is_active=True).all()
   ```

### Performance Monitoring
1. **Logging Configuration**
   ```python
   # Logging setup
   logging.basicConfig(
       level=logging.INFO,
       format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
       handlers=[
           logging.FileHandler('app.log'),
           logging.StreamHandler()
       ]
   )
   
   # Performance logging
   @app.before_request
   def start_timer():
       g.start = time.time()
   
   @app.after_request
   def log_request(response):
       duration = time.time() - g.start
       logging.info(f"Request took {duration} seconds")
       return response
   ```

2. **Metrics Collection**
   ```python
   # Prometheus metrics
   from prometheus_client import Counter, Histogram
   
   REQUEST_COUNT = Counter(
       'http_requests_total',
       'Total HTTP requests',
       ['method', 'endpoint', 'status']
   )
   
   REQUEST_LATENCY = Histogram(
       'http_request_duration_seconds',
       'HTTP request latency',
       ['method', 'endpoint']
   )
   ``` 