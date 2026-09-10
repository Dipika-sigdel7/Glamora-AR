from werkzeug.security import generate_password_hash
from database.db import get_db_connection


# =========================================================
# CREATE ADMIN ACCOUNT
# =========================================================

name = input("Admin name: ").strip()
email = input("Admin email: ").strip().lower()
password = input("Admin password: ")


# =========================================================
# VALIDATION
# =========================================================

if not name or not email or not password:

    print()
    print("All fields are required.")
    exit()


# =========================================================
# HASH PASSWORD
# =========================================================

password_hash = generate_password_hash(password)


# =========================================================
# DATABASE CONNECTION
# =========================================================

connection = get_db_connection()

if connection is None:

    print()
    print("Database connection failed.")
    exit()


cursor = connection.cursor()


# =========================================================
# INSERT ADMIN
# =========================================================

try:

    cursor.execute(
        """
        INSERT INTO admins
            (name, email, password_hash)
        VALUES
            (%s, %s, %s)
        """,
        (
            name,
            email,
            password_hash
        )
    )

    connection.commit()

    print()
    print("====================================")
    print("ADMIN CREATED SUCCESSFULLY")
    print("====================================")
    print("Name :", name)
    print("Email:", email)
    print()


except Exception as error:

    connection.rollback()

    print()
    print("Failed to create admin:")
    print(error)
    print()


finally:

    cursor.close()
    connection.close()
