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
    'password': 'University24@',   # Replace with your MySQL password
    'database': 'therapy_clinic',  # Use the therapy_clinic database
    'port': 3306
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# Configure JWT and Bcrypt
app.config["JWT_SECRET_KEY"] = "your-secret-key"
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# --------------------
# User Registration
# --------------------
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role")
    license_number = data.get("licenseNumber")  # Only for Therapist/Tutor
    first_name = data.get("firstName")
    last_name = data.get("lastName")

    # Validate required fields
    if not username or not password or not role or not first_name or not last_name:
        return jsonify({"message": "Missing required fields."}), 400

    if role == "Therapist/Tutor" and not license_number:
        return jsonify({"message": "License/Certification Number is required for Therapist/Tutor."}), 400

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
    # For Therapist/Tutor, set verified to False; others default to True.
    verified = False if role == "Therapist/Tutor" else True

    insert_query = """
      INSERT INTO users (username, password, first_name, last_name, role, license_number, verified)
      VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(insert_query, (username, hashed_password, first_name, last_name, role,
                                    license_number if role == "Therapist/Tutor" else None,
                                    verified))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "User registered successfully."}), 201

# --------------------
# User Login
# --------------------
@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

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

    # Block unverified Therapist/Tutor accounts
    if user["role"] == "Therapist/Tutor" and not user["verified"]:
        return jsonify({"message": "Your account is awaiting admin verification."}), 403

    if not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid password."}), 401

    token_data = json.dumps({
        "id": user["id"],
        "username": user["username"],
        "role": user["role"]
    })

    access_token = create_access_token(
        identity=token_data,
        expires_delta=datetime.timedelta(hours=1)
    )

    return jsonify({"token": access_token, "message": "Logged in successfully."}), 200

# --------------------
# Dashboard (Protected)
# --------------------
@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    current_user = json.loads(get_jwt_identity())
    return jsonify({"message": f"Welcome {current_user['username']}!", "data": current_user}), 200

# --------------------
# Admin Endpoints
# --------------------
@app.route('/admin/users', methods=['GET'])
def get_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"message": "Error fetching users", "error": str(e)}), 500

@app.route('/admin/verify/<int:user_id>', methods=['PUT'])
def verify_user(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET verified = TRUE WHERE id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": f"User {user_id} verified."}), 200
    except Exception as e:
        return jsonify({"message": "Error verifying user", "error": str(e)}), 500

@app.route('/admin/unverify/<int:user_id>', methods=['PUT'])
def unverify_user(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET verified = FALSE WHERE id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": f"User {user_id} unverified."}), 200
    except Exception as e:
        return jsonify({"message": "Error un-verifying user", "error": str(e)}), 500

# --------------------
# Appointment Endpoints
# --------------------
@app.route('/appointments/book', methods=['POST'])
@jwt_required()
def book_appointment():
    user = json.loads(get_jwt_identity())
    if user['role'] not in ['Student', 'Parent']:
        return jsonify({"message": "Only students or parents can book appointments."}), 403

    data = request.get_json()
    therapist_id = data.get('therapist_id')
    appointment_time = data.get('appointment_time')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO appointments (student_id, therapist_id, appointment_time)
        VALUES (%s, %s, %s)
    """, (user['id'], therapist_id, appointment_time))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Appointment booked successfully."}), 201

@app.route('/appointments/reschedule', methods=['POST'])
@jwt_required()
def reschedule_appointment():
    user = json.loads(get_jwt_identity())
    data = request.get_json()
    appointment_id = data.get('appointment_id')
    new_time = data.get('new_time')

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

@app.route('/appointments/cancel', methods=['POST'])
@jwt_required()
def cancel_appointment():
    user = json.loads(get_jwt_identity())
    data = request.get_json()
    appointment_id = data.get('appointment_id')

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

# --------------------
# Availability Endpoints
# --------------------
@app.route('/availability', methods=['POST'])
@jwt_required()
def add_availability():
    try:
        current_user = json.loads(get_jwt_identity())
        print("Current user (POST):", current_user)
        if current_user["role"].lower() != "therapist/tutor":
            return jsonify({"message": "Only therapists/tutors can set availability."}), 403

        data = request.get_json()
        date = data.get("date")
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        if not date or not start_time or not end_time:
            return jsonify({"message": "Missing required fields (date, start_time, end_time)."}), 400

        therapist_id = int(current_user["id"])
        # Check for duplicate entry
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        check_query = """
            SELECT * FROM availability
            WHERE therapist_id = %s AND date = %s AND start_time = %s
        """
        cursor.execute(check_query, (therapist_id, date, start_time))
        duplicate = cursor.fetchone()
        if duplicate:
            cursor.close()
            conn.close()
            return jsonify({"message": "Availability already exists for this time slot."}), 409

        # Insert new availability if no duplicate exists
        cursor = conn.cursor()
        query = "INSERT INTO availability (therapist_id, date, start_time, end_time) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (therapist_id, date, start_time, end_time))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Availability added successfully."}), 201
    except Exception as e:
        print("Error in add_availability:", e)
        return jsonify({"message": "Failed to set availability", "error": str(e)}), 500

@app.route('/availability', methods=['GET'])
@jwt_required()
def get_availabilities():
    try:
        current_user = json.loads(get_jwt_identity())
        print("Current user (GET):", current_user)
        if current_user["role"].lower() != "therapist/tutor":
            return jsonify({"message": "Only therapists/tutors can access availabilities."}), 403

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        therapist_id = int(current_user["id"])
        query = "SELECT * FROM availability WHERE therapist_id = %s"
        cursor.execute(query, (therapist_id,))
        availabilities = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert TIME and DATE values to strings for JSON serialization
        for avail in availabilities:
            if isinstance(avail["date"], (datetime.date, datetime.datetime)):
                avail["date"] = avail["date"].strftime("%Y-%m-%d")
            if isinstance(avail["start_time"], datetime.timedelta):
                total_seconds = int(avail["start_time"].total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                avail["start_time"] = f"{hours:02}:{minutes:02}:{seconds:02}"
            if isinstance(avail["end_time"], datetime.timedelta):
                total_seconds = int(avail["end_time"].total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                avail["end_time"] = f"{hours:02}:{minutes:02}:{seconds:02}"

        if not availabilities:
            return jsonify({"availabilities": [], "message": "No availabilities found for your account."}), 200

        return jsonify({"availabilities": availabilities}), 200
    except Exception as e:
        print("Error in get_availabilities:", e)
        return jsonify({"message": "Failed to fetch availabilities", "error": str(e)}), 500

# --------------------
# Run the App
# --------------------
if __name__ == '__main__':
    app.run(port=3000, debug=True)
