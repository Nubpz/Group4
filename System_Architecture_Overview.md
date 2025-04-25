# System Architecture Overview

## 1. System Architecture

### Three-Tier Architecture
The system follows a modern three-tier architecture pattern:

1. **Frontend Layer (React)**
   - **Purpose**: User interface and client-side logic
   - **Key Components**:
     * Component-based architecture
     * State management
     * Authentication handling
     * API communication
   - **Key Features**:
     * Responsive design
     * Role-based access control
     * Real-time updates
     * Form validation

2. **Backend Layer (Flask)**
   - **Purpose**: Business logic and API services
   - **Key Components**:
     * RESTful API
     * Authentication service
     * Business logic
     * Data validation
   - **Key Features**:
     * Modular design
     * Secure authentication
     * Error handling
     * Data processing

3. **Database Layer (MySQL)**
   - **Purpose**: Data persistence and management
   - **Key Components**:
     * User data
     * Appointment data
     * Profile information
     * System logs
   - **Key Features**:
     * Data integrity
     * Performance optimization
     * Backup and recovery
     * Access control

## 2. Database Design

### Core Tables
1. **Users**
   - Stores authentication information
   - Manages user roles
   - Tracks user activity

2. **Therapists**
   - Stores professional information
   - Manages availability
   - Tracks qualifications

3. **Appointments**
   - Manages scheduling
   - Tracks status
   - Stores session details

### Key Relationships
- Users to Therapists (One-to-One)
- Users to Students (One-to-One)
- Parents to Students (One-to-Many)
- Therapists to Appointments (One-to-Many)
- Students to Appointments (One-to-Many)

## 3. Security Architecture

### Authentication
- JWT-based authentication
- Role-based access control
- Secure password storage
- Session management

### Authorization
- Role-based permissions
- Resource-level access control
- API endpoint protection
- Data access restrictions

### Security Measures
- HTTPS enforcement
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## 4. System Integration

### Frontend-Backend Communication
- RESTful API endpoints
- JWT token management
- Error handling
- Data validation

### Data Flow
1. **Authentication Flow**
   - User login
   - Token generation
   - Session management
   - Access control

2. **Appointment Flow**
   - Availability check
   - Booking process
   - Status updates
   - Notifications

3. **Profile Management**
   - Data retrieval
   - Updates
   - Validation
   - Storage

## 5. Performance Considerations

### Optimization Strategies
- Database indexing
- Query optimization
- Caching
- Connection pooling

### Monitoring
- Performance metrics
- Error tracking
- Usage analytics
- System health

### Scalability
- Horizontal scaling
- Load balancing
- Database replication
- Cache distribution

## 6. Implementation Examples

### 1. JSON Request/Response Handling
```python
# Example from auth_routes.py
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    # Response format
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role
        }
    }), 200
```

### 2. Error Handling for API Endpoints
```python
# Example from app.py
@app.errorhandler(Exception)
def handle_error(error):
    if isinstance(error, ValidationError):
        return jsonify({
            'error': str(error),
            'status': 'validation_error'
        }), 400
    elif isinstance(error, UnauthorizedError):
        return jsonify({
            'error': 'Unauthorized access',
            'status': 'unauthorized'
        }), 401
    else:
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500
```

### 3. Data Validation
```python
# Example from utils/validation.py
def validate_appointment_data(data):
    required_fields = ['therapist_id', 'student_id', 'appointment_date', 'duration']
    for field in required_fields:
        if field not in data:
            raise ValidationError(f'Missing required field: {field}')
    
    # Validate date format
    try:
        datetime.strptime(data['appointment_date'], '%Y-%m-%d %H:%M:%S')
    except ValueError:
        raise ValidationError('Invalid date format')
    
    # Validate duration
    if not isinstance(data['duration'], int) or data['duration'] <= 0:
        raise ValidationError('Invalid duration')
```

### 4. JWT Session Management
```python
# Example from utils/auth.py
def generate_tokens(user_id, role):
    access_token = create_access_token(
        identity=user_id,
        additional_claims={'role': role}
    )
    refresh_token = create_refresh_token(identity=user_id)
    return {
        'access_token': access_token,
        'refresh_token': refresh_token
    }

# Token refresh endpoint
@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_tokens = generate_tokens(current_user.id, current_user.role)
    return jsonify(new_tokens), 200
```

### 5. Protected Route Example
```python
# Example from therapist_routes.py
@app.route('/api/therapists/profile', methods=['GET'])
@jwt_required()
@role_required('therapist')
def get_therapist_profile():
    current_user = get_jwt_identity()
    therapist = Therapist.query.filter_by(user_id=current_user.id).first()
    
    if not therapist:
        return jsonify({'error': 'Therapist profile not found'}), 404
        
    return jsonify({
        'id': therapist.id,
        'name': f"{therapist.first_name} {therapist.last_name}",
        'specialization': therapist.specialization
    }), 200
```

### 6. Database Operation with Validation
```python
# Example from appointment_routes.py
@app.route('/api/appointments', methods=['POST'])
@jwt_required()
def create_appointment():
    try:
        data = request.get_json()
        validate_appointment_data(data)
        
        # Check therapist availability
        existing = Appointment.query.filter(
            Appointment.therapist_id == data['therapist_id'],
            Appointment.appointment_date == data['appointment_date'],
            Appointment.status == 'scheduled'
        ).first()
        
        if existing:
            return jsonify({'error': 'Time slot already booked'}), 400
            
        # Create appointment
        appointment = Appointment(**data)
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