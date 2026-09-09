from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    flash
)

from werkzeug.security import check_password_hash

from database.db import get_db_connection


# =========================================================
# FLASK APPLICATION
# =========================================================

app = Flask(__name__)

app.secret_key = "glamora-ar-secret-key"


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# BEAUTY
# =========================================================

@app.route("/beauty")
def beauty():
    return render_template("beauty.html")


# =========================================================
# ABOUT
# =========================================================

@app.route("/about")
def about():
    return render_template("about.html")


# =========================================================
# CONTACT
# =========================================================

@app.route("/contact")
def contact():
    return render_template("contact.html")


# =========================================================
# LOGIN
# =========================================================

@app.route("/login")
def login():
    return render_template("login.html")


# =========================================================
# REGISTER
# =========================================================

@app.route("/register", methods=["GET", "POST"])
def register():
    return render_template("register.html")


# =========================================================
# ADMIN LOGIN
# =========================================================

@app.route("/admin", methods=["GET", "POST"])
def admin_login():

    # -----------------------------------------------------
    # Already logged in
    # -----------------------------------------------------

    if session.get("admin_id"):
        return redirect(url_for("admin_dashboard"))


    # -----------------------------------------------------
    # Login form submitted
    # -----------------------------------------------------

    if request.method == "POST":

        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")


        # -------------------------------------------------
        # Basic validation
        # -------------------------------------------------

        if not email or not password:

            flash(
                "Please enter your email and password.",
                "error"
            )

            return redirect(url_for("admin_login"))


        # -------------------------------------------------
        # Connect to database
        # -------------------------------------------------

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(url_for("admin_login"))


        cursor = None

        try:

            cursor = connection.cursor(dictionary=True)


            # -------------------------------------------------
            # Find admin
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT
                    id,
                    name,
                    email,
                    password_hash
                FROM admins
                WHERE email = %s
                LIMIT 1
                """,
                (email,)
            )

            admin = cursor.fetchone()


            # -------------------------------------------------
            # Check admin credentials
            # -------------------------------------------------

            if admin and check_password_hash(
                admin["password_hash"],
                password
            ):

                session["admin_id"] = admin["id"]
                session["admin_name"] = admin["name"]
                session["admin_email"] = admin["email"]


                flash(
                    "Welcome back, {}!".format(admin["name"]),
                    "success"
                )


                return redirect(
                    url_for("admin_dashboard")
                )


            # -------------------------------------------------
            # Invalid credentials
            # -------------------------------------------------

            flash(
                "Invalid admin email or password.",
                "error"
            )

            return redirect(
                url_for("admin_login")
            )


        except Exception as error:

            print("Admin login error:")
            print(error)

            flash(
                "Something went wrong while logging in.",
                "error"
            )

            return redirect(
                url_for("admin_login")
            )


        finally:

            if cursor:
                cursor.close()

            connection.close()


    # -----------------------------------------------------
    # GET request
    # -----------------------------------------------------

    return render_template("admin/login.html")


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.route("/admin/dashboard")
def admin_dashboard():

    # -----------------------------------------------------
    # Protect dashboard
    # -----------------------------------------------------

    if not session.get("admin_id"):
        return redirect(url_for("admin_login"))


    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return render_template(
            "admin/dashboard.html",
            admin_name=session.get("admin_name", "Admin"),
            total_products=0,
            total_categories=0,
            total_users=0,
            available_products=0,
            products=[]
        )


    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)


        # -------------------------------------------------
        # Total products
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            """
        )

        total_products = cursor.fetchone()["total"]


        # -------------------------------------------------
        # Total categories
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM categories
            """
        )

        total_categories = cursor.fetchone()["total"]


        # -------------------------------------------------
        # Total users
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM users
            """
        )

        total_users = cursor.fetchone()["total"]


        # -------------------------------------------------
        # Available products
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            WHERE is_available = 1
            """
        )

        available_products = cursor.fetchone()["total"]


        # -------------------------------------------------
        # Recent products
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.stock,
                p.is_available,
                c.name AS category_name,

                (
                    SELECT pi.image_url
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                    ORDER BY
                        pi.is_primary DESC,
                        pi.id ASC
                    LIMIT 1
                ) AS image_url

            FROM products p

            LEFT JOIN categories c
                ON p.category_id = c.id

            ORDER BY p.created_at DESC

            LIMIT 10
            """
        )

        products = cursor.fetchall()


        return render_template(
            "admin/dashboard.html",
            admin_name=session.get(
                "admin_name",
                "Admin"
            ),
            total_products=total_products,
            total_categories=total_categories,
            total_users=total_users,
            available_products=available_products,
            products=products
        )


    except Exception as error:

        print("Dashboard error:")
        print(error)

        flash(
            "Unable to load dashboard data.",
            "error"
        )

        return render_template(
            "admin/dashboard.html",
            admin_name=session.get(
                "admin_name",
                "Admin"
            ),
            total_products=0,
            total_categories=0,
            total_users=0,
            available_products=0,
            products=[]
        )


    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# ADMIN PRODUCTS
# =========================================================

@app.route("/admin/products")
def admin_products():

    # -----------------------------------------------------
    # Protect page
    # -----------------------------------------------------

    if not session.get("admin_id"):
        return redirect(url_for("admin_login"))


    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return redirect(
            url_for("admin_dashboard")
        )


    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)


        cursor.execute(
            """
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.stock,
                p.shade,
                p.color,
                p.product_type,
                p.is_available,
                p.created_at,

                c.name AS category_name,

                (
                    SELECT pi.image_url
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                    ORDER BY
                        pi.is_primary DESC,
                        pi.id ASC
                    LIMIT 1
                ) AS image_url

            FROM products p

            LEFT JOIN categories c
                ON p.category_id = c.id

            ORDER BY p.created_at DESC
            """
        )

        products = cursor.fetchall()


        return render_template(
            "admin/products.html",
            admin_name=session.get(
                "admin_name",
                "Admin"
            ),
            products=products
        )


    except Exception as error:

        print("Products page error:")
        print(error)

        flash(
            "Unable to load products.",
            "error"
        )

        return redirect(
            url_for("admin_dashboard")
        )


    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# ADMIN LOGOUT
# =========================================================

@app.route("/admin/logout")
def admin_logout():

    session.pop("admin_id", None)
    session.pop("admin_name", None)
    session.pop("admin_email", None)


    flash(
        "You have been logged out.",
        "success"
    )


    return redirect(
        url_for("admin_login")
    )


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )