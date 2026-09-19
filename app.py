import os
import uuid
import re

from datetime import timedelta
from decimal import Decimal, InvalidOperation

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    flash
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from werkzeug.utils import secure_filename

from database.db import get_db_connection


# =========================================================
# FLASK APPLICATION
# =========================================================

app = Flask(__name__)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "glamora-ar-secret-key"
)


# =========================================================
# SESSION CONFIGURATION
# =========================================================

# Long-lived login session.
# The user can remain logged in for a very long time unless
# they logout, clear browser cookies, change secret key, etc.
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=3650)

app.config["SESSION_REFRESH_EACH_REQUEST"] = True
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False


# =========================================================
# FILE UPLOAD CONFIGURATION
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PRODUCT_UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "static",
    "uploads",
    "products"
)

REVIEW_UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "static",
    "uploads",
    "reviews"
)

os.makedirs(PRODUCT_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REVIEW_UPLOAD_FOLDER, exist_ok=True)

app.config["PRODUCT_UPLOAD_FOLDER"] = PRODUCT_UPLOAD_FOLDER
app.config["REVIEW_UPLOAD_FOLDER"] = REVIEW_UPLOAD_FOLDER

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024


# =========================================================
# IMAGE CONFIGURATION
# =========================================================

ALLOWED_IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif"
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def safe_close(cursor=None, connection=None):
    """
    Safely close database cursor and connection.
    """

    try:
        if cursor:
            cursor.close()
    except Exception:
        pass

    try:
        if connection:
            connection.close()
    except Exception:
        pass


def allowed_image(filename):
    """
    Check whether uploaded file has an allowed image extension.
    """

    if not filename:
        return False

    if "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()

    return extension in ALLOWED_IMAGE_EXTENSIONS


def normalize_product_type(product_type):
    """
    Convert different product type spellings into one standard key.
    """

    if not product_type:
        return ""

    value = str(product_type).strip().lower()

    value = value.replace("_", " ")
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"\s*-\s*", "-", value)

    aliases = {
        "lipstick": "lipstick",
        "lip stick": "lipstick",
        "lipsticks": "lipstick",

        "eyeshadow": "eyeshadow",
        "eye shadow": "eyeshadow",
        "eye shadows": "eyeshadow",
        "eyeshadows": "eyeshadow",

        "blush": "blush",
        "blushes": "blush",

        "eyeliner": "eyeliner",
        "eye liner": "eyeliner",
        "eyeliners": "eyeliner",

        "mascara": "mascara",
        "mascaras": "mascara",

        "foundation": "foundation",
        "foundations": "foundation",

        "highlighter": "highlighter",
        "highlighters": "highlighter",
        "highlight": "highlighter",
        "highlights": "highlighter"
    }

    if value in aliases:
        return aliases[value]

    return value.replace(" ", "-")


def prepare_products(products):
    """
    Add normalized product type key to each product.
    """

    prepared = []

    for product in products:
        try:
            product["product_type_key"] = normalize_product_type(
                product.get("product_type")
            )
        except Exception:
            product["product_type_key"] = ""

        prepared.append(product)

    return prepared


def get_bag_count():
    """
    Return total quantity of items in the logged-in user's cart.
    """

    user_id = session.get("user_id")

    if not user_id:
        return 0

    connection = None
    cursor = None

    try:
        connection = get_db_connection()

        if connection is None:
            return 0

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT COALESCE(SUM(quantity), 0) AS total
            FROM cart_items
            WHERE user_id = %s
            """,
            (user_id,)
        )

        result = cursor.fetchone()

        if result:
            return int(result.get("total") or 0)

        return 0

    except Exception as error:
        print("BAG COUNT ERROR:", error)
        return 0

    finally:
        safe_close(cursor, connection)


def get_current_user():
    """
    Get currently logged-in user.
    """

    user_id = session.get("user_id")

    if not user_id:
        return None

    connection = None
    cursor = None

    try:
        connection = get_db_connection()

        if connection is None:
            return None

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, email
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        return cursor.fetchone()

    except Exception as error:
        print("CURRENT USER ERROR:", error)
        return None

    finally:
        safe_close(cursor, connection)


# =========================================================
# GLOBAL TEMPLATE DATA
# =========================================================

@app.context_processor
def inject_global_data():

    current_user = get_current_user()

    return {
        "bag_count": get_bag_count(),
        "current_user": current_user,
        "is_logged_in": bool(session.get("user_id"))
    }


# =========================================================
# BEFORE REQUEST
# =========================================================

@app.before_request
def refresh_user_session():

    if session.get("user_id"):
        session.permanent = True


# =========================================================
# HOME
# =========================================================

@app.route("/")
def index():
    return render_template("index.html")


# =========================================================
# BEAUTY PAGE
# =========================================================

@app.route("/beauty")
def beauty():

    connection = None
    cursor = None

    products = []
    categories = []

    try:

        connection = get_db_connection()

        if connection is None:
            flash("Database connection failed.", "error")

            return render_template(
                "beauty.html",
                products=[],
                categories=[]
            )

        cursor = connection.cursor(dictionary=True)

        # -------------------------------------------------
        # PRODUCTS
        # -------------------------------------------------

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
                p.category_id,

                c.name AS category_name,

                LOWER(
                    REPLACE(
                        TRIM(c.name),
                        ' ',
                        '-'
                    )
                ) AS category_slug,

                LOWER(
                    REPLACE(
                        REPLACE(
                            TRIM(p.product_type),
                            ' ',
                            '-'
                        ),
                        '_',
                        '-'
                    )
                ) AS product_type_slug,

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
                ON c.id = p.category_id

            WHERE p.is_available = 1

            ORDER BY p.id DESC
            """
        )

        products = cursor.fetchall()

        products = prepare_products(products)

        # -------------------------------------------------
        # CATEGORIES
        # -------------------------------------------------

        try:

            cursor.execute(
                """
                SELECT
                    id,
                    name
                FROM categories
                ORDER BY name ASC
                """
            )

            categories = cursor.fetchall()

        except Exception as category_error:

            print("CATEGORY LOAD ERROR:", category_error)

            categories = []

        # -------------------------------------------------
        # DEBUG
        # -------------------------------------------------

        print()
        print("========================================")
        print("GLAMORA AR - BEAUTY PAGE")
        print("========================================")
        print("PRODUCT COUNT:", len(products))
        print("CATEGORY COUNT:", len(categories))

        for product in products:

            print(
                "PRODUCT:",
                product.get("id"),
                "|",
                product.get("name"),
                "| CATEGORY:",
                product.get("category_name"),
                "| TYPE:",
                product.get("product_type"),
                "| TYPE KEY:",
                product.get("product_type_key"),
                "| IMAGE:",
                product.get("image_url")
            )

        print("========================================")
        print()

        return render_template(
            "beauty.html",
            products=products,
            categories=categories
        )

    except Exception as error:

        print()
        print("========================================")
        print("BEAUTY PAGE ERROR")
        print("========================================")
        print("ERROR TYPE:", type(error).__name__)
        print("ERROR MESSAGE:", str(error))
        print("ERROR REPR:", repr(error))
        print("========================================")
        print()

        flash(
            "Unable to load beauty products.",
            "error"
        )

        return render_template(
            "beauty.html",
            products=[],
            categories=[]
        )

    finally:
        safe_close(cursor, connection)


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
# REGISTER
# =========================================================

@app.route("/register", methods=["GET", "POST"])
def register():

    # -----------------------------------------------------
    # GET NEXT PAGE
    # -----------------------------------------------------

    next_page = request.args.get("next", "").strip()

    if request.method == "POST":
        next_page = request.form.get(
            "next",
            next_page
        ).strip()

    # Only allow internal redirects.
    if not next_page.startswith("/"):
        next_page = ""

    # -----------------------------------------------------
    # ALREADY LOGGED IN
    # -----------------------------------------------------

    if session.get("user_id"):

        if next_page:
            return redirect(next_page)

        return redirect(url_for("profile"))

    # -----------------------------------------------------
    # GET REQUEST
    # -----------------------------------------------------

    if request.method == "GET":

        return render_template(
            "register.html",
            next_page=next_page
        )

    # -----------------------------------------------------
    # FORM DATA
    # -----------------------------------------------------

    name = request.form.get(
        "name",
        ""
    ).strip()

    email = request.form.get(
        "email",
        ""
    ).strip().lower()

    password = request.form.get(
        "password",
        ""
    )

    confirm_password = request.form.get(
        "confirm_password",
        ""
    )

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not name:

        flash(
            "Please enter your name.",
            "error"
        )

        return redirect(
            url_for(
                "register",
                next=next_page
            )
        )

    if len(name) < 2:

        flash(
            "Name must contain at least 2 characters.",
            "error"
        )

        return redirect(
            url_for(
                "register",
                next=next_page
            )
        )

    if not email:

        flash(
            "Please enter your email address.",
            "error"
        )

        return redirect(
            url_for(
                "register",
                next=next_page
            )
        )

    email_pattern = (
        r"^[A-Za-z0-9._%+-]+@"
        r"[A-Za-z0-9.-]+\."
        r"[A-Za-z]{2,}$"
    )

    if not re.match(email_pattern, email):

        flash(
            "Please enter a valid email address.",
            "error"
        )

        return redirect(
            url_for(
                "register",
                next=next_page
            )
        )

    if not password:

        flash(
            "Please enter a password.",
            "error"
        )

        return redirect(
            url_for(
                "register",
                next=next_page
            )
        )

    if len(password) < 6:

        flash(
            "Password must be at least 6 characters.",
            "error"
        )

        return redirect(
            url_for(
                "register",
                next=next_page
            )
        )

    if password != confirm_password:

        flash(
            "Passwords do not match.",
            "error"
        )

        return redirect(
            url_for(
                "register",
                next=next_page
            )
        )

    # -----------------------------------------------------
    # DATABASE
    # -----------------------------------------------------

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for(
                    "register",
                    next=next_page
                )
            )

        cursor = connection.cursor(dictionary=True)

        # -------------------------------------------------
        # CHECK EXISTING EMAIL
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:

            flash(
                "An account with this email already exists. Please login.",
                "error"
            )

            return redirect(
                url_for(
                    "login",
                    next=next_page
                )
            )

        # -------------------------------------------------
        # HASH PASSWORD
        # -------------------------------------------------

        hashed_password = generate_password_hash(
            password
        )

        # -------------------------------------------------
        # INSERT USER
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO users
            (
                name,
                email,
                password
            )
            VALUES
            (
                %s,
                %s,
                %s
            )
            """,
            (
                name,
                email,
                hashed_password
            )
        )

        connection.commit()

        print()
        print("========================================")
        print("REGISTRATION SUCCESS")
        print("========================================")
        print("NAME:", name)
        print("EMAIL:", email)
        print("========================================")
        print()

        flash(
            "Account created successfully. Please login with the same email and password.",
            "success"
        )

        if next_page:

            return redirect(
                url_for(
                    "login",
                    next=next_page
                )
            )

        return redirect(
            url_for("login")
        )

    except Exception as error:

        try:
            if connection:
                connection.rollback()
        except Exception:
            pass

        # -------------------------------------------------
        # IMPORTANT:
        # PRINT REAL DATABASE ERROR
        # -------------------------------------------------

        print()
        print("========================================")
        print("REGISTER ERROR")
        print("========================================")
        print("ERROR TYPE:", type(error).__name__)
        print("ERROR MESSAGE:", str(error))
        print("ERROR REPR:", repr(error))
        print("========================================")
        print()

        # Keep a user-friendly message on the page.
        # The real error is visible in the Flask terminal.
        flash(
            "Unable to create your account. Please try again.",
            "error"
        )

        return redirect(
            url_for(
                "register",
                next=next_page
            )
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# LOGIN
# =========================================================

@app.route("/login", methods=["GET", "POST"])
def login():

    # -----------------------------------------------------
    # NEXT PAGE
    # -----------------------------------------------------

    next_page = request.args.get(
        "next",
        ""
    ).strip()

    if request.method == "POST":

        next_page = request.form.get(
            "next",
            next_page
        ).strip()

    if not next_page.startswith("/"):
        next_page = ""

    # -----------------------------------------------------
    # ALREADY LOGGED IN
    # -----------------------------------------------------

    if session.get("user_id"):

        if next_page:
            return redirect(next_page)

        return redirect(
            url_for("profile")
        )

    # -----------------------------------------------------
    # LOGIN FORM
    # -----------------------------------------------------

    if request.method == "POST":

        email = request.form.get(
            "email",
            ""
        ).strip().lower()

        password = request.form.get(
            "password",
            ""
        )

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------

        if not email:

            flash(
                "Please enter your email.",
                "error"
            )

            return redirect(
                url_for(
                    "login",
                    next=next_page
                )
            )

        if not password:

            flash(
                "Please enter your password.",
                "error"
            )

            return redirect(
                url_for(
                    "login",
                    next=next_page
                )
            )

        connection = None
        cursor = None

        try:

            connection = get_db_connection()

            if connection is None:

                flash(
                    "Database connection failed.",
                    "error"
                )

                return redirect(
                    url_for(
                        "login",
                        next=next_page
                    )
                )

            cursor = connection.cursor(dictionary=True)

            # -------------------------------------------------
            # FIND USER
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT
                    id,
                    name,
                    email,
                    password
                FROM users
                WHERE LOWER(email) = %s
                LIMIT 1
                """,
                (email,)
            )

            user = cursor.fetchone()

            # -------------------------------------------------
            # INVALID USER
            # -------------------------------------------------

            if not user:

                flash(
                    "Invalid email or password.",
                    "error"
                )

                return redirect(
                    url_for(
                        "login",
                        next=next_page
                    )
                )

            # -------------------------------------------------
            # CHECK PASSWORD
            # -------------------------------------------------

            stored_password = user.get("password")

            if not stored_password:

                flash(
                    "Your account password is not configured correctly. Please contact the administrator.",
                    "error"
                )

                print()
                print("LOGIN ERROR:")
                print("Password field is empty for user:", user.get("email"))
                print()

                return redirect(
                    url_for(
                        "login",
                        next=next_page
                    )
                )

            if not check_password_hash(
                stored_password,
                password
            ):

                flash(
                    "Invalid email or password.",
                    "error"
                )

                return redirect(
                    url_for(
                        "login",
                        next=next_page
                    )
                )

            # -------------------------------------------------
            # CREATE SESSION
            # -------------------------------------------------

            session.permanent = True

            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["user_email"] = user["email"]
            session["logged_in"] = True

            print()
            print("========================================")
            print("LOGIN SUCCESS")
            print("========================================")
            print("USER ID:", user["id"])
            print("NAME:", user["name"])
            print("EMAIL:", user["email"])
            print("========================================")
            print()

            if next_page:

                return redirect(next_page)

            return redirect(
                url_for("profile")
            )

        except Exception as error:

            print()
            print("========================================")
            print("LOGIN ERROR")
            print("========================================")
            print("ERROR TYPE:", type(error).__name__)
            print("ERROR MESSAGE:", str(error))
            print("ERROR REPR:", repr(error))
            print("========================================")
            print()

            flash(
                "Unable to login. Please try again.",
                "error"
            )

            return redirect(
                url_for(
                    "login",
                    next=next_page
                )
            )

        finally:

            safe_close(
                cursor,
                connection
            )

    # -----------------------------------------------------
    # LOGIN PAGE
    # -----------------------------------------------------

    return render_template(
        "login.html",
        next_page=next_page
    )


# =========================================================
# LOGOUT
# =========================================================

@app.route("/logout")
def logout():

    session.pop("user_id", None)
    session.pop("user_name", None)
    session.pop("user_email", None)
    session.pop("logged_in", None)

    flash(
        "You have been logged out successfully.",
        "success"
    )

    return redirect(
        url_for("index")
    )


# =========================================================
# PROFILE
# =========================================================

@app.route("/profile")
def profile():

    user_id = session.get("user_id")

    if not user_id:

        flash(
            "Please login to view your profile.",
            "error"
        )

        return redirect(
            url_for(
                "login",
                next=url_for("profile")
            )
        )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for("index")
            )

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                name,
                email
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:

            session.pop("user_id", None)
            session.pop("user_name", None)
            session.pop("user_email", None)
            session.pop("logged_in", None)

            flash(
                "Your account could not be found. Please login again.",
                "error"
            )

            return redirect(
                url_for("login")
            )

        return render_template(
            "profile.html",
            user=user,
            bag_count=get_bag_count()
        )

    except Exception as error:

        print()
        print("PROFILE ERROR:", error)
        print()

        flash(
            "Unable to load your profile.",
            "error"
        )

        return redirect(
            url_for("index")
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# PRODUCT DETAILS
# =========================================================

@app.route("/product/<int:product_id>")
def product_details(product_id):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for("beauty")
            )

        cursor = connection.cursor(dictionary=True)

        # -------------------------------------------------
        # PRODUCT
        # -------------------------------------------------

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
                p.category_id,

                c.name AS category_name

            FROM products p

            LEFT JOIN categories c
                ON c.id = p.category_id

            WHERE p.id = %s

            LIMIT 1
            """,
            (product_id,)
        )

        product = cursor.fetchone()

        if not product:

            flash(
                "Product not found.",
                "error"
            )

            return redirect(
                url_for("beauty")
            )

        # -------------------------------------------------
        # PRODUCT IMAGES
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                product_id,
                image_url,
                is_primary
            FROM product_images
            WHERE product_id = %s
            ORDER BY
                is_primary DESC,
                id ASC
            """,
            (product_id,)
        )

        images = cursor.fetchall()

        if images:

            product["image_url"] = images[0].get(
                "image_url"
            )

        else:

            product["image_url"] = None

        # -------------------------------------------------
        # REVIEWS
        # -------------------------------------------------

        try:

            cursor.execute(
                """
                SELECT
                    id,
                    customer_name,
                    rating,
                    review_text,
                    review_image,
                    created_at
                FROM product_reviews
                WHERE product_id = %s
                ORDER BY created_at DESC
                """,
                (product_id,)
            )

            reviews = cursor.fetchall()

        except Exception as review_error:

            print(
                "REVIEW LOAD ERROR:",
                review_error
            )

            reviews = []

        # -------------------------------------------------
        # REVIEW SUMMARY
        # -------------------------------------------------

        review_count = len(reviews)

        if review_count > 0:

            total_rating = sum(
                float(review.get("rating") or 0)
                for review in reviews
            )

            average_rating = round(
                total_rating / review_count,
                1
            )

        else:

            average_rating = 0

        # -------------------------------------------------
        # DEBUG
        # -------------------------------------------------

        print()
        print("========================================")
        print("GLAMORA AR - PRODUCT DETAILS")
        print("========================================")
        print("PRODUCT ID:", product.get("id"))
        print("PRODUCT NAME:", product.get("name"))
        print("IMAGE COUNT:", len(images))
        print("REVIEW COUNT:", review_count)
        print("AVERAGE RATING:", average_rating)
        print("========================================")
        print()

        return render_template(
            "product_details.html",
            product=product,
            images=images,
            reviews=reviews,
            review_count=review_count,
            average_rating=average_rating
        )

    except Exception as error:

        print()
        print("========================================")
        print("PRODUCT DETAILS ERROR")
        print("========================================")
        print("PRODUCT ID:", product_id)
        print("ERROR TYPE:", type(error).__name__)
        print("ERROR MESSAGE:", str(error))
        print("ERROR REPR:", repr(error))
        print("========================================")
        print()

        flash(
            "Unable to load product.",
            "error"
        )

        return redirect(
            url_for("beauty")
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# ADD REVIEW
# =========================================================

@app.route(
    "/product/<int:product_id>/review",
    methods=["POST"]
)
def add_review(product_id):

    # -----------------------------------------------------
    # LOGIN REQUIRED
    # -----------------------------------------------------

    user_id = session.get("user_id")

    if not user_id:

        flash(
            "Please login to submit a review.",
            "error"
        )

        return redirect(
            url_for(
                "login",
                next=url_for(
                    "product_details",
                    product_id=product_id
                )
            )
        )

    rating = request.form.get(
        "rating",
        ""
    ).strip()

    review_text = request.form.get(
        "review_text",
        ""
    ).strip()

    # -----------------------------------------------------
    # RATING VALIDATION
    # -----------------------------------------------------

    try:

        rating = int(rating)

    except (TypeError, ValueError):

        flash(
            "Please select a valid rating.",
            "error"
        )

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    if rating < 1 or rating > 5:

        flash(
            "Rating must be between 1 and 5.",
            "error"
        )

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    connection = None
    cursor = None

    saved_file = None

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for(
                    "product_details",
                    product_id=product_id
                )
            )

        cursor = connection.cursor(dictionary=True)

        # -------------------------------------------------
        # GET USER
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                name
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:

            flash(
                "User account not found.",
                "error"
            )

            return redirect(
                url_for("login")
            )

        customer_name = user.get("name") or "Customer"

        # -------------------------------------------------
        # REVIEW IMAGE
        # -------------------------------------------------

        review_image = request.files.get(
            "review_image"
        )

        review_image_path = None

        if review_image and review_image.filename:

            filename = secure_filename(
                review_image.filename
            )

            if not allowed_image(filename):

                flash(
                    "Invalid review image format.",
                    "error"
                )

                return redirect(
                    url_for(
                        "product_details",
                        product_id=product_id
                    )
                )

            review_image.seek(0)

            image_data = review_image.read()

            if len(image_data) > MAX_IMAGE_SIZE:

                flash(
                    "Review image must be smaller than 5 MB.",
                    "error"
                )

                return redirect(
                    url_for(
                        "product_details",
                        product_id=product_id
                    )
                )

            extension = filename.rsplit(
                ".",
                1
            )[1].lower()

            unique_filename = (
                f"review_{uuid.uuid4().hex}.{extension}"
            )

            saved_file = os.path.join(
                app.config["REVIEW_UPLOAD_FOLDER"],
                unique_filename
            )

            with open(saved_file, "wb") as file:

                file.write(image_data)

            review_image_path = (
                f"uploads/reviews/{unique_filename}"
            )

        # -------------------------------------------------
        # INSERT REVIEW
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO product_reviews
            (
                product_id,
                user_id,
                customer_name,
                rating,
                review_text,
                review_image
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                product_id,
                user_id,
                customer_name,
                rating,
                review_text,
                review_image_path
            )
        )

        connection.commit()

        flash(
            "Your review has been submitted successfully.",
            "success"
        )

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    except Exception as error:

        try:
            if connection:
                connection.rollback()
        except Exception:
            pass

        if saved_file:

            try:

                if os.path.exists(saved_file):
                    os.remove(saved_file)

            except Exception:
                pass

        print()
        print("========================================")
        print("REVIEW ERROR")
        print("========================================")
        print("PRODUCT ID:", product_id)
        print("ERROR TYPE:", type(error).__name__)
        print("ERROR MESSAGE:", str(error))
        print("ERROR REPR:", repr(error))
        print("========================================")
        print()

        flash(
            "Unable to submit your review. Please try again.",
            "error"
        )

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# ADD TO CART
# =========================================================

@app.route(
    "/cart/add/<int:product_id>",
    methods=["POST"]
)
def add_to_cart(product_id):

    # -----------------------------------------------------
    # LOGIN REQUIRED
    # -----------------------------------------------------

    user_id = session.get("user_id")

    if not user_id:

        flash(
            "Please login to add products to your bag.",
            "error"
        )

        return redirect(
            url_for(
                "login",
                next=url_for(
                    "product_details",
                    product_id=product_id
                )
            )
        )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for(
                    "product_details",
                    product_id=product_id
                )
            )

        cursor = connection.cursor(dictionary=True)

        # -------------------------------------------------
        # PRODUCT
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                name,
                price,
                stock,
                is_available
            FROM products
            WHERE id = %s
            LIMIT 1
            """,
            (product_id,)
        )

        product = cursor.fetchone()

        if not product:

            flash(
                "Product not found.",
                "error"
            )

            return redirect(
                url_for("beauty")
            )

        if not product.get("is_available"):

            flash(
                "This product is currently unavailable.",
                "error"
            )

            return redirect(
                url_for(
                    "product_details",
                    product_id=product_id
                )
            )

        stock = int(
            product.get("stock") or 0
        )

        if stock <= 0:

            flash(
                "This product is out of stock.",
                "error"
            )

            return redirect(
                url_for(
                    "product_details",
                    product_id=product_id
                )
            )

        # -------------------------------------------------
        # EXISTING CART ITEM
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                quantity
            FROM cart_items
            WHERE user_id = %s
              AND product_id = %s
            LIMIT 1
            """,
            (
                user_id,
                product_id
            )
        )

        existing_item = cursor.fetchone()

        if existing_item:

            current_quantity = int(
                existing_item.get("quantity") or 0
            )

            new_quantity = current_quantity + 1

            if new_quantity > stock:

                new_quantity = stock

                flash(
                    "You have reached the maximum available quantity.",
                    "error"
                )

            else:

                flash(
                    "Product quantity updated in your bag.",
                    "success"
                )

            cursor.execute(
                """
                UPDATE cart_items
                SET quantity = %s
                WHERE id = %s
                """,
                (
                    new_quantity,
                    existing_item["id"]
                )
            )

        else:

            cursor.execute(
                """
                INSERT INTO cart_items
                (
                    user_id,
                    product_id,
                    quantity
                )
                VALUES
                (
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    user_id,
                    product_id,
                    1
                )
            )

            flash(
                "Product added to your bag.",
                "success"
            )

        connection.commit()

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    except Exception as error:

        try:
            if connection:
                connection.rollback()
        except Exception:
            pass

        print()
        print("========================================")
        print("ADD TO CART ERROR")
        print("========================================")
        print("PRODUCT ID:", product_id)
        print("ERROR TYPE:", type(error).__name__)
        print("ERROR MESSAGE:", str(error))
        print("ERROR REPR:", repr(error))
        print("========================================")
        print()

        flash(
            "Unable to add product to your bag.",
            "error"
        )

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# BUY NOW
# =========================================================

@app.route(
    "/buy-now/<int:product_id>",
    methods=["POST"]
)
def buy_now(product_id):

    user_id = session.get("user_id")

    if not user_id:

        flash(
            "Please login before buying this product.",
            "error"
        )

        return redirect(
            url_for(
                "login",
                next=url_for(
                    "product_details",
                    product_id=product_id
                )
            )
        )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for(
                    "product_details",
                    product_id=product_id
                )
            )

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                name,
                stock,
                is_available
            FROM products
            WHERE id = %s
            LIMIT 1
            """,
            (product_id,)
        )

        product = cursor.fetchone()

        if not product:

            flash(
                "Product not found.",
                "error"
            )

            return redirect(
                url_for("beauty")
            )

        if not product.get("is_available"):

            flash(
                "This product is currently unavailable.",
                "error"
            )

            return redirect(
                url_for(
                    "product_details",
                    product_id=product_id
                )
            )

        stock = int(
            product.get("stock") or 0
        )

        if stock <= 0:

            flash(
                "This product is out of stock.",
                "error"
            )

            return redirect(
                url_for(
                    "product_details",
                    product_id=product_id
                )
            )

        # -------------------------------------------------
        # ADD / UPDATE CART
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                quantity
            FROM cart_items
            WHERE user_id = %s
              AND product_id = %s
            LIMIT 1
            """,
            (
                user_id,
                product_id
            )
        )

        existing_item = cursor.fetchone()

        if existing_item:

            quantity = min(
                int(existing_item.get("quantity") or 0) + 1,
                stock
            )

            cursor.execute(
                """
                UPDATE cart_items
                SET quantity = %s
                WHERE id = %s
                """,
                (
                    quantity,
                    existing_item["id"]
                )
            )

        else:

            cursor.execute(
                """
                INSERT INTO cart_items
                (
                    user_id,
                    product_id,
                    quantity
                )
                VALUES
                (
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    user_id,
                    product_id,
                    1
                )
            )

        connection.commit()

        return redirect(
            url_for("cart")
        )

    except Exception as error:

        try:
            if connection:
                connection.rollback()
        except Exception:
            pass

        print()
        print("BUY NOW ERROR:", error)
        print()

        flash(
            "Unable to process your request.",
            "error"
        )

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# CART
# =========================================================

@app.route("/cart")
def cart():

    user_id = session.get("user_id")

    if not user_id:

        flash(
            "Please login to view your bag.",
            "error"
        )

        return redirect(
            url_for(
                "login",
                next=url_for("cart")
            )
        )

    connection = None
    cursor = None

    cart_items = []
    subtotal = Decimal("0.00")

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return render_template(
                "cart.html",
                cart_items=[],
                subtotal=0,
                bag_count=0
            )

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                ci.id,
                ci.product_id,
                ci.quantity,

                p.name,
                p.description,
                p.price,
                p.stock,
                p.shade,
                p.color,

                (
                    SELECT pi.image_url
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                    ORDER BY
                        pi.is_primary DESC,
                        pi.id ASC
                    LIMIT 1
                ) AS image_url

            FROM cart_items ci

            INNER JOIN products p
                ON p.id = ci.product_id

            WHERE ci.user_id = %s

            ORDER BY ci.id DESC
            """,
            (user_id,)
        )

        cart_items = cursor.fetchall()

        for item in cart_items:

            try:

                price = Decimal(
                    str(item.get("price") or 0)
                )

                quantity = int(
                    item.get("quantity") or 0
                )

                item["item_total"] = (
                    price * quantity
                )

                subtotal += item["item_total"]

            except (
                InvalidOperation,
                ValueError,
                TypeError
            ):

                item["item_total"] = Decimal("0.00")

        return render_template(
            "cart.html",
            cart_items=cart_items,
            subtotal=subtotal,
            bag_count=get_bag_count()
        )

    except Exception as error:

        print()
        print("========================================")
        print("CART ERROR")
        print("========================================")
        print("ERROR TYPE:", type(error).__name__)
        print("ERROR MESSAGE:", str(error))
        print("========================================")
        print()

        flash(
            "Unable to load your bag.",
            "error"
        )

        return render_template(
            "cart.html",
            cart_items=[],
            subtotal=Decimal("0.00"),
            bag_count=0
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# ADMIN REQUIRED
# =========================================================

def admin_required():

    return bool(
        session.get("admin_id")
    )


# =========================================================
# ADMIN LOGIN
# =========================================================

@app.route(
    "/admin",
    methods=["GET", "POST"]
)
def admin_login():

    if session.get("admin_id"):

        return redirect(
            url_for("admin_dashboard")
        )

    if request.method == "POST":

        email = request.form.get(
            "email",
            ""
        ).strip().lower()

        password = request.form.get(
            "password",
            ""
        )

        connection = None
        cursor = None

        try:

            connection = get_db_connection()

            if connection is None:

                flash(
                    "Database connection failed.",
                    "error"
                )

                return redirect(
                    url_for("admin_login")
                )

            cursor = connection.cursor(
                dictionary=True
            )

            cursor.execute(
                """
                SELECT
                    id,
                    name,
                    email,
                    password_hash
                FROM admins
                WHERE LOWER(email) = %s
                LIMIT 1
                """,
                (email,)
            )

            admin = cursor.fetchone()

            if not admin:

                flash(
                    "Invalid admin email or password.",
                    "error"
                )

                return redirect(
                    url_for("admin_login")
                )

            if not check_password_hash(
                admin["password_hash"],
                password
            ):

                flash(
                    "Invalid admin email or password.",
                    "error"
                )

                return redirect(
                    url_for("admin_login")
                )

            session.permanent = True

            session["admin_id"] = admin["id"]
            session["admin_name"] = admin["name"]
            session["admin_email"] = admin["email"]

            return redirect(
                url_for("admin_dashboard")
            )

        except Exception as error:

            print()
            print("ADMIN LOGIN ERROR:", error)
            print()

            flash(
                "Unable to login as admin.",
                "error"
            )

            return redirect(
                url_for("admin_login")
            )

        finally:

            safe_close(
                cursor,
                connection
            )

    return render_template(
        "admin/login.html"
    )


# =========================================================
# ADMIN LOGOUT
# =========================================================

@app.route("/admin/logout")
def admin_logout():

    session.pop("admin_id", None)
    session.pop("admin_name", None)
    session.pop("admin_email", None)

    flash(
        "Admin logged out successfully.",
        "success"
    )

    return redirect(
        url_for("admin_login")
    )


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.route("/admin/dashboard")
def admin_dashboard():

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    connection = None
    cursor = None

    stats = {
        "products": 0,
        "categories": 0,
        "users": 0,
        "available": 0
    }

    recent_products = []

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return render_template(
                "admin/dashboard.html",
                stats=stats,
                recent_products=[]
            )

        cursor = connection.cursor(
            dictionary=True
        )

        # -------------------------------------------------
        # PRODUCT COUNT
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            """
        )

        stats["products"] = int(
            cursor.fetchone()["total"] or 0
        )

        # -------------------------------------------------
        # CATEGORY COUNT
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM categories
            """
        )

        stats["categories"] = int(
            cursor.fetchone()["total"] or 0
        )

        # -------------------------------------------------
        # USER COUNT
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM users
            """
        )

        stats["users"] = int(
            cursor.fetchone()["total"] or 0
        )

        # -------------------------------------------------
        # AVAILABLE PRODUCTS
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            WHERE is_available = 1
            """
        )

        stats["available"] = int(
            cursor.fetchone()["total"] or 0
        )

        # -------------------------------------------------
        # RECENT PRODUCTS
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                p.id,
                p.name,
                p.price,
                p.stock,
                p.product_type,
                p.created_at,

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

            ORDER BY p.id DESC

            LIMIT 10
            """
        )

        recent_products = cursor.fetchall()

        return render_template(
            "admin/dashboard.html",
            stats=stats,
            recent_products=recent_products
        )

    except Exception as error:

        print()
        print("ADMIN DASHBOARD ERROR:", error)
        print()

        flash(
            "Unable to load dashboard.",
            "error"
        )

        return render_template(
            "admin/dashboard.html",
            stats=stats,
            recent_products=[]
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# ADMIN PRODUCTS
# =========================================================

@app.route("/admin/products")
def admin_products():

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    connection = None
    cursor = None

    products = []

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return render_template(
                "admin/products.html",
                products=[]
            )

        cursor = connection.cursor(
            dictionary=True
        )

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
                p.category_id,
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
                ON c.id = p.category_id

            ORDER BY p.id DESC
            """
        )

        products = cursor.fetchall()

        return render_template(
            "admin/products.html",
            products=products
        )

    except Exception as error:

        print()
        print("ADMIN PRODUCTS ERROR:", error)
        print()

        flash(
            "Unable to load products.",
            "error"
        )

        return render_template(
            "admin/products.html",
            products=[]
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# ADMIN ADD PRODUCT
# =========================================================

@app.route(
    "/admin/products/add",
    methods=["GET", "POST"]
)
def admin_add_product():

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    connection = None
    cursor = None

    if request.method == "GET":

        try:

            connection = get_db_connection()

            if connection is None:

                flash(
                    "Database connection failed.",
                    "error"
                )

                return redirect(
                    url_for("admin_products")
                )

            cursor = connection.cursor(
                dictionary=True
            )

            cursor.execute(
                """
                SELECT
                    id,
                    name
                FROM categories
                ORDER BY name ASC
                """
            )

            categories = cursor.fetchall()

            return render_template(
                "admin/add_product.html",
                categories=categories
            )

        except Exception as error:

            print()
            print("LOAD ADD PRODUCT ERROR:", error)
            print()

            flash(
                "Unable to load add product page.",
                "error"
            )

            return redirect(
                url_for("admin_products")
            )

        finally:

            safe_close(
                cursor,
                connection
            )

    # -----------------------------------------------------
    # POST
    # -----------------------------------------------------

    name = request.form.get(
        "name",
        ""
    ).strip()

    description = request.form.get(
        "description",
        ""
    ).strip()

    price = request.form.get(
        "price",
        ""
    ).strip()

    stock = request.form.get(
        "stock",
        "0"
    ).strip()

    shade = request.form.get(
        "shade",
        ""
    ).strip()

    color = request.form.get(
        "color",
        ""
    ).strip()

    product_type = request.form.get(
        "product_type",
        ""
    ).strip()

    category_id = request.form.get(
        "category_id",
        ""
    ).strip()

    is_available = 1 if request.form.get(
        "is_available"
    ) else 0

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not name:

        flash(
            "Product name is required.",
            "error"
        )

        return redirect(
            url_for("admin_add_product")
        )

    if not price:

        flash(
            "Product price is required.",
            "error"
        )

        return redirect(
            url_for("admin_add_product")
        )

    try:

        price_decimal = Decimal(price)

        if price_decimal < 0:
            raise InvalidOperation

    except (
        InvalidOperation,
        ValueError,
        TypeError
    ):

        flash(
            "Please enter a valid product price.",
            "error"
        )

        return redirect(
            url_for("admin_add_product")
        )

    try:

        stock_int = int(stock)

        if stock_int < 0:
            raise ValueError

    except (
        ValueError,
        TypeError
    ):

        flash(
            "Please enter a valid stock quantity.",
            "error"
        )

        return redirect(
            url_for("admin_add_product")
        )

    if not category_id:

        flash(
            "Please select a category.",
            "error"
        )

        return redirect(
            url_for("admin_add_product")
        )

    try:

        category_id_int = int(category_id)

    except (
        ValueError,
        TypeError
    ):

        flash(
            "Invalid category.",
            "error"
        )

        return redirect(
            url_for("admin_add_product")
        )

    # -----------------------------------------------------
    # DATABASE
    # -----------------------------------------------------

    connection = None
    cursor = None

    saved_files = []

    try:

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for("admin_add_product")
            )

        cursor = connection.cursor(
            dictionary=True
        )

        # -------------------------------------------------
        # INSERT PRODUCT
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO products
            (
                name,
                description,
                price,
                stock,
                shade,
                color,
                product_type,
                is_available,
                category_id
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                name,
                description,
                price_decimal,
                stock_int,
                shade,
                color,
                product_type,
                is_available,
                category_id_int
            )
        )

        product_id = cursor.lastrowid

        # -------------------------------------------------
        # PRODUCT IMAGES
        # -------------------------------------------------

        image_files = request.files.getlist(
            "images"
        )

        # Some forms may use "image" instead.
        if not image_files:

            single_image = request.files.get(
                "image"
            )

            if single_image:

                image_files = [
                    single_image
                ]

        image_index = 0

        for image in image_files:

            if not image:
                continue

            if not image.filename:
                continue

            filename = secure_filename(
                image.filename
            )

            if not allowed_image(filename):

                raise ValueError(
                    "One or more uploaded images have an invalid format."
                )

            image.seek(0)

            image_data = image.read()

            if len(image_data) > MAX_IMAGE_SIZE:

                raise ValueError(
                    "Each product image must be smaller than 5 MB."
                )

            extension = filename.rsplit(
                ".",
                1
            )[1].lower()

            unique_filename = (
                f"product_{uuid.uuid4().hex}.{extension}"
            )

            file_path = os.path.join(
                app.config["PRODUCT_UPLOAD_FOLDER"],
                unique_filename
            )

            with open(
                file_path,
                "wb"
            ) as uploaded_file:

                uploaded_file.write(
                    image_data
                )

            saved_files.append(
                file_path
            )

            image_url = (
                f"uploads/products/{unique_filename}"
            )

            is_primary = 1 if image_index == 0 else 0

            cursor.execute(
                """
                INSERT INTO product_images
                (
                    product_id,
                    image_url,
                    is_primary
                )
                VALUES
                (
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    product_id,
                    image_url,
                    is_primary
                )
            )

            image_index += 1

        connection.commit()

        print()
        print("========================================")
        print("PRODUCT ADDED SUCCESSFULLY")
        print("========================================")
        print("PRODUCT ID:", product_id)
        print("PRODUCT NAME:", name)
        print("PRODUCT TYPE:", product_type)
        print("CATEGORY ID:", category_id_int)
        print("IMAGE COUNT:", image_index)
        print("========================================")
        print()

        flash(
            "Product added successfully.",
            "success"
        )

        return redirect(
            url_for("admin_products")
        )

    except Exception as error:

        try:

            if connection:
                connection.rollback()

        except Exception:
            pass

        # -------------------------------------------------
        # DELETE SAVED FILES IF DATABASE INSERT FAILED
        # -------------------------------------------------

        for file_path in saved_files:

            try:

                if os.path.exists(file_path):
                    os.remove(file_path)

            except Exception:
                pass

        print()
        print("========================================")
        print("ADD PRODUCT ERROR")
        print("========================================")
        print("ERROR TYPE:", type(error).__name__)
        print("ERROR MESSAGE:", str(error))
        print("ERROR REPR:", repr(error))
        print("========================================")
        print()

        flash(
            "Unable to add product. Please check the terminal for the exact error.",
            "error"
        )

        return redirect(
            url_for("admin_add_product")
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    print()
    print("========================================")
    print("GLAMORA AR")
    print("========================================")
    print("Starting Flask server...")
    print("URL: http://127.0.0.1:5000")
    print("========================================")
    print()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )