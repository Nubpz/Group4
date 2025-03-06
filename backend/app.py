from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
import datetime

app = Flask(__name__)
CORS(app)

# Configure MySQL database connection (update credentials as needed)
db_config = {
    'host': 'localhost',
    'user': 'root',              # Replace with your MySQL username
    'password': 'University24@', # Replace with your MySQL password
    'database': 'therapy_clinic',# Use the therapy_clinic database
    'port': 3306
}

def get_db_connection():
    """Returns a new connection to the therapy_clinic database."""
    return mysql.connector.connect(**db_config)

# Configure JWT
app.config["JWT_SECRET_KEY"] = "your-secret-key"  # Replace with a secure secret key
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# Registration endpoint (without email verification)
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
    # Mark new users as verified (or change logic as needed)
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

    # For Therapist/Tutor, you can check verification here if needed.
    # If not required, simply generate the token.
    
    access_token = create_access_token(
        identity={"id": user["id"], "username": user["username"], "role": user["role"]},
        expires_delta=datetime.timedelta(hours=1)
    )

    return jsonify({"token": access_token, "message": "Logged in successfully."}), 200

# Protected route example
@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    current_user = get_jwt_identity()
    return jsonify({"message": f"Welcome {current_user['username']}!", "data": current_user}), 200

if __name__ == '__main__':
    app.run(port=3000, debug=True)
