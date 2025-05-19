# admin_routes.py
from flask import request, jsonify
import json
import mysql.connector

def register_routes(app, get_db_connection, jwt_required, get_jwt_identity):
    """
    Register admin routes with the Flask app.
    """

    def is_admin(user_id):
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT 1 FROM ADMIN WHERE USER_ID = %s", (user_id,))
        ok = cur.fetchone() is not None
        cur.close()
        conn.close()
        return ok

    @app.route("/admin/users", methods=["GET"])
    @jwt_required()
    def get_all_users():
        token = json.loads(get_jwt_identity())
        if token.get("role") != "admin" or not is_admin(token["userId"]):
            return jsonify({"message": "Unauthorized access."}), 403

        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)

            query = """
            SELECT
              u.USER_ID    AS id,
              u.username   AS username,
              CASE
                WHEN u.ROLE = 'student' AND EXISTS (
                  SELECT 1
                    FROM GUARDIAN g
                    JOIN STUDENT st ON g.STUDENT_ID = st.STUDENT_ID
                   WHERE st.USER_ID = u.USER_ID
                )
                THEN NULL
                ELSE u.username
              END          AS email,
              u.ROLE       AS role,
              u.created_at AS created_at,
              u.latitude   AS latitude,
              u.longitude  AS longitude,
              p.PARENT_ID  AS parent_id,
              s.STUDENT_ID AS student_id,
              CASE WHEN u.ROLE='parent'    THEN p.FirstName
                   WHEN u.ROLE='student'   THEN s.FirstName
                   WHEN u.ROLE='therapist' THEN t.FirstName
              END          AS first_name,
              CASE WHEN u.ROLE='parent'    THEN p.LastName
                   WHEN u.ROLE='student'   THEN s.LastName
                   WHEN u.ROLE='therapist' THEN t.LastName
              END          AS last_name,
              CASE WHEN u.ROLE='parent'    THEN p.Gender
                   WHEN u.ROLE='student'   THEN s.Gender
                   WHEN u.ROLE='therapist' THEN t.Gender
              END          AS gender,
              CASE WHEN u.ROLE='parent'    THEN p.DOB
                   WHEN u.ROLE='student'   THEN s.DOB
              END          AS dob,
              CASE WHEN u.ROLE='therapist' THEN t.CERT_Number END AS certNumber,
              CASE WHEN u.ROLE='therapist' THEN (t.ADMIN_ID IS NOT NULL)
                   ELSE TRUE
              END          AS verified,
              CASE WHEN u.ROLE='parent' THEN (
                SELECT GROUP_CONCAT(CONCAT(st2.FirstName,' ',st2.LastName) SEPARATOR ', ')
                  FROM GUARDIAN g2
                  JOIN STUDENT   st2 ON g2.STUDENT_ID = st2.STUDENT_ID
                 WHERE g2.PARENT_ID = p.PARENT_ID
              ) ELSE NULL END AS children_names,
              CASE WHEN u.ROLE='student' THEN (
                SELECT GROUP_CONCAT(
                    CONCAT(p2.FirstName,' ',p2.LastName,' (',g2.Relation,')') 
                    SEPARATOR ', '
                )
                FROM GUARDIAN g2
                JOIN PARENT    p2 ON g2.PARENT_ID = p2.PARENT_ID
                WHERE g2.STUDENT_ID = s.STUDENT_ID
              ) ELSE NULL END AS guardian_info
            FROM USERS u
            LEFT JOIN PARENT    p ON u.USER_ID = p.USER_ID    AND u.ROLE = 'parent'
            LEFT JOIN STUDENT   s ON u.USER_ID = s.USER_ID    AND u.ROLE = 'student'
            LEFT JOIN THERAPIST t ON u.USER_ID = t.USER_ID    AND u.ROLE = 'therapist'
            LEFT JOIN ADMIN     a ON u.USER_ID = a.USER_ID    AND u.ROLE = 'admin'
            ORDER BY u.created_at DESC
            """

            cur.execute(query)
            users = cur.fetchall()

            for u in users:
                if u["role"] == "parent" and u.get("parent_id"):
                    c2 = conn.cursor(dictionary=True)
                    c2.execute("""
                        SELECT
                          st.STUDENT_ID AS id,
                          CONCAT(st.FirstName,' ',st.LastName) AS name,
                          st.DOB AS dob
                        FROM GUARDIAN g
                        JOIN STUDENT st ON g.STUDENT_ID = st.STUDENT_ID
                        WHERE g.PARENT_ID = %s
                    """, (u["parent_id"],))
                    u["children"] = c2.fetchall()
                    c2.close()
                else:
                    u["children"] = []

            cur.close()
            conn.close()
            return jsonify({"users": users}), 200

        except Exception as exc:
            return jsonify({"message": f"Error fetching users: {exc}"}), 500

    @app.route("/user/location", methods=["PUT"])
    @jwt_required()
    def update_user_location():
        token = json.loads(get_jwt_identity())
        user_id = token["userId"]

        try:
            data = request.get_json()
            latitude = data.get("latitude")
            longitude = data.get("longitude")

            if latitude is None or longitude is None:
                return jsonify({"message": "Latitude and longitude are required."}), 400

            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE USERS SET latitude = %s, longitude = %s WHERE USER_ID = %s",
                (latitude, longitude, user_id)
            )
            if cur.rowcount == 0:
                conn.rollback()
                cur.close()
                conn.close()
                return jsonify({"message": "User not found."}), 404

            conn.commit()
            cur.close()
            conn.close()
            return jsonify({"message": "Location updated successfully."}), 200

        except Exception as exc:
            return jsonify({"message": f"Error updating location: {exc}"}), 500

    @app.route("/admin/verify/<int:user_id>", methods=["PUT"])
    @jwt_required()
    def verify_therapist(user_id):
        token = json.loads(get_jwt_identity())
        if token.get("role") != "admin" or not is_admin(token["userId"]):
            return jsonify({"message": "Unauthorized access."}), 403

        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT ADMIN_ID FROM ADMIN WHERE USER_ID = %s", (token["userId"],))
            admin = cur.fetchone()
            if not admin:
                cur.close()
                conn.close()
                return jsonify({"message": "Admin not found."}), 404

            cur.execute(
                "UPDATE THERAPIST SET ADMIN_ID = %s WHERE USER_ID = %s AND ADMIN_ID IS NULL",
                (admin["ADMIN_ID"], user_id),
            )
            if cur.rowcount == 0:
                conn.rollback()
                cur.close()
                conn.close()
                return jsonify({"message": "Therapist not found or already verified."}), 404

            conn.commit()
            cur.close()
            conn.close()
            return jsonify({"message": "Therapist verified."}), 200

        except Exception as exc:
            return jsonify({"message": f"Error verifying: {exc}"}), 500

    @app.route("/admin/unverify/<int:user_id>", methods=["PUT"])
    @jwt_required()
    def unverify_therapist(user_id):
        token = json.loads(get_jwt_identity())
        if token.get("role") != "admin" or not is_admin(token["userId"]):
            return jsonify({"message": "Unauthorized access."}), 403

        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "UPDATE THERAPIST SET ADMIN_ID = NULL WHERE USER_ID = %s AND ADMIN_ID IS NOT NULL",
                (user_id,),
            )
            if cur.rowcount == 0:
                conn.rollback()
                cur.close()
                conn.close()
                return jsonify({"message": "Therapist not found or already unverified."}), 404

            conn.commit()
            cur.close()
            conn.close()
            return jsonify({"message": "Therapist unverified."}), 200

        except Exception as exc:
            return jsonify({"message": f"Error unverifying: {exc}"}), 500

    @app.route("/admin/dashboard/counts", methods=["GET"])
    @jwt_required()
    def get_dashboard_counts():
        token = json.loads(get_jwt_identity())
        if token.get("role") != "admin" or not is_admin(token["userId"]):
            return jsonify({"message": "Unauthorized access."}), 403

        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)

            cur.execute("SELECT COUNT(*) AS n FROM USERS")
            total = cur.fetchone()["n"]

            cur.execute("SELECT COUNT(*) AS n FROM USERS WHERE ROLE = 'parent'")
            parents = cur.fetchone()["n"]

            cur.execute("SELECT COUNT(*) AS n FROM USERS WHERE ROLE = 'student'")
            students = cur.fetchone()["n"]

            cur.execute("""
              SELECT COUNT(*) AS n
                FROM USERS u
                JOIN THERAPIST t ON u.USER_ID = t.USER_ID
               WHERE u.ROLE='therapist' AND t.ADMIN_ID IS NOT NULL
            """)
            verified = cur.fetchone()["n"]

            cur.execute("""
              SELECT COUNT(*) AS n
                FROM USERS u
                JOIN THERAPIST t ON u.USER_ID = t.USER_ID
               WHERE u.ROLE='therapist' AND t.ADMIN_ID IS NULL
            """)
            pending = cur.fetchone()["n"]

            cur.close()
            conn.close()
            return jsonify({
                "totalUsers": total,
                "parentCount": parents,
                "studentCount": students,
                "verifiedTherapistCount": verified,
                "pendingTherapistCount": pending
            }), 200

        except Exception as exc:
            return jsonify({"message": f"Error fetching counts: {exc}"}), 500

    @app.route("/admin/recent-registrations", methods=["GET"])
    @jwt_required()
    def get_recent_registrations():
        token = json.loads(get_jwt_identity())
        if token.get("role") != "admin" or not is_admin(token["userId"]):
            return jsonify({"message": "Unauthorized access."}), 403

        limit = request.args.get("limit", default=5, type=int)
        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute(
                """
                SELECT
                  u.USER_ID   AS id,
                  u.username  AS username,
                  u.username  AS email,
                  u.ROLE      AS role,
                  u.created_at,
                  CASE WHEN u.ROLE='parent'    THEN p.FirstName
                       WHEN u.ROLE='student'   THEN s.FirstName
                       WHEN u.ROLE='therapist' THEN t.FirstName
                  END         AS first_name,
                  CASE WHEN u.ROLE='parent'    THEN p.LastName
                       WHEN u.ROLE='student'   THEN s.LastName
                       WHEN u.ROLE='therapist' THEN t.LastName
                  END         AS last_name
                FROM USERS u
                LEFT JOIN PARENT    p ON u.USER_ID = p.USER_ID    AND u.ROLE='parent'
                LEFT JOIN STUDENT   s ON u.USER_ID = s.USER_ID    AND u.ROLE='student'
                LEFT JOIN THERAPIST t ON u.USER_ID = t.USER_ID    AND u.ROLE='therapist'
                ORDER BY u.created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            recent = cur.fetchall()
            cur.close()
            conn.close()
            return jsonify({"users": recent}), 200

        except Exception as exc:
            return jsonify({"message": f"Error fetching recent regs: {exc}"}), 500

    @app.route("/user/locations", methods=["GET"])
    @jwt_required()
    def get_all_user_locations():
        token = json.loads(get_jwt_identity())
        if token.get("role") != "admin" or not is_admin(token["userId"]):
            return jsonify({"message": "Unauthorized access."}), 403

        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)
            query = """
            SELECT 
                u.USER_ID AS user_id,
                u.username,
                u.role,
                u.latitude,
                u.longitude,
                COALESCE(t.FirstName, s.FirstName, p.FirstName, u.username, 'Unknown') AS first_name,
                COALESCE(t.LastName, s.LastName, p.LastName, '') AS last_name
            FROM USERS u
            LEFT JOIN THERAPIST t ON u.USER_ID = t.USER_ID AND u.role = 'therapist'
            LEFT JOIN STUDENT s ON u.USER_ID = s.USER_ID AND u.role = 'student'
            LEFT JOIN PARENT p ON u.USER_ID = p.USER_ID AND u.role = 'parent'
            LEFT JOIN ADMIN a ON u.USER_ID = a.USER_ID AND u.role = 'admin'
            WHERE u.latitude IS NOT NULL AND u.longitude IS NOT NULL
            ORDER BY u.username
            """
            cur.execute(query)
            users = cur.fetchall()
            cur.close()
            conn.close()
            return jsonify(users), 200
        except mysql.connector.Error as err:
            print(f"Error fetching user locations: {err}")
            return jsonify({"message": "Database error occurred."}), 500
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()

    @app.route("/admin/profile", methods=["GET"])
    @jwt_required()
    def get_admin_profile():
        token = json.loads(get_jwt_identity())
        user_id = token["userId"]
        if token.get("role") != "admin" or not is_admin(user_id):
            return jsonify({"message": "Unauthorized access."}), 403

        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)
            query = """
            SELECT 
                u.USER_ID AS user_id,
                u.username,
                u.role,
                u.latitude,
                u.longitude,
                u.username AS first_name,
                '' AS last_name
            FROM USERS u
            JOIN ADMIN a ON u.USER_ID = a.USER_ID
            WHERE u.USER_ID = %s
            """
            cur.execute(query, (user_id,))
            admin = cur.fetchone()
            if not admin:
                return jsonify({"message": "Admin not found."}), 404
            return jsonify(admin), 200
        except mysql.connector.Error as err:
            print(f"Database error in get_admin_profile: {err}")
            return jsonify({"message": "Database error occurred."}), 500
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()