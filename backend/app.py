from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
import datetime
import json

app = Flask(__name__)
CORS(app)

# Configure MySQL database connection
db_config = {
    'host': 'localhost',
    'user': 'root',               # Replace with your MySQL username
    'password': 'YourPassword',   # Replace with your MySQL password
    'database': 'therapy_clinic', # Use the therapy_clinic database
    'port': 3306
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# Configure JWT
app.config["JWT_SECRET_KEY"] = "your-secret-key"
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# Registration route
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role")
    license_number = data.get("licenseNumber")

    # Validate required fields
    if not username or not password or not role:
        return jsonify({"message": "Missing required fields."}), 400

    if role == "Therapist/Tutor" and not license_number:
        return jsonify({"message": "License/Certification Number is required for Therapist/Tutor."}), 400

    # Check if user already exists
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    existing = cursor.fetchone()
    if existing:
        cursor.close()
        conn.close()
        return jsonify({"message": "User already exists."}), 400

    # Hash the password
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    verified = True

    # Insert new user record
    insert_query = """
      INSERT INTO users (username, password, role, license_number, verified)
      VALUES (%s, %s, %s, %s, %s)
    """
    cursor.execute(insert_query, (username, hashed_password, role,
                                  license_number if role == "Therapist/Tutor" else None,
                                  verified))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "User registered successfully."}), 201

# Login endpoint (includes admin special case)
@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    # Special case for Admin (if preset in DB, admin record is used)
    if not username or not password:
        return jsonify({"message": "Missing username or password."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        return jsonify({"message": "Invalid user email."}), 401

    if not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid password."}), 401

    token_data = json.dumps({
        "id": user["id"],
        "username": user["username"],
        "role": user["role"]
    })

    # Generate a JWT access token with the user's data (as a JSON string) that expires in 1 hour
    access_token = create_access_token(
        identity=token_data,
        expires_delta=datetime.timedelta(hours=1)
    )

    return jsonify({"token": access_token, "message": "Logged in successfully."}), 200

# Protected route example
@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    current_user = json.loads(get_jwt_identity())
    return jsonify({"message": f"Welcome {current_user['username']}!", "data": current_user}), 200

# Book appointment
@app.route('/appointments/book', methods=['POST'])
@jwt_required()  # Ensure the user is logged in with a valid JWT
def book_appointment():
    user = json.loads(get_jwt_identity())  # Get current user data from the token
    if user['role'] not in ['Student', 'Parent']:
        return jsonify({"message": "Only students or parents can book appointments."}), 403

    data = request.get_json()
    therapist_id = data.get('therapist_id')
    time = data.get('appointment_time')

    # Insert a new appointment record into the database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO appointments (student_id, therapist_id, appointment_time)
        VALUES (%s, %s, %s)
    """, (user['id'], therapist_id, time))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Appointment booked successfully."}), 201

# Reschedule appointment
@app.route('/appointments/reschedule', methods=['POST'])
@jwt_required()  # Ensure the user is authenticated
def reschedule_appointment():
    user = json.loads(get_jwt_identity())
    data = request.get_json()
    appointment_id = data.get('appointment_id')  # ID of the appointment to be changed
    new_time = data.get('new_time')  # New datetime to reschedule to

    # Update the appointment_time for the given appointment and user
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE appointments 
        SET appointment_time = %s 
        WHERE id = %s AND student_id = %s
    """, (new_time, appointment_id, user['id']))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Appointment rescheduled successfully."}), 200

# Cancel appointment
@app.route('/appointments/cancel', methods=['POST'])
@jwt_required()  # Ensure the user is authenticated
def cancel_appointment():
    user = json.loads(get_jwt_identity())
    data = request.get_json()
    appointment_id = data.get('appointment_id')  # ID of the appointment to cancel

    # Set the status of the appointment to 'cancelled'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE appointments 
        SET status = 'cancelled' 
        WHERE id = %s AND student_id = %s
    """, (appointment_id, user['id']))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Appointment cancelled successfully."}), 200

if __name__ == '__main__':
    app.run(port=3000, debug=True)