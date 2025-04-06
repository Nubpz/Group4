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
    'user': 'root',               
    'password': 'University24@',   
    'database': 'therapy_clinic',  
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
    role = data.get("role")  # Expected: "Parent", "Student", "Therapist/Tutor", or "Admin"
    license_number = data.get("licenseNumber")  # For Therapist/Tutor only
    first_name = data.get("firstName")
    last_name = data.get("lastName")
    date_of_birth = data.get("dateOfBirth")       # For Student registration

    # Validate required fields for all roles
    if not username or not password or not role or not first_name or not last_name:
        return jsonify({"message": "Missing required fields."}), 400

    if role == "Therapist/Tutor" and not license_number:
        return jsonify({"message": "License/Certification Number is required for Therapist/Tutor."}), 400

    if role == "Student" and not date_of_birth:
        return jsonify({"message": "Date of Birth is required for students."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if username exists in the corresponding table
    if role == "Parent":
        cursor.execute("SELECT * FROM parents WHERE username = %s", (username,))
    elif role == "Student":
        cursor.execute("SELECT * FROM students WHERE username = %s", (username,))
    elif role == "Therapist/Tutor":
        cursor.execute("SELECT * FROM therapists WHERE username = %s", (username,))
    elif role == "Admin":
        cursor.execute("SELECT * FROM admins WHERE username = %s", (username,))
    else:
        cursor.close()
        conn.close()
        return jsonify({"message": "Invalid role provided."}), 400

    existing = cursor.fetchone()
    if existing:
        cursor.close()
        conn.close()
        return jsonify({"message": "User already exists."}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    if role == "Parent":
        insert_query = """
          INSERT INTO parents (username, password, first_name, last_name)
          VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, (username, hashed_password, first_name, last_name))
    elif role == "Student":
        insert_query = """
          INSERT INTO students (username, password, first_name, last_name, date_of_birth)
          VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (username, hashed_password, first_name, last_name, date_of_birth))
    elif role == "Therapist/Tutor":
        # Therapists are unverified by default.
        insert_query = """
          INSERT INTO therapists (username, password, first_name, last_name, license_number, verified)
          VALUES (%s, %s, %s, %s, %s, FALSE)
        """
        cursor.execute(insert_query, (username, hashed_password, first_name, last_name, license_number))
    elif role == "Admin":
        # Admin registration is not allowed from client side.
        cursor.close()
        conn.close()
        return jsonify({"message": "Admin registration is not allowed."}), 403

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
    role = data.get("role")

    if not username or not password or not role:
        return jsonify({"message": "Missing username, password, or role."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    if role == "Parent":
        cursor.execute("SELECT * FROM parents WHERE username = %s", (username,))
    elif role == "Student":
        cursor.execute("SELECT * FROM students WHERE username = %s", (username,))
    elif role == "Therapist/Tutor":
        cursor.execute("SELECT * FROM therapists WHERE username = %s", (username,))
    elif role == "Admin":
        cursor.execute("SELECT * FROM admins WHERE username = %s", (username,))
    else:
        cursor.close()
        conn.close()
        return jsonify({"message": "Invalid role provided."}), 400

    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        return jsonify({"message": "Invalid username."}), 401

    if not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid password."}), 401

    if role == "Therapist/Tutor" and not user.get("verified", False):
        return jsonify({"message": "Your account is awaiting admin verification."}), 403

    token_data = json.dumps({
        "id": user["id"],
        "username": user["username"],
        "role": role
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
        query = """
          SELECT 'Parent' AS role, id, username, first_name, last_name, created_at FROM parents
          UNION ALL
          SELECT 'Student' AS role, id, username, first_name, last_name, created_at FROM students
          UNION ALL
          SELECT 'Therapist/Tutor' AS role, id, username, first_name, last_name, created_at, license_number, verified FROM therapists
          UNION ALL
          SELECT 'Admin' AS role, id, username, first_name, last_name, created_at FROM admins
        """
        cursor.execute(query)
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
        cursor.execute("UPDATE therapists SET verified = TRUE WHERE id = %s", (user_id,))
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
        cursor.execute("UPDATE therapists SET verified = FALSE WHERE id = %s", (user_id,))
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
    # For parents, require a student_id to indicate which child the appointment is for.
    student_id = data.get('student_id') if user['role'] == 'Parent' else user['id']

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO appointments (student_id, therapist_id, appointment_time, booked_by_parent_id)
        VALUES (%s, %s, %s, %s)
    """, (student_id, therapist_id, appointment_time, user['id'] if user['role'] == 'Parent' else None))
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
    if user['role'] == 'Student':
        cursor.execute("""
            UPDATE appointments 
            SET appointment_time = %s 
            WHERE id = %s AND student_id = %s
        """, (new_time, appointment_id, user['id']))
    elif user['role'] == 'Parent':
        student_id = data.get('student_id')
        cursor.execute("""
            UPDATE appointments 
            SET appointment_time = %s 
            WHERE id = %s AND student_id = %s AND booked_by_parent_id = %s
        """, (new_time, appointment_id, student_id, user['id']))
    else:
        cursor.close()
        conn.close()
        return jsonify({"message": "Unauthorized to reschedule appointment."}), 403

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
    if user['role'] == 'Student':
        cursor.execute("""
            UPDATE appointments 
            SET status = 'cancelled' 
            WHERE id = %s AND student_id = %s
        """, (appointment_id, user['id']))
    elif user['role'] == 'Parent':
        student_id = data.get('student_id')
        cursor.execute("""
            UPDATE appointments 
            SET status = 'cancelled' 
            WHERE id = %s AND student_id = %s AND booked_by_parent_id = %s
        """, (appointment_id, student_id, user['id']))
    else:
        cursor.close()
        conn.close()
        return jsonify({"message": "Unauthorized to cancel appointment."}), 403

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Appointment cancelled successfully."}), 200

# --------------------
# Availability Endpoints (Therapists Only)
# --------------------
@app.route('/availability', methods=['POST'])
@jwt_required()
def add_availability():
    try:
        current_user = json.loads(get_jwt_identity())
        print("Current user (POST):", current_user)
        if current_user["role"].lower() != "therapist/tutor".lower():
            return jsonify({"message": "Only therapists/tutors can set availability."}), 403

        data = request.get_json()
        date = data.get("date")
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        if not date or not start_time or not end_time:
            return jsonify({"message": "Missing required fields (date, start_time, end_time)."}), 400

        therapist_id = int(current_user["id"])
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
        if current_user["role"].lower() != "therapist/tutor".lower():
            return jsonify({"message": "Only therapists/tutors can access availabilities."}), 403

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        therapist_id = int(current_user["id"])
        query = "SELECT * FROM availability WHERE therapist_id = %s"
        cursor.execute(query, (therapist_id,))
        availabilities = cursor.fetchall()
        cursor.close()
        conn.close()

        for avail in availabilities:
            if isinstance(avail["date"], (datetime.date, datetime.datetime)):
                avail["date"] = avail["date"].strftime("%Y-%m-%d")
        if not availabilities:
            return jsonify({"availabilities": [], "message": "No availabilities found for your account."}), 200

        return jsonify({"availabilities": availabilities}), 200
    except Exception as e:
        print("Error in get_availabilities:", e)
        return jsonify({"message": "Failed to fetch availabilities", "error": str(e)}), 500

# --------------------
# Parents Profile Endpoints
# --------------------
@app.route('/parents/profile', methods=['GET'])
@jwt_required()
def fetch_parent_profile():
    current_user = json.loads(get_jwt_identity())
    parent_id = current_user.get("id")
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, username, first_name, last_name, created_at FROM parents WHERE id = %s", (parent_id,))
    parent = cursor.fetchone()
    cursor.close()
    conn.close()
    if not parent:
        return jsonify({"message": "Parent not found."}), 404
    return jsonify({"profile": parent}), 200

@app.route('/parents/profile', methods=['PUT'])
@jwt_required()
def modify_parent_profile():
    current_user = json.loads(get_jwt_identity())
    parent_id = current_user.get("id")
    data = request.get_json()
    new_first_name = data.get("firstName")
    new_last_name = data.get("lastName")
    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")

    if not new_first_name or not new_last_name:
        return jsonify({"message": "First name and last name are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM parents WHERE id = %s", (parent_id,))
    parent = cursor.fetchone()
    if not parent:
        cursor.close()
        conn.close()
        return jsonify({"message": "Parent not found."}), 404

    # If a new password is provided, verify the current password
    if new_password:
        if not current_password:
            cursor.close()
            conn.close()
            return jsonify({"message": "Current password is required to change password."}), 400
        if not bcrypt.check_password_hash(parent["password"], current_password):
            cursor.close()
            conn.close()
            return jsonify({"message": "Current password is incorrect."}), 400
        updated_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    else:
        updated_password = parent["password"]

    update_query = """
      UPDATE parents
      SET first_name = %s, last_name = %s, password = %s
      WHERE id = %s
    """
    cursor.execute(update_query, (new_first_name, new_last_name, updated_password, parent_id))
    conn.commit()
    cursor.execute("SELECT id, username, first_name, last_name, created_at FROM parents WHERE id = %s", (parent_id,))
    updated_profile = cursor.fetchone()
    cursor.close()
    conn.close()

    return jsonify({"message": "Profile updated successfully.", "profile": updated_profile}), 200

# --------------------
# Parents Children Endpoints
# --------------------
@app.route('/parents/children', methods=['GET'])
@jwt_required()
def get_children():
    current_user = json.loads(get_jwt_identity())
    parent_id = current_user.get("id")
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
      SELECT s.id, s.username, s.first_name, s.last_name, s.date_of_birth
      FROM students s
      JOIN parent_student ps ON s.id = ps.student_id
      WHERE ps.parent_id = %s
    """
    cursor.execute(query, (parent_id,))
    children = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"children": children}), 200

@app.route('/parents/children', methods=['POST'])
@jwt_required()
def add_child():
    current_user = json.loads(get_jwt_identity())
    parent_id = current_user.get("id")
    data = request.get_json()
    first_name = data.get("firstName")
    last_name = data.get("lastName")
    date_of_birth = data.get("dateOfBirth")
    
    if not first_name or not last_name or not date_of_birth:
        return jsonify({"message": "Missing required fields for child."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Generate a username for the child: for example, "john.doe_3"
        generated_username = f"{first_name.lower()}.{last_name.lower()}_{parent_id}"
        default_password = "child123"  # In production, use a more secure approach.
        hashed_password = bcrypt.generate_password_hash(default_password).decode('utf-8')
        insert_query = """
            INSERT INTO students (username, password, first_name, last_name, date_of_birth)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (generated_username, hashed_password, first_name, last_name, date_of_birth))
        conn.commit()
        child_id = cursor.lastrowid
        cursor.close()
        
        # Insert into the bridging table "parent_student"
        cursor = conn.cursor()
        bridge_query = "INSERT INTO parent_student (parent_id, student_id) VALUES (%s, %s)"
        cursor.execute(bridge_query, (parent_id, child_id))
        conn.commit()
        cursor.close()
        conn.close()
        
        new_child = {
            "id": child_id,
            "username": generated_username,
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": date_of_birth
        }
        return jsonify({"message": "Child added successfully.", "child": new_child}), 201
    except Exception as e:
        return jsonify({"message": "Failed to add child", "error": str(e)}), 500

@app.route('/parents/appointments', methods=['GET'])
@jwt_required()
def get_parent_appointments():
    current_user = json.loads(get_jwt_identity())
    parent_id = current_user.get("id")
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
      SELECT a.id, a.appointment_time, a.status,
             CONCAT(t.first_name, ' ', t.last_name) AS therapist_name,
             CONCAT(s.first_name, ' ', s.last_name) AS child_name
      FROM appointments a
      JOIN therapists t ON a.therapist_id = t.id
      JOIN students s ON a.student_id = s.id
      WHERE a.booked_by_parent_id = %s
      ORDER BY a.appointment_time DESC
    """
    cursor.execute(query, (parent_id,))
    appointments = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"appointments": appointments}), 200



# --------------------
# Run the App
# --------------------
if __name__ == '__main__':
    app.run(port=3000, debug=True)