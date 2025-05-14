from flask_bcrypt import Bcrypt
import mysql.connector

# Initialize Bcrypt
bcrypt = Bcrypt()

# Database configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Bd2222Mo?',
    'database': 'therapy_clinic',
    'port': 3306
}

def create_admin():
    try:
        # Connect to database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # Admin credentials
        admin_username = "admin"
        admin_password = "admin123"  # This will be the password you'll use to login
        
        # Hash the password
        hashed_password = bcrypt.generate_password_hash(admin_password).decode('utf-8')
        
        # First, check if admin already exists
        cursor.execute("SELECT USER_ID FROM USERS WHERE username = %s", (admin_username,))
        existing_admin = cursor.fetchone()
        
        if existing_admin:
            print("Admin user already exists. Updating password...")
            cursor.execute(
                "UPDATE USERS SET password = %s WHERE username = %s",
                (hashed_password, admin_username)
            )
        else:
            print("Creating new admin user...")
            # Insert into USERS table
            cursor.execute(
                "INSERT INTO USERS (username, password, ROLE) VALUES (%s, %s, 'admin')",
                (admin_username, hashed_password)
            )
            
            # Get the user_id from the last insert
            user_id = cursor.lastrowid
            
            # Insert into ADMIN table
            cursor.execute(
                "INSERT INTO ADMIN (USER_ID) VALUES (%s)",
                (user_id,)
            )
        
        # Commit the changes
        conn.commit()
        print("Admin user created/updated successfully!")
        print("Username: admin")
        print("Password: admin123")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    create_admin()