from flask import request, jsonify
import datetime
import json
import random
import string
from flask_mail import Mail 
from utils.emailer import send_reset_code_email  

reset_codes = {}

def register_routes(app, get_db_connection, bcrypt, create_access_token, mail):
    """
    Register authentication routes with the Flask app
    """
    
    # --------------------
    # User Registration
    # --------------------
    @app.route('/auth/register', methods=['POST'])
    def register():
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        role = data.get("role")  # Expected: "parent", "student", "therapist", or "admin"
        cert_number = data.get("certNumber")  # For therapist only
        date_of_birth = data.get("dateOfBirth")  # For student and parent

        # Validate required fields for registration
        if not username or not password or not role:
            return jsonify({"message": "Missing required fields."}), 400

        if role == "therapist" and not cert_number:
            return jsonify({"message": "Certification Number is required for therapists."}), 400

        if (role == "student" or role == "parent") and not date_of_birth:
            return jsonify({"message": "Date of Birth is required for students and parents."}), 400

        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # First check if the username already exists in the USERS table
        cursor.execute("SELECT * FROM USERS WHERE username = %s", (username,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            return jsonify({"message": "Username already exists."}), 400
        
        try:
            # Insert into main USERS table first
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            cursor.execute(
                "INSERT INTO USERS (username, password, ROLE) VALUES (%s, %s, %s)",
                (username, hashed_password, role)
            )
            
            # Get the user_id from the last insert
            user_id = cursor.lastrowid
            
            # Now insert into the specific role table
            if role == "parent":
                # Insert parent details
                cursor.execute(
                    "INSERT INTO PARENT (USER_ID, FirstName, LastName, DOB) VALUES (%s, %s, %s, %s)",
                    (user_id, "", "", date_of_birth)  # Empty first/last name to be filled later
                )
            elif role == "student":
                # Insert student details
                cursor.execute(
                    "INSERT INTO STUDENT (USER_ID, FirstName, LastName, DOB) VALUES (%s, %s, %s, %s)",
                    (user_id, "", "", date_of_birth)  # Empty first/last name to be filled later
                )
            elif role == "therapist":
                # Insert therapist details - unverified by default
                cursor.execute(
                    "INSERT INTO THERAPIST (USER_ID, FirstName, LastName, CERT_Number) VALUES (%s, %s, %s, %s)",
                    (user_id, "", "", cert_number)  # Empty first/last name to be filled later
                )
            elif role == "admin":
                # Admin registration is not typically allowed from client side
                cursor.execute(
                    "INSERT INTO ADMIN (USER_ID) VALUES (%s)",
                    (user_id,)
                )
            
            # Commit transaction
            conn.commit()
            
        except Exception as e:
            # Rollback in case of error
            conn.rollback()
            cursor.close()
            conn.close()
            return jsonify({"message": f"Registration failed: {str(e)}"}), 500
        
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
        role = data.get("role")  # Role is optional during login

        if not username or not password:
            return jsonify({"message": "Missing username or password."}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # First check if user exists in USERS table
        cursor.execute("SELECT * FROM USERS WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({"message": "Invalid username or password."}), 401

        if not bcrypt.check_password_hash(user["password"], password):
            cursor.close()
            conn.close()
            return jsonify({"message": "Invalid username or password."}), 401

        # If role is specified, check if user has that role
        if role and user["ROLE"] != role:
            cursor.close()
            conn.close()
            return jsonify({"message": "Invalid role for this account."}), 401

        # Get user details based on their role
        user_role = user["ROLE"]
        user_id = user["USER_ID"]
        
        user_details = None
        
        if user_role == "parent":
            cursor.execute("SELECT * FROM PARENT WHERE USER_ID = %s", (user_id,))
            user_details = cursor.fetchone()
        elif user_role == "student":
            cursor.execute("SELECT * FROM STUDENT WHERE USER_ID = %s", (user_id,))
            user_details = cursor.fetchone()
        elif user_role == "therapist":
            cursor.execute("SELECT * FROM THERAPIST WHERE USER_ID = %s", (user_id,))
            user_details = cursor.fetchone()
            
            # If therapist is not verified, don't allow login
            if user_details and user_details.get("ADMIN_ID") is None:
                cursor.close()
                conn.close()
                return jsonify({"message": "Your account is awaiting admin verification."}), 403
        elif user_role == "admin":
            cursor.execute("SELECT * FROM ADMIN WHERE USER_ID = %s", (user_id,))
            user_details = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user_details:
            return jsonify({"message": "User details not found."}), 404

        # Create token with user info
        token_data = json.dumps({
            "userId": user_id,
            "username": username,
            "role": user_role
        })

        access_token = create_access_token(
            identity=token_data,
            expires_delta=datetime.timedelta(hours=1)
        )

        return jsonify({
            "token": access_token, 
            "message": "Logged in successfully.",
            "role": user_role
        }), 200

    # --------------------
    # Check User Roles
    # --------------------
    @app.route('/auth/check-roles', methods=['GET'])
    def check_roles():
        username = request.args.get('username')
        
        if not username:
            return jsonify({"message": "Username is required."}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Query to get the user's role from USERS table
        cursor.execute("SELECT ROLE FROM USERS WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({"message": "User not found.", "roles": []}), 404
        
        # Return the role in a list (for future expansion if a user can have multiple roles)
        roles = [user["ROLE"]]
        
        return jsonify({"roles": roles}), 200
    
    # Password Reset Request
    @app.route('/auth/reset-password', methods=['POST'])
    def reset_password_request():
        data = request.get_json()
        username = data.get("username")
        
        if not username:
            return jsonify({"message": "Email address is required."}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("SELECT USER_ID FROM USERS WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            # Generic message to prevent user enumeration
            return jsonify({
                "message": "If your email is registered, you will receive a password reset code."
            }), 200
        
        try:
            # Generate a 6-digit code
            reset_code = ''.join(random.choices(string.digits, k=6))
            expiry = datetime.datetime.now() + datetime.timedelta(minutes=5)  # 5-minute expiration
            
            # Store code in-memory
            reset_codes[user["USER_ID"]] = {"code": reset_code, "expiry": expiry}
            
            # Send email with reset code
            send_reset_code_email(mail, username, reset_code)
            
        except Exception as e:
            cursor.close()
            conn.close()
            return jsonify({"message": f"Failed to process request: {str(e)}"}), 500
        
        cursor.close()
        conn.close()
        return jsonify({
            "message": "If your email is registered, you will receive a password reset code."
        }), 200
    
    # Password Reset Confirmation
    @app.route('/auth/reset-password/confirm', methods=['POST'])
    def reset_password_confirm():
        data = request.get_json()
        username = data.get("username")
        code = data.get("code")
        new_password = data.get("password")
        
        if not username or not code or not new_password:
            return jsonify({"message": "Username, code, and new password are required."}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user ID
        cursor.execute("SELECT USER_ID FROM USERS WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({"message": "Invalid username or code."}), 400
        
        user_id = user["USER_ID"]
        
        # Check if code is valid
        if user_id not in reset_codes:
            cursor.close()
            conn.close()
            return jsonify({"message": "Invalid or expired code."}), 400
        
        stored_code = reset_codes[user_id]
        if stored_code["code"] != code or stored_code["expiry"] < datetime.datetime.now():
            cursor.close()
            conn.close()
            return jsonify({"message": "Invalid or expired code."}), 400
        
        try:
            # Update user's password
            hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
            cursor.execute(
                "UPDATE USERS SET password = %s WHERE USER_ID = %s",
                (hashed_password, user_id)
            )
            conn.commit()
            
            # Remove the used code
            del reset_codes[user_id]
            
            cursor.close()
            conn.close()
            return jsonify({"message": "Password reset successfully."}), 200
            
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            return jsonify({"message": f"Failed to reset password: {str(e)}"}), 500