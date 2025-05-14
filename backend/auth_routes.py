from flask import request, jsonify
import datetime
import json
import mysql.connector

def register_routes(app, get_db_connection, bcrypt, create_access_token):
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
        try:
            data = request.get_json()
            print("Received login request with data:", data)  # Debug log
            
            username = data.get('username')
            password = data.get('password')
            role = data.get('role', '')  # Get role if provided

            print(f"Login attempt for username: {username}, role: {role}")  # Debug log

            if not username or not password:
                print("Missing username or password")  # Debug log
                return jsonify({'message': 'Username and password are required'}), 400

            try:
                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)
                print("Database connection successful")  # Debug log

                # Check if user exists
                query = "SELECT * FROM USERS WHERE username = %s"
                cursor.execute(query, (username,))
                user = cursor.fetchone()
                print("User query result:", user)  # Debug log

                if not user:
                    print(f"User not found: {username}")  # Debug log
                    return jsonify({'message': 'Invalid username or password'}), 401

                # Verify password
                if not bcrypt.check_password_hash(user['password'], password):
                    print(f"Invalid password for user: {username}")  # Debug log
                    return jsonify({'message': 'Invalid username or password'}), 401

                # If role is provided, verify it matches
                if role and user['ROLE'].lower() != role.lower():
                    print(f"Role mismatch for user: {username}. Expected: {role}, Got: {user['ROLE']}")  # Debug log
                    return jsonify({'message': 'Invalid role'}), 401

                # For therapists, check if they're verified
                if user['ROLE'].lower() == 'therapist':
                    cursor.execute("SELECT ADMIN_ID FROM THERAPIST WHERE USER_ID = %s", (user['USER_ID'],))
                    therapist = cursor.fetchone()
                    if not therapist or not therapist['ADMIN_ID']:
                        return jsonify({'message': 'Your account is awaiting admin verification'}), 403

                # Create JWT token
                token = create_access_token(identity=json.dumps({
                    'user_id': user['USER_ID'],
                    'username': user['username'],
                    'role': user['ROLE'].lower()
                }))

                cursor.close()
                conn.close()

                print(f"Successful login for user: {username}")  # Debug log
                return jsonify({
                    'token': token,
                    'message': 'Login successful',
                    'user': {
                        'userID': user['USER_ID'],
                        'username': user['username'],
                        'role': user['ROLE'].lower()
                    }
                })

            except mysql.connector.Error as err:
                print(f"Database error: {err}")  # Debug log
                return jsonify({'message': 'Database error occurred'}), 500

        except Exception as e:
            print(f"Login error: {str(e)}")  # Debug log
            return jsonify({'message': 'An error occurred. Please try again.'}), 500

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

    # --------------------
    # Password Reset Request
    # --------------------
    @app.route('/auth/reset-password', methods=['POST'])
    def reset_password_request():
        data = request.get_json()
        username = data.get("username")
        
        if not username:
            return jsonify({"message": "Email address is required."}), 400
        
        # Note: In a real implementation, you would:
        # 1. Generate a secure token
        # 2. Store it in the database with an expiration time
        # 3. Send an email with a reset link
        # Here we're just returning a success message
        
        return jsonify({
            "message": "If your email is registered, you will receive password reset instructions."
        }), 200