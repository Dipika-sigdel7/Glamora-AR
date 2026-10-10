import os
import uuid
import re


from urllib.parse import urlparse
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    flash,
    jsonify
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
# CURRENCY CONFIGURATION
# =========================================================

CURRENCY_SYMBOL = "Rs."
CURRENCY_CODE = "NPR"


def format_npr(value):

    try:
        amount = Decimal(
            str(value or 0)
        )

    except (
        InvalidOperation,
        ValueError,
        TypeError
    ):

        amount = Decimal("0.00")

    return f"{CURRENCY_SYMBOL} {amount:,.2f}"


# =========================================================
# SESSION CONFIGURATION
# =========================================================

app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(
    days=3650
)

app.config["SESSION_REFRESH_EACH_REQUEST"] = True

app.config["SESSION_COOKIE_HTTPONLY"] = True

app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

app.config["SESSION_COOKIE_SECURE"] = False


# =========================================================
# BASE DIRECTORY
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)


# =========================================================
# UPLOAD DIRECTORIES
# =========================================================

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

os.makedirs(
    PRODUCT_UPLOAD_FOLDER,
    exist_ok=True
)

os.makedirs(
    REVIEW_UPLOAD_FOLDER,
    exist_ok=True
)

app.config["PRODUCT_UPLOAD_FOLDER"] = PRODUCT_UPLOAD_FOLDER

app.config["REVIEW_UPLOAD_FOLDER"] = REVIEW_UPLOAD_FOLDER

app.config["MAX_CONTENT_LENGTH"] = (
    50 * 1024 * 1024
)


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

MAX_IMAGE_SIZE = (
    5 * 1024 * 1024
)


# =========================================================
# DATABASE RESOURCE HELPER
# =========================================================

def safe_close(cursor=None, connection=None):

    try:

        if cursor is not None:
            cursor.close()

    except Exception:
        pass

    try:

        if connection is not None:
            connection.close()

    except Exception:
        pass


# =========================================================
# IMAGE VALIDATION
# =========================================================

def allowed_image(filename):

    if not filename:
        return False

    if "." not in filename:
        return False

    extension = filename.rsplit(
        ".",
        1
    )[1].lower()

    return extension in ALLOWED_IMAGE_EXTENSIONS


# =========================================================
# PRODUCT TYPE NORMALIZATION
# =========================================================

def normalize_product_type(product_type):

    if not product_type:
        return ""

    value = str(
        product_type
    ).strip().lower()

    value = value.replace(
        "_",
        " "
    )

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    value = re.sub(
        r"\s*-\s*",
        "-",
        value
    )

    aliases = {

        "lipstick":
            "lipstick",

        "lipsticks":
            "lipstick",

        "liquid lipstick":
            "lipstick",

        "liquid-lipstick":
            "lipstick",

        "eyeshadow":
            "eyeshadow",

        "eyeshadows":
            "eyeshadow",

        "eye shadow":
            "eyeshadow",

        "eye-shadows":
            "eyeshadow",

        "blush":
            "blush",

        "blushes":
            "blush",

        "eyeliner":
            "eyeliner",

        "eyeliners":
            "eyeliner",

        "eye liner":
            "eyeliner",

        "eye-liner":
            "eyeliner",

        "mascara":
            "mascara",

        "mascaras":
            "mascara",

        "foundation":
            "foundation",

        "foundations":
            "foundation",

        "highlighter":
            "highlighter",

        "highlighters":
            "highlighter",

        "highlight":
            "highlighter",

        "highlights":
            "highlighter"
    }

    if value in aliases:
        return aliases[value]

    return value.replace(
        " ",
        "-"
    )


# =========================================================
# PREPARE PRODUCTS
# =========================================================

def prepare_products(products):

    if not products:
        return []

    for product in products:

        product_type = product.get(
            "product_type"
        )

        product["product_type_key"] = (
            normalize_product_type(
                product_type
            )
        )

        # -------------------------------------------------
        # CATEGORY SLUG
        # -------------------------------------------------

        category_name = product.get(
            "category_name"
        )

        if category_name:

            category_slug = re.sub(
                r"[^a-z0-9]+",
                "-",
                str(
                    category_name
                ).lower()
            ).strip("-")

            product["category_slug"] = (
                category_slug
            )

        else:

            product["category_slug"] = ""


        # -------------------------------------------------
        # PRODUCT TYPE SLUG
        # -------------------------------------------------

        product["product_type_slug"] = (
            product["product_type_key"]
        )


        # -------------------------------------------------
        # NPR PRICE
        # -------------------------------------------------

        try:

            product["price"] = Decimal(
                str(
                    product.get(
                        "price",
                        0
                    ) or 0
                )
            )

        except (
            InvalidOperation,
            ValueError,
            TypeError
        ):

            product["price"] = Decimal(
                "0.00"
            )

    return products


# =========================================================
# GET BAG COUNT
# =========================================================

def get_bag_count():

    user_id = session.get(
        "user_id"
    )

    if not user_id:
        return 0

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:
            return 0

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                COALESCE(
                    SUM(quantity),
                    0
                ) AS bag_count
            FROM cart_items
            WHERE user_id = %s
            """,
            (user_id,)
        )

        result = cursor.fetchone()

        if result:

            return int(
                result.get(
                    "bag_count",
                    0
                ) or 0
            )

        return 0

    except Exception as error:

        print(
            "BAG COUNT ERROR:",
            repr(error)
        )

        return 0

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# GET CURRENT USER
# =========================================================

def get_current_user():

    user_id = session.get(
        "user_id"
    )

    if not user_id:
        return None

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:
            return None

        cursor = connection.cursor(
            dictionary=True
        )

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

        return cursor.fetchone()

    except Exception as error:

        print(
            "CURRENT USER ERROR:",
            repr(error)
        )

        return None

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# GLOBAL TEMPLATE DATA
# =========================================================

@app.context_processor
def inject_global_data():

    current_user = get_current_user()

    return {
        "bag_count":
            get_bag_count(),

        "current_user":
            current_user,

        "is_logged_in":
            bool(
                session.get(
                    "user_id"
                )
            ),

        "currency_symbol":
            CURRENCY_SYMBOL,

        "currency_code":
            CURRENCY_CODE,

        "format_npr":
            format_npr
    }


# =========================================================
# REFRESH USER SESSION
# =========================================================

@app.before_request
def refresh_user_session():

    if session.get("user_id"):

        session.permanent = True


# =========================================================
# ADMIN AUTHENTICATION CHECK
# =========================================================

def admin_required():

    return bool(
        session.get("admin_id")
    )


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def index():

    return render_template(
        "index.html"
    )


# =========================================================
# HOME COMPATIBILITY ROUTE
# =========================================================

@app.route("/home")
def home():

    return redirect(
        url_for("index")
    )


# =========================================================
# BEAUTY PAGE
# =========================================================

@app.route("/beauty")
def beauty():

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
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

                c.name AS category_name,

                (
                    SELECT
                        pi.image_url
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

            WHERE p.is_available = 1

            ORDER BY p.id DESC
            """
        )

        products = (
            cursor.fetchall() or []
        )

        products = prepare_products(
            products
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

        categories = (
            cursor.fetchall() or []
        )

        return render_template(
            "beauty.html",
            products=products,
            categories=categories
        )

    except Exception as error:

        print(
            "BEAUTY PAGE ERROR:",
            repr(error)
        )

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

        safe_close(
            cursor,
            connection
        )


# =========================================================
# ABOUT
# =========================================================

@app.route("/about")
def about():

    return render_template(
        "about.html"
    )


# =========================================================
# CONTACT
# =========================================================

@app.route("/contact")
def contact():

    return render_template(
        "contact.html"
    )


# =========================================================
# USER REGISTER
# =========================================================

@app.route(
    "/register",
    methods=["GET", "POST"]
)
def register():

    next_url = request.args.get(
        "next",
        ""
    ).strip()

    if (
        not next_url.startswith("/")
        or next_url.startswith("//")
    ):

        next_url = ""

    if session.get("user_id"):

        if next_url:

            return redirect(
                next_url
            )

        return redirect(
            url_for("profile")
        )

    if request.method == "GET":

        return render_template(
            "register.html",
            next=next_url
        )

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

    form_next_url = request.form.get(
        "next",
        ""
    ).strip()

    if (
        form_next_url.startswith("/")
        and not form_next_url.startswith("//")
    ):

        next_url = form_next_url

    else:

        next_url = ""

    if not request.form.get("terms"):

        flash(
            "Please agree to create a Glamora AR account.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    if not name:

        flash(
            "Please enter your name.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    if len(name) < 2:

        flash(
            "Your name must contain at least 2 characters.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    if len(name) > 100:

        flash(
            "Your name is too long.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    if not email:

        flash(
            "Please enter your email address.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    if len(email) > 150:

        flash(
            "Email address is too long.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    email_pattern = (
        r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )

    if not re.match(
        email_pattern,
        email
    ):

        flash(
            "Please enter a valid email address.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    if not password:

        flash(
            "Please enter a password.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    if len(password) < 6:

        flash(
            "Password must contain at least 6 characters.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    if password != confirm_password:

        flash(
            "Passwords do not match.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
            )

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                email
            FROM users
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )

        existing_user = (
            cursor.fetchone()
        )

        if existing_user:

            flash(
                "An account with this email already exists. Please login.",
                "error"
            )

            return redirect(
                url_for(
                    "login",
                    next=next_url
                )
            )

        hashed_password = (
            generate_password_hash(
                password
            )
        )

        cursor.execute(
            """
            INSERT INTO users (
                name,
                email,
                password_hash
            )
            VALUES (
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

        flash(
            "Account created successfully. Please login.",
            "success"
        )

        if next_url:

            return redirect(
                url_for(
                    "login",
                    next=next_url
                )
            )

        return redirect(
            url_for("login")
        )

    except Exception as error:

        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

        print(
            "REGISTRATION ERROR:",
            repr(error)
        )

        error_text = str(error).lower()

        if (
            "duplicate" in error_text
            and "email" in error_text
        ):

            flash(
                "An account with this email already exists. Please login.",
                "error"
            )

            return redirect(
                url_for(
                    "login",
                    next=next_url
                )
            )

        flash(
            "Unable to create account. Please check the server terminal for the exact database error.",
            "error"
        )

        return render_template(
            "register.html",
            next=next_url
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():

    next_url = request.args.get(
        "next",
        ""
    ).strip()

    if request.method == "POST":

        email = request.form.get(
            "email",
            ""
        ).strip().lower()

        password = request.form.get(
            "password",
            ""
        )

        next_url = request.form.get(
            "next",
            ""
        ).strip()

        if not email or not password:

            flash(
                "Please enter your email and password.",
                "error"
            )

            return render_template(
                "login.html",
                next=next_url
            )

        connection = None
        cursor = None

        try:

            connection = get_db_connection()

            if connection is None:

                raise RuntimeError(
                    "Database connection failed."
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
                FROM users
                WHERE LOWER(email) = %s
                LIMIT 1
                """,
                (email,)
            )

            user = cursor.fetchone()

            if not user:

                flash(
                    "Invalid email or password.",
                    "error"
                )

                return render_template(
                    "login.html",
                    next=next_url
                )

            stored_password = user.get(
                "password_hash"
            )

            if not stored_password:

                flash(
                    "Invalid email or password.",
                    "error"
                )

                return render_template(
                    "login.html",
                    next=next_url
                )

            try:

                password_valid = (
                    check_password_hash(
                        stored_password,
                        password
                    )
                )

            except Exception:

                password_valid = False

            if not password_valid:

                flash(
                    "Invalid email or password.",
                    "error"
                )

                return render_template(
                    "login.html",
                    next=next_url
                )

            session.permanent = True

            session["user_id"] = user["id"]

            session["user_name"] = user["name"]

            session["user_email"] = user["email"]

            session["logged_in"] = True

            if (
                next_url.startswith("/")
                and not next_url.startswith("//")
            ):

                return redirect(
                    next_url
                )

            return redirect(
                url_for("profile")
            )

        except Exception as error:

            print(
                "LOGIN ERROR:",
                repr(error)
            )

            flash(
                "Unable to log in.",
                "error"
            )

            return render_template(
                "login.html",
                next=next_url
            )

        finally:

            safe_close(
                cursor,
                connection
            )

    return render_template(
        "login.html",
        next=next_url
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
        "You have been logged out.",
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

    if not session.get("user_id"):

        flash(
            "Please log in to view your profile.",
            "error"
        )

        return redirect(
            url_for(
                "login",
                next=url_for("profile")
            )
        )

    user = get_current_user()

    if not user:

        session.clear()

        flash(
            "Please log in again.",
            "error"
        )

        return redirect(
            url_for("login")
        )

    return render_template(
        "profile.html",
        user=user
    )



# =========================================================
# FAVORITES / WISHLIST
# =========================================================

@app.route("/favorites")
def favorites():

    if not session.get("user_id"):
        flash("Please log in to view your favorites.", "error")
        return redirect(
            url_for("login", next=url_for("favorites"))
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()

        if connection is None:
            raise RuntimeError("Database connection failed.")

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
                p.category_id,
                c.name AS category_name,
                (
                    SELECT pi.image_url
                    FROM product_images pi
                    WHERE pi.product_id = p.id
                    ORDER BY pi.is_primary DESC, pi.id ASC
                    LIMIT 1
                ) AS image_url
            FROM favorites f
            INNER JOIN products p
                ON p.id = f.product_id
            LEFT JOIN categories c
                ON c.id = p.category_id
            WHERE f.user_id = %s
            ORDER BY f.created_at DESC, f.id DESC
            """,
            (session["user_id"],)
        )

        favorite_products = cursor.fetchall() or []
        favorite_products = prepare_products(favorite_products)

        return render_template(
            "favorites.html",
            favorite_products=favorite_products
        )

    except Exception as error:
        print("FAVORITES PAGE ERROR:", repr(error))
        flash("Unable to load your favorites.", "error")

        return render_template(
            "favorites.html",
            favorite_products=[]
        )

    finally:
        safe_close(cursor, connection)



# =========================================================
# ADD / REMOVE FAVORITE
# =========================================================

@app.route(
    "/favorite/toggle/<int:product_id>",
    methods=["POST"]
)
def toggle_favorite(product_id):

    # -----------------------------------------------------
    # REQUIRE LOGIN
    # -----------------------------------------------------

    if not session.get("user_id"):
        flash(
            "Please log in to save your favorite products.",
            "error"
        )

        return_to = (
            request.form.get("return_to", "").strip()
            or request.referrer
            or url_for(
                "product_details",
                product_id=product_id
            )
        )

        parsed = urlparse(return_to)

        if (
            not return_to.startswith("/")
            or return_to.startswith("//")
            or parsed.scheme
            or parsed.netloc
        ):
            return_to = url_for(
                "product_details",
                product_id=product_id
            )

        return redirect(
            url_for("login", next=return_to)
        )

    # -----------------------------------------------------
    # DETERMINE WHERE TO RETURN AFTER TOGGLING
    # -----------------------------------------------------

    return_to = (
        request.form.get("return_to", "").strip()
        or request.referrer
        or url_for("beauty")
    )

    parsed = urlparse(return_to)

    # Allow local paths only.
    if (
        not return_to.startswith("/")
        or return_to.startswith("//")
        or parsed.scheme
        or parsed.netloc
    ):
        return_to = url_for("beauty")

    connection = None
    cursor = None

    try:
        connection = get_db_connection()

        if connection is None:
            raise RuntimeError(
                "Database connection failed."
            )

        cursor = connection.cursor(dictionary=True)

        user_id = session["user_id"]

        # -------------------------------------------------
        # CHECK PRODUCT AVAILABILITY
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM products
            WHERE id = %s
              AND is_available = 1
            LIMIT 1
            """,
            (product_id,)
        )

        product = cursor.fetchone()

        if not product:
            flash(
                "This product is unavailable.",
                "error"
            )

            return redirect(return_to)

        # -------------------------------------------------
        # CHECK WHETHER PRODUCT IS ALREADY A FAVORITE
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM favorites
            WHERE user_id = %s
              AND product_id = %s
            LIMIT 1
            """,
            (user_id, product_id)
        )

        existing = cursor.fetchone()

        # -------------------------------------------------
        # REMOVE FAVORITE
        # -------------------------------------------------

        if existing:
            cursor.execute(
                """
                DELETE FROM favorites
                WHERE user_id = %s
                  AND product_id = %s
                """,
                (user_id, product_id)
            )

            message = (
                "Product removed from favorites."
            )

        # -------------------------------------------------
        # ADD FAVORITE
        # -------------------------------------------------

        else:
            cursor.execute(
                """
                INSERT INTO favorites (
                    user_id,
                    product_id
                )
                VALUES (%s, %s)
                """,
                (user_id, product_id)
            )

            message = (
                "Product added to favorites."
            )

        # -------------------------------------------------
        # SAVE CHANGES
        # -------------------------------------------------

        connection.commit()

        flash(message, "success")

        # Return to the page where the heart was clicked.
        return redirect(return_to)

    except Exception as error:

        if connection is not None:
            try:
                connection.rollback()
            except Exception:
                pass

        print(
            "TOGGLE FAVORITE ERROR:",
            repr(error)
        )

        flash(
            "Unable to update your favorites.",
            "error"
        )

        return redirect(return_to)

    finally:
        safe_close(cursor, connection)




# =========================================================
# PRODUCT DETAILS
# =========================================================

@app.route(
    "/product/<int:product_id>"
)
def product_details(product_id):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
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
                c.name AS category_name
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.id
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

        try:

            product["price"] = Decimal(
                str(
                    product.get(
                        "price",
                        0
                    ) or 0
                )
            )

        except (
            InvalidOperation,
            ValueError,
            TypeError
        ):

            product["price"] = Decimal(
                "0.00"
            )

        product["product_type_key"] = (
            normalize_product_type(
                product.get("product_type")
            )
        )

        category_name = product.get(
            "category_name"
        )

        if category_name:

            product["category_slug"] = re.sub(
                r"[^a-z0-9]+",
                "-",
                str(category_name).lower()
            ).strip("-")

        else:

            product["category_slug"] = ""

        product["product_type_slug"] = (
            product["product_type_key"]
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

        images = (
            cursor.fetchall() or []
        )

        product["image_url"] = None

        if images:

            product["image_url"] = (
                images[0].get(
                    "image_url"
                )
            )

        # -------------------------------------------------
        # REVIEWS
        # -------------------------------------------------

        reviews = []

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
                ORDER BY
                    created_at DESC,
                    id DESC
                """,
                (product_id,)
            )

            reviews = (
                cursor.fetchall() or []
            )

        except Exception as review_error:

            print(
                "PRODUCT REVIEWS ERROR:",
                repr(review_error)
            )

            reviews = []

        review_count = len(reviews)

        average_rating = 0

        if reviews:

            ratings = []

            for review in reviews:

                try:

                    rating = float(
                        review.get(
                            "rating",
                            0
                        ) or 0
                    )

                    if 1 <= rating <= 5:

                        ratings.append(
                            rating
                        )

                except (
                    TypeError,
                    ValueError
                ):

                    continue

            if ratings:

                average_rating = round(
                    sum(ratings) / len(ratings),
                    1
                )

        return render_template(
            "product_details.html",
            product=product,
            images=images,
            reviews=reviews,
            review_count=review_count,
            average_rating=average_rating
        )

    except Exception as error:

        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

        print(
            "PRODUCT DETAILS ERROR:",
            repr(error)
        )

        flash(
            "Unable to open this product. Please check the Flask terminal.",
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
# ADD PRODUCT REVIEW
# =========================================================

@app.route(
    "/product/<int:product_id>/review",
    methods=["POST"]
)
def add_review(product_id):

    if not session.get("user_id"):

        flash(
            "Please log in to submit a review.",
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

    rating_value = request.form.get(
        "rating",
        ""
    ).strip()

    review_text = request.form.get(
        "review_text",
        ""
    ).strip()

    try:

        rating = int(
            rating_value
        )

    except (
        TypeError,
        ValueError
    ):

        rating = 0

    if rating < 1 or rating > 5:

        flash(
            "Please select a rating between 1 and 5.",
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
    saved_review_file = None

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
            )

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                name
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (session["user_id"],)
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

        review_image_url = None

        review_file = request.files.get(
            "review_image"
        )

        if (
            review_file
            and review_file.filename
        ):

            filename = secure_filename(
                review_file.filename
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

            review_file.seek(
                0,
                os.SEEK_END
            )

            file_size = review_file.tell()

            review_file.seek(0)

            if file_size > MAX_IMAGE_SIZE:

                flash(
                    "Review image must be 5 MB or smaller.",
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
                "review_"
                + str(uuid.uuid4())
                + "."
                + extension
            )

            saved_review_file = os.path.join(
                REVIEW_UPLOAD_FOLDER,
                unique_filename
            )

            review_file.save(
                saved_review_file
            )

            review_image_url = (
                "uploads/reviews/"
                + unique_filename
            )

        cursor.execute(
            """
            INSERT INTO product_reviews (
                product_id,
                user_id,
                customer_name,
                rating,
                review_text,
                review_image
            )
            VALUES (
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
                user["id"],
                user["name"],
                rating,
                review_text,
                review_image_url
            )
        )

        connection.commit()

        flash(
            "Your review has been added.",
            "success"
        )

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    except Exception as error:

        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

        if saved_review_file:

            try:

                if os.path.exists(
                    saved_review_file
                ):

                    os.remove(
                        saved_review_file
                    )

            except Exception:
                pass

        print(
            "REVIEW ERROR:",
            repr(error)
        )

        flash(
            "Unable to submit review.",
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

    if not session.get("user_id"):

        flash(
            "Please log in to add products to your bag.",
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

            raise RuntimeError(
                "Database connection failed."
            )

        cursor = connection.cursor(
            dictionary=True
        )

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
            product.get(
                "stock",
                0
            ) or 0
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
                session["user_id"],
                product_id
            )
        )

        existing_item = (
            cursor.fetchone()
        )

        if existing_item:

            current_quantity = int(
                existing_item.get(
                    "quantity",
                    0
                ) or 0
            )

            new_quantity = min(
                current_quantity + 1,
                stock
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
                INSERT INTO cart_items (
                    user_id,
                    product_id,
                    quantity
                )
                VALUES (
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    session["user_id"],
                    product_id,
                    1
                )
            )

        connection.commit()

        flash(
            "Product added to your bag.",
            "success"
        )

        return redirect(
            url_for(
                "product_details",
                product_id=product_id
            )
        )

    except Exception as error:

        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

        print(
            "ADD TO CART ERROR:",
            repr(error)
        )

        flash(
            "Unable to add product to bag.",
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

    if not session.get("user_id"):

        flash(
            "Please log in to continue.",
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

            raise RuntimeError(
                "Database connection failed."
            )

        cursor = connection.cursor(
            dictionary=True
        )

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
            product.get(
                "stock",
                0
            ) or 0
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
                session["user_id"],
                product_id
            )
        )

        existing_item = (
            cursor.fetchone()
        )

        if existing_item:

            current_quantity = int(
                existing_item.get(
                    "quantity",
                    0
                ) or 0
            )

            new_quantity = min(
                current_quantity + 1,
                stock
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
                INSERT INTO cart_items (
                    user_id,
                    product_id,
                    quantity
                )
                VALUES (
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    session["user_id"],
                    product_id,
                    1
                )
            )

        connection.commit()

        return redirect(
            url_for("cart")
        )

    except Exception as error:

        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

        print(
            "BUY NOW ERROR:",
            repr(error)
        )

        flash(
            "Unable to continue with this product.",
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

    if not session.get("user_id"):

        flash(
            "Please log in to view your bag.",
            "error"
        )

        return redirect(
            url_for(
                "login",
                next=url_for("cart")
            )
        )

    user_id = session.get(
        "user_id"
    )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Cart database connection failed."
            )

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id AS cart_item_id,
                user_id,
                product_id,
                quantity
            FROM cart_items
            WHERE user_id = %s
            ORDER BY id DESC
            """,
            (user_id,)
        )

        cart_rows = (
            cursor.fetchall() or []
        )

        cart_items = []

        subtotal = Decimal(
            "0.00"
        )

        for cart_row in cart_rows:

            product_id = cart_row.get(
                "product_id"
            )

            try:

                quantity = int(
                    cart_row.get(
                        "quantity",
                        0
                    ) or 0
                )

            except (
                TypeError,
                ValueError
            ):

                quantity = 0

            if quantity <= 0:
                continue

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
                    ON p.category_id = c.id
                WHERE p.id = %s
                LIMIT 1
                """,
                (product_id,)
            )

            product = cursor.fetchone()

            if not product:
                continue

            image_url = None

            try:

                cursor.execute(
                    """
                    SELECT
                        image_url
                    FROM product_images
                    WHERE product_id = %s
                    ORDER BY
                        is_primary DESC,
                        id ASC
                    LIMIT 1
                    """,
                    (product_id,)
                )

                image_result = (
                    cursor.fetchone()
                )

                if image_result:

                    image_url = (
                        image_result.get(
                            "image_url"
                        )
                    )

            except Exception as image_error:

                print(
                    "CART IMAGE ERROR:",
                    repr(image_error)
                )

            try:

                price = Decimal(
                    str(
                        product.get(
                            "price",
                            0
                        ) or 0
                    )
                )

            except (
                InvalidOperation,
                ValueError,
                TypeError
            ):

                price = Decimal(
                    "0.00"
                )

            line_total = (
                price * quantity
            )

            item = {
                "cart_item_id":
                    cart_row.get(
                        "cart_item_id"
                    ),

                "user_id":
                    user_id,

                "product_id":
                    product.get(
                        "id"
                    ),

                "quantity":
                    quantity,

                "name":
                    product.get(
                        "name"
                    ),

                "description":
                    product.get(
                        "description"
                    ),

                "price":
                    price,

                "stock":
                    product.get(
                        "stock",
                        0
                    ),

                "shade":
                    product.get(
                        "shade"
                    ),

                "color":
                    product.get(
                        "color"
                    ),

                "product_type":
                    product.get(
                        "product_type"
                    ),

                "is_available":
                    product.get(
                        "is_available"
                    ),

                "category_id":
                    product.get(
                        "category_id"
                    ),

                "category_name":
                    product.get(
                        "category_name"
                    ),

                "image_url":
                    image_url,

                "line_total":
                    line_total
            }

            cart_items.append(
                item
            )

            subtotal += line_total

        total_items = sum(
            int(
                item.get(
                    "quantity",
                    0
                ) or 0
            )
            for item in cart_items
        )

        return render_template(
            "cart.html",
            cart_items=cart_items,
            subtotal=subtotal,
            total_items=total_items,
            currency_symbol=CURRENCY_SYMBOL,
            currency_code=CURRENCY_CODE,
            format_npr=format_npr
        )

    except Exception as error:

        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

        print(
            "CART ERROR:",
            repr(error)
        )

        flash(
            "Unable to load your bag.",
            "error"
        )

        return render_template(
            "cart.html",
            cart_items=[],
            subtotal=Decimal("0.00"),
            total_items=0,
            currency_symbol=CURRENCY_SYMBOL,
            currency_code=CURRENCY_CODE,
            format_npr=format_npr
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# REMOVE FROM CART
# =========================================================

@app.route(
    "/cart/remove/<int:cart_item_id>",
    methods=["POST"]
)
def remove_from_cart(cart_item_id):

    if not session.get("user_id"):

        flash(
            "Please log in to manage your bag.",
            "error"
        )

        return redirect(
            url_for(
                "login",
                next=url_for("cart")
            )
        )

    user_id = session.get(
        "user_id"
    )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
            )

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            DELETE FROM cart_items
            WHERE id = %s
              AND user_id = %s
            """,
            (
                cart_item_id,
                user_id
            )
        )

        connection.commit()

        if cursor.rowcount > 0:

            flash(
                "Product removed from your bag.",
                "success"
            )

        else:

            flash(
                "Bag item not found.",
                "error"
            )

        return redirect(
            url_for("cart")
        )

    except Exception as error:

        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

        print(
            "REMOVE FROM CART ERROR:",
            repr(error)
        )

        flash(
            "Unable to remove the product from your bag.",
            "error"
        )

        return redirect(
            url_for("cart")
        )

    finally:

        safe_close(
            cursor,
            connection
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

        if not email or not password:

            flash(
                "Please enter your email and password.",
                "error"
            )

            return render_template(
                "admin/login.html"
            )

        connection = None
        cursor = None

        try:

            connection = get_db_connection()

            if connection is None:

                raise RuntimeError(
                    "Database connection failed."
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
                    "Invalid admin credentials.",
                    "error"
                )

                return render_template(
                    "admin/login.html"
                )

            password_hash = admin.get(
                "password_hash"
            )

            if not password_hash:

                flash(
                    "Invalid admin credentials.",
                    "error"
                )

                return render_template(
                    "admin/login.html"
                )

            try:

                valid = check_password_hash(
                    password_hash,
                    password
                )

            except Exception:

                valid = False

            if not valid:

                flash(
                    "Invalid admin credentials.",
                    "error"
                )

                return render_template(
                    "admin/login.html"
                )

            session["admin_id"] = admin["id"]

            session["admin_name"] = admin["name"]

            session["admin_email"] = admin["email"]

            return redirect(
                url_for("admin_dashboard")
            )

        except Exception as error:

            print(
                "ADMIN LOGIN ERROR:",
                repr(error)
            )

            flash(
                "Unable to log in as admin.",
                "error"
            )

            return render_template(
                "admin/login.html"
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

    session.pop(
        "admin_id",
        None
    )

    session.pop(
        "admin_name",
        None
    )

    session.pop(
        "admin_email",
        None
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

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
            )

        cursor = connection.cursor(
            dictionary=True
        )

        # -------------------------------------------------
        # TOTAL PRODUCTS
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            """
        )

        product_result = (
            cursor.fetchone()
        )

        product_count = int(
            product_result.get(
                "total",
                0
            ) or 0
        )

        # -------------------------------------------------
        # TOTAL CATEGORIES
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM categories
            """
        )

        category_result = (
            cursor.fetchone()
        )

        category_count = int(
            category_result.get(
                "total",
                0
            ) or 0
        )

        # -------------------------------------------------
        # TOTAL USERS
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM users
            """
        )

        user_result = (
            cursor.fetchone()
        )

        user_count = int(
            user_result.get(
                "total",
                0
            ) or 0
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

        available_result = (
            cursor.fetchone()
        )

        available_count = int(
            available_result.get(
                "total",
                0
            ) or 0
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
                p.is_available,
                p.created_at,

                c.name AS category_name,

                (
                    SELECT
                        pi.image_url
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

            ORDER BY
                p.id DESC

            LIMIT 10
            """
        )

        recent_products = (
            cursor.fetchall() or []
        )

        for product in recent_products:

            try:

                product["price"] = Decimal(
                    str(
                        product.get(
                            "price",
                            0
                        ) or 0
                    )
                )

            except (
                InvalidOperation,
                ValueError,
                TypeError
            ):

                product["price"] = Decimal(
                    "0.00"
                )

        return render_template(
            "admin/dashboard.html",
            product_count=product_count,
            category_count=category_count,
            user_count=user_count,
            available_count=available_count,
            recent_products=recent_products
        )

    except Exception as error:

        print(
            "ADMIN DASHBOARD ERROR:",
            repr(error)
        )

        flash(
            "Unable to load dashboard.",
            "error"
        )

        return render_template(
            "admin/dashboard.html",
            product_count=0,
            category_count=0,
            user_count=0,
            available_count=0,
            recent_products=[]
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# ADMIN PRODUCTS — SHOW ALL PRODUCTS
# =========================================================

@app.route("/admin/products")
def admin_products():

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
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
                    SELECT
                        pi.image_url
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

            ORDER BY
                p.id DESC
            """
        )

        products = (
            cursor.fetchall() or []
        )

        products = prepare_products(
            products
        )

        # -------------------------------------------------
        # TOTAL NUMBER OF PRODUCTS
        # -------------------------------------------------

        product_count = len(
            products
        )

        return render_template(
            "admin/products.html",
            products=products,
            product_count=product_count
        )

    except Exception as error:

        print(
            "ADMIN PRODUCTS ERROR:",
            repr(error)
        )

        flash(
            "Unable to load products.",
            "error"
        )

        return render_template(
            "admin/products.html",
            products=[],
            product_count=0
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

    if request.method == "POST":

        try:

            name = request.form.get(
                "name",
                ""
            ).strip()

            description = request.form.get(
                "description",
                ""
            ).strip()

            price_value = request.form.get(
                "price",
                ""
            ).strip()

            stock_value = request.form.get(
                "stock",
                ""
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

            category_id_value = request.form.get(
                "category_id",
                ""
            ).strip()

            is_available_value = request.form.get(
                "is_available"
            )

            # -------------------------------------------------
            # NAME
            # -------------------------------------------------

            if not name:

                flash(
                    "Product name is required.",
                    "error"
                )

                return redirect(
                    url_for("admin_add_product")
                )

            # -------------------------------------------------
            # PRICE
            # -------------------------------------------------

            try:

                price = Decimal(
                    price_value
                )

                if price < 0:
                    raise InvalidOperation

                price = price.quantize(
                    Decimal("0.01")
                )

            except (
                InvalidOperation,
                ValueError,
                TypeError
            ):

                flash(
                    "Please enter a valid price in NPR.",
                    "error"
                )

                return redirect(
                    url_for("admin_add_product")
                )

            # -------------------------------------------------
            # STOCK
            # -------------------------------------------------

            try:

                stock = int(
                    stock_value
                )

                if stock < 0:
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

            # -------------------------------------------------
            # CATEGORY
            # -------------------------------------------------

            try:

                category_id = int(
                    category_id_value
                )

            except (
                ValueError,
                TypeError
            ):

                category_id = None

            # -------------------------------------------------
            # AVAILABILITY
            # -------------------------------------------------

            is_available = (
                1
                if is_available_value
                else 0
            )

            # -------------------------------------------------
            # PRODUCT TYPE
            # -------------------------------------------------

            normalized_type = (
                normalize_product_type(
                    product_type
                )
            )

            # -------------------------------------------------
            # IMAGE FILES
            # -------------------------------------------------

            image_files = (
                request.files.getlist(
                    "images"
                )
            )

            # -------------------------------------------------
            # DATABASE
            # -------------------------------------------------

            connection = get_db_connection()

            if connection is None:

                raise RuntimeError(
                    "Database connection failed."
                )

            cursor = connection.cursor(
                dictionary=True
            )

            # -------------------------------------------------
            # INSERT PRODUCT
            # -------------------------------------------------

            cursor.execute(
                """
                INSERT INTO products (
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
                VALUES (
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
                    price,
                    stock,
                    shade,
                    color,
                    normalized_type,
                    is_available,
                    category_id
                )
            )

            product_id = cursor.lastrowid

            # -------------------------------------------------
            # SAVE IMAGES
            # -------------------------------------------------

            valid_images = []

            for image_file in image_files:

                if not image_file:
                    continue

                if not image_file.filename:
                    continue

                filename = secure_filename(
                    image_file.filename
                )

                if not allowed_image(filename):
                    continue

                image_file.seek(
                    0,
                    os.SEEK_END
                )

                file_size = image_file.tell()

                image_file.seek(0)

                if file_size > MAX_IMAGE_SIZE:
                    continue

                extension = filename.rsplit(
                    ".",
                    1
                )[1].lower()

                unique_filename = (
                    "product_"
                    + str(uuid.uuid4())
                    + "."
                    + extension
                )

                file_path = os.path.join(
                    PRODUCT_UPLOAD_FOLDER,
                    unique_filename
                )

                image_file.save(
                    file_path
                )

                # IMPORTANT:
                # Store ONLY the path relative to /static
                image_url = (
                    "uploads/products/"
                    + unique_filename
                )

                valid_images.append(
                    image_url
                )

            # -------------------------------------------------
            # INSERT PRODUCT IMAGES
            # -------------------------------------------------

            for index, image_url in enumerate(
                valid_images
            ):

                is_primary = (
                    1
                    if index == 0
                    else 0
                )

                cursor.execute(
                    """
                    INSERT INTO product_images (
                        product_id,
                        image_url,
                        is_primary
                    )
                    VALUES (
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

            connection.commit()

            flash(
                "Product added successfully.",
                "success"
            )

            return redirect(
                url_for("admin_products")
            )

        except Exception as error:

            if connection:

                try:
                    connection.rollback()
                except Exception:
                    pass

            print(
                "ADMIN ADD PRODUCT ERROR:",
                repr(error)
            )

            flash(
                "Unable to add product. Please check the server console.",
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

    # =====================================================
    # GET — PRODUCT FORM
    # =====================================================

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
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

        categories = (
            cursor.fetchall() or []
        )

        return render_template(
            "admin/products_add.html",
            categories=categories
        )

    except Exception as error:

        print(
            "ADMIN ADD PRODUCT PAGE ERROR:",
            repr(error)
        )

        flash(
            "Unable to load product form.",
            "error"
        )

        return render_template(
            "admin/products_add.html",
            categories=[]
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# ADMIN — DELETE PRODUCT
# =========================================================

@app.route(
    "/admin/products/delete/<int:product_id>",
    methods=["POST"]
)
def admin_delete_product(product_id):

    # -----------------------------------------------------
    # ADMIN ONLY
    # -----------------------------------------------------

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:

            raise RuntimeError(
                "Database connection failed."
            )

        cursor = connection.cursor(
            dictionary=True
        )

        # -------------------------------------------------
        # CHECK PRODUCT
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                name
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
                url_for("admin_products")
            )

        # -------------------------------------------------
        # GET PRODUCT IMAGES BEFORE DELETE
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                image_url
            FROM product_images
            WHERE product_id = %s
            """,
            (product_id,)
        )

        product_images = (
            cursor.fetchall() or []
        )

        # -------------------------------------------------
        # DELETE CART ITEMS
        # -------------------------------------------------

        cursor.execute(
            """
            DELETE FROM cart_items
            WHERE product_id = %s
            """,
            (product_id,)
        )

        # -------------------------------------------------
        # DELETE PRODUCT REVIEWS
        # -------------------------------------------------

        cursor.execute(
            """
            DELETE FROM product_reviews
            WHERE product_id = %s
            """,
            (product_id,)
        )

        # -------------------------------------------------
        # DELETE PRODUCT IMAGES FROM DATABASE
        # -------------------------------------------------

        cursor.execute(
            """
            DELETE FROM product_images
            WHERE product_id = %s
            """,
            (product_id,)
        )

        # -------------------------------------------------
        # DELETE PRODUCT
        # -------------------------------------------------

        cursor.execute(
            """
            DELETE FROM products
            WHERE id = %s
            """,
            (product_id,)
        )

        # -------------------------------------------------
        # COMMIT DATABASE DELETE
        # -------------------------------------------------

        connection.commit()

        # -------------------------------------------------
        # DELETE PHYSICAL IMAGE FILES
        # -------------------------------------------------

        for image in product_images:

            image_url = image.get(
                "image_url"
            )

            if not image_url:
                continue

            # Remove accidental leading /static/ if an
            # older database record contains it.
            clean_image_url = str(
                image_url
            ).replace("\\", "/")

            clean_image_url = re.sub(
                r"^/static/",
                "",
                clean_image_url,
                flags=re.IGNORECASE
            )

            clean_image_url = re.sub(
                r"^static/",
                "",
                clean_image_url,
                flags=re.IGNORECASE
            )

            image_path = os.path.join(
                app.static_folder,
                clean_image_url.replace(
                    "/",
                    os.sep
                )
            )

            try:

                if os.path.isfile(
                    image_path
                ):

                    os.remove(
                        image_path
                    )

            except OSError as file_error:

                print(
                    "IMAGE DELETE ERROR:",
                    repr(file_error)
                )

        flash(
            f'Product "{product["name"]}" deleted successfully.',
            "success"
        )

        return redirect(
            url_for("admin_products")
        )

    except Exception as error:

        if connection:

            try:
                connection.rollback()
            except Exception:
                pass

        print()
        print("!" * 70)
        print("GLAMORA AR - ADMIN DELETE PRODUCT ERROR")
        print("PRODUCT ID:", product_id)
        print(
            "ERROR TYPE:",
            type(error).__name__
        )
        print(
            "ERROR:",
            repr(error)
        )
        print("!" * 70)
        print()

        flash(
            "Unable to delete the product. Please check the Flask terminal.",
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


# =========================================================
# GLAMORA AR — PRODUCT SCANNER
# =========================================================

def scanner_image_path(image_url):
    """Resolve a database image path safely inside static/."""

    if not image_url:
        return None

    clean_path = str(image_url).replace("\\", "/").strip()

    # Support older database paths.
    clean_path = re.sub(
        r"^/?static/",
        "",
        clean_path,
        flags=re.IGNORECASE
    )

    clean_path = clean_path.lstrip("/")

    static_root = os.path.realpath(app.static_folder)
    image_path = os.path.realpath(
        os.path.join(static_root, clean_path)
    )

    # Prevent paths escaping the static directory.
    if os.path.commonpath([static_root, image_path]) != static_root:
        return None

    if os.path.isfile(image_path):
        return image_path

    return None


def scanner_image_url(image_url):
    """Convert a stored static-relative image path to a browser URL."""

    if not image_url:
        return None

    clean_path = str(image_url).replace("\\", "/").strip()

    clean_path = re.sub(
        r"^/?static/",
        "",
        clean_path,
        flags=re.IGNORECASE
    ).lstrip("/")

    return url_for(
        "static",
        filename=clean_path
    )


# ---------------------------------------------------------
# SCANNER PAGE
# ---------------------------------------------------------

@app.route("/scanner")
def product_scanner():
    return render_template("product_scanner.html")


# ---------------------------------------------------------
# MATCH A SCANNED IMAGE TO A CATALOG PRODUCT
# ---------------------------------------------------------

@app.route(
    "/api/product-scanner/match",
    methods=["POST"]
)
def match_scanned_product():

    uploaded_file = request.files.get("image")

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({
            "success": False,
            "message": "Please capture or upload a product image."
        }), 400

    if not allowed_image(uploaded_file.filename):
        return jsonify({
            "success": False,
            "message": "Please use a JPG, JPEG, PNG, WEBP, or GIF image."
        }), 400

    uploaded_file.seek(0, os.SEEK_END)
    file_size = uploaded_file.tell()
    uploaded_file.seek(0)

    if file_size <= 0 or file_size > MAX_IMAGE_SIZE:
        return jsonify({
            "success": False,
            "message": "The image must be smaller than 5 MB."
        }), 400

    try:
        import cv2
        import numpy as np

    except ImportError:
        app.logger.exception("Scanner dependencies are missing.")
        return jsonify({
            "success": False,
            "message": (
                "The scanner is not configured yet. "
                "Install opencv-python-headless and numpy."
            )
        }), 500

    connection = None
    cursor = None

    try:
        # Decode the uploaded image.
        image_bytes = uploaded_file.read()

        scanned_image = cv2.imdecode(
            np.frombuffer(image_bytes, dtype=np.uint8),
            cv2.IMREAD_COLOR
        )

        if scanned_image is None:
            return jsonify({
                "success": False,
                "message": "The uploaded image could not be read."
            }), 400

        # Resize large images for faster feature matching.
        height, width = scanned_image.shape[:2]
        longest_side = max(height, width)

        if longest_side > 1000:
            scale = 1000 / longest_side

            scanned_image = cv2.resize(
                scanned_image,
                (
                    int(width * scale),
                    int(height * scale)
                ),
                interpolation=cv2.INTER_AREA
            )

        scanned_gray = cv2.cvtColor(
            scanned_image,
            cv2.COLOR_BGR2GRAY
        )

        orb = cv2.ORB_create(nfeatures=1500)

        scanned_keypoints, scanned_descriptors = (
            orb.detectAndCompute(scanned_gray, None)
        )

        if (
            scanned_descriptors is None
            or len(scanned_keypoints) < 8
        ):
            return jsonify({
                "success": False,
                "message": (
                    "I couldn't identify enough details in that image. "
                    "Try a clearer photo with the product filling the frame."
                )
            }), 200

        # Load images for available products.
        connection = get_db_connection()

        if connection is None:
            raise RuntimeError("Database connection failed.")

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.product_type,
                p.shade,
                p.color,
                pi.image_url
            FROM products p
            INNER JOIN product_images pi
                ON pi.product_id = p.id
            WHERE p.is_available = 1
            ORDER BY
                p.id DESC,
                pi.is_primary DESC,
                pi.id ASC
        """)

        product_images = cursor.fetchall() or []

        if not product_images:
            return jsonify({
                "success": False,
                "message": "There are no available product images to scan yet."
            }), 200

        matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
        best_match = None
        best_score = 0

        # Avoid repeatedly comparing duplicate images for one product.
        checked_product_ids = set()

        for item in product_images:
            product_id = item["id"]

            if product_id in checked_product_ids:
                continue

            checked_product_ids.add(product_id)

            image_path = scanner_image_path(
                item.get("image_url")
            )

            if not image_path:
                continue

            catalog_image = cv2.imread(image_path)

            if catalog_image is None:
                continue

            catalog_height, catalog_width = catalog_image.shape[:2]
            catalog_longest_side = max(
                catalog_height,
                catalog_width
            )

            if catalog_longest_side > 1000:
                scale = 1000 / catalog_longest_side

                catalog_image = cv2.resize(
                    catalog_image,
                    (
                        int(catalog_width * scale),
                        int(catalog_height * scale)
                    ),
                    interpolation=cv2.INTER_AREA
                )

            catalog_gray = cv2.cvtColor(
                catalog_image,
                cv2.COLOR_BGR2GRAY
            )

            catalog_keypoints, catalog_descriptors = (
                orb.detectAndCompute(catalog_gray, None)
            )

            if (
                catalog_descriptors is None
                or len(catalog_keypoints) < 8
            ):
                continue

            try:
                pairs = matcher.knnMatch(
                    scanned_descriptors,
                    catalog_descriptors,
                    k=2
                )
            except cv2.error:
                continue

            good_matches = [
                first
                for pair in pairs
                if len(pair) == 2
                for first, second in [pair]
                if first.distance < 0.72 * second.distance
            ]

            score = len(good_matches)

            if score > best_score:
                best_score = score
                best_match = item

        # This is a practical threshold, not a probability.
        if best_match is None or best_score < 12:
            return jsonify({
                "success": False,
                "message": (
                    "I couldn't find a confident product match. "
                    "Try another angle or a clearer photo."
                )
            }), 200

        return jsonify({
            "success": True,
            "message": "I'm here! 💗 I found a possible product match.",
            "product": {
                "id": best_match["id"],
                "name": best_match["name"],
                "description": best_match.get("description") or "",
                "price": format_npr(best_match.get("price")),
                "product_type": best_match.get("product_type") or "",
                "shade": best_match.get("shade") or "",
                "color": best_match.get("color") or "",
                "image_url": scanner_image_url(
                    best_match.get("image_url")
                ),
                "details_url": url_for(
                    "product_details",
                    product_id=best_match["id"]
                )
            }
        }), 200

    except Exception:
        app.logger.exception("Product scanner error.")

        return jsonify({
            "success": False,
            "message": (
                "Something went wrong while scanning. "
                "Please check the Flask terminal."
            )
        }), 500

    finally:
        safe_close(cursor, connection)



# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )