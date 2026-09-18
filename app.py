import os
import uuid
import re

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

# Keep users logged in for 30 days
app.config["PERMANENT_SESSION_LIFETIME"] = 60 * 60 * 24 * 30

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# False is required for local HTTP development.
# Change to True when deployed with HTTPS.
app.config["SESSION_COOKIE_SECURE"] = False


# =========================================================
# UPLOAD CONFIGURATION
# =========================================================

PRODUCT_UPLOAD_FOLDER = os.path.join(
    app.root_path,
    "static",
    "uploads",
    "products"
)

REVIEW_UPLOAD_FOLDER = os.path.join(
    app.root_path,
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

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024


ALLOWED_IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif"
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024


# =========================================================
# BEAUTY PRODUCT TYPE MAPPING
# =========================================================

PRODUCT_TYPE_ALIASES = {

    "lipstick": "lipstick",
    "lipsticks": "lipstick",
    "lip stick": "lipstick",
    "lip sticks": "lipstick",

    "eyeshadow": "eyeshadow",
    "eyeshadows": "eyeshadow",
    "eye shadow": "eyeshadow",
    "eye shadows": "eyeshadow",
    "eye-shadow": "eyeshadow",
    "eye-shadows": "eyeshadow",

    "blush": "blush",
    "blushes": "blush",

    "eyeliner": "eyeliner",
    "eyeliners": "eyeliner",
    "eye liner": "eyeliner",
    "eye liners": "eyeliner",

    "mascara": "mascara",
    "mascaras": "mascara",

    "foundation": "foundation",
    "foundations": "foundation",

    "highlighter": "highlighter",
    "highlighters": "highlighter",
    "highlight": "highlighter"
}


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def allowed_image(filename):

    if not filename:
        return False

    filename = secure_filename(filename)

    if not filename:
        return False

    if "." not in filename:
        return False

    extension = filename.rsplit(
        ".",
        1
    )[1].lower()

    return extension in ALLOWED_IMAGE_EXTENSIONS


def get_file_extension(filename):

    if not filename:
        return ""

    filename = secure_filename(filename)

    if "." not in filename:
        return ""

    return filename.rsplit(
        ".",
        1
    )[1].lower()


def safe_close(cursor=None, connection=None):

    if cursor is not None:

        try:
            cursor.close()
        except Exception:
            pass

    if connection is not None:

        try:
            connection.close()
        except Exception:
            pass


# =========================================================
# NORMALIZE PRODUCT TYPE
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

    if value in PRODUCT_TYPE_ALIASES:
        return PRODUCT_TYPE_ALIASES[value]

    no_hyphen = value.replace(
        "-",
        " "
    )

    if no_hyphen in PRODUCT_TYPE_ALIASES:
        return PRODUCT_TYPE_ALIASES[no_hyphen]

    return value.replace(
        " ",
        "-"
    )


# =========================================================
# PREPARE PRODUCTS
# =========================================================

def prepare_products(products):

    for product in products:

        product["product_type_key"] = (
            normalize_product_type(
                product.get("product_type")
            )
        )

    return products


# =========================================================
# GET BAG COUNT
# =========================================================

def get_bag_count():

    user_id = session.get("user_id")

    if not user_id:
        return 0

    connection = get_db_connection()

    if connection is None:
        return 0

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                COALESCE(SUM(quantity), 0) AS bag_count

            FROM cart_items

            WHERE user_id = %s
            """,
            (user_id,)
        )

        result = cursor.fetchone()

        if not result:
            return 0

        return int(
            result.get("bag_count") or 0
        )

    except Exception as error:

        print(
            "BAG COUNT ERROR:",
            type(error).__name__,
            str(error)
        )

        return 0

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# MAKE BAG COUNT AVAILABLE TO ALL TEMPLATES
# =========================================================

@app.context_processor
def inject_bag_count():

    return {
        "bag_count": get_bag_count()
    }


# =========================================================
# ADMIN REQUIRED
# =========================================================

def admin_required():

    return bool(
        session.get("admin_id")
    )


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================================
# BEAUTY PAGE
# =========================================================

@app.route("/beauty")
def beauty():

    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return render_template(
            "beauty.html",
            products=[],
            categories=[],
            bag_count=0
        )

    cursor = None

    try:

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

                LOWER(
                    REPLACE(
                        REPLACE(
                            TRIM(c.name),
                            ' ',
                            '-'
                        ),
                        '_',
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

            ORDER BY
                p.id DESC
            """
        )

        products = cursor.fetchall()

        products = prepare_products(
            products
        )

        cursor.execute(
            """
            SELECT
                id,
                name,
                description,

                LOWER(
                    REPLACE(
                        REPLACE(
                            TRIM(name),
                            ' ',
                            '-'
                        ),
                        '_',
                        '-'
                    )
                ) AS category_slug

            FROM categories

            ORDER BY
                name ASC
            """
        )

        categories = cursor.fetchall()

        bag_count = get_bag_count()

        print()
        print("========================================")
        print("GLAMORA AR - BEAUTY PAGE")
        print("========================================")
        print(
            "Products found:",
            len(products)
        )
        print(
            "Categories found:",
            len(categories)
        )
        print(
            "Bag count:",
            bag_count
        )

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
            categories=categories,
            bag_count=bag_count
        )

    except Exception as error:

        print()
        print("========================================")
        print("BEAUTY PAGE ERROR")
        print("========================================")
        print(
            "ERROR TYPE:",
            type(error).__name__
        )
        print(
            "ERROR MESSAGE:",
            str(error)
        )
        print("========================================")
        print()

        flash(
            "Unable to load beauty products.",
            "error"
        )

        return render_template(
            "beauty.html",
            products=[],
            categories=[],
            bag_count=0
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

    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return render_template(
            "product_details.html",
            product=None,
            images=[],
            reviews=[],
            review_count=0,
            average_rating=0,
            bag_count=0
        )

    cursor = None

    try:

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

        product["product_type_key"] = (
            normalize_product_type(
                product.get("product_type")
            )
        )

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

            product["image_url"] = (
                images[0].get("image_url")
            )

        else:

            product["image_url"] = None

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

            reviews = cursor.fetchall()

        except Exception as review_error:

            print(
                "PRODUCT REVIEWS WARNING:",
                type(review_error).__name__,
                str(review_error)
            )

            reviews = []

        review_count = len(reviews)

        if review_count:

            total_rating = sum(
                int(
                    review.get("rating") or 0
                )
                for review in reviews
            )

            average_rating = round(
                total_rating / review_count,
                1
            )

        else:

            average_rating = 0

        return render_template(
            "product_details.html",
            product=product,
            images=images,
            reviews=reviews,
            review_count=review_count,
            average_rating=average_rating,
            bag_count=get_bag_count()
        )

    except Exception as error:

        print()
        print("========================================")
        print("PRODUCT DETAILS ERROR")
        print("========================================")
        print(
            "PRODUCT ID:",
            product_id
        )
        print(
            "ERROR TYPE:",
            type(error).__name__
        )
        print(
            "ERROR MESSAGE:",
            str(error)
        )
        print(
            "ERROR REPR:",
            repr(error)
        )
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
# ADD PRODUCT REVIEW
# =========================================================

@app.route(
    "/product/<int:product_id>/review",
    methods=["POST"]
)
def add_product_review(product_id):

    if not session.get("user_id"):

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

        if rating < 1 or rating > 5:
            raise ValueError

    except (
        ValueError,
        TypeError
    ):

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

    cursor = None
    saved_file = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id

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

            session.clear()

            flash(
                "Please login again.",
                "error"
            )

            return redirect(
                url_for("login")
            )

        review_image_url = None

        image = request.files.get(
            "review_image"
        )

        if image and image.filename:

            filename = secure_filename(
                image.filename
            )

            if (
                not filename
                or not allowed_image(filename)
            ):

                flash(
                    "Only JPG, JPEG, PNG, WEBP and GIF images are allowed.",
                    "error"
                )

                return redirect(
                    url_for(
                        "product_details",
                        product_id=product_id
                    )
                )

            image.seek(
                0,
                os.SEEK_END
            )

            file_size = image.tell()

            image.seek(0)

            if file_size > MAX_IMAGE_SIZE:

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

            extension = get_file_extension(
                filename
            )

            unique_filename = (
                "review_"
                + uuid.uuid4().hex
                + "."
                + extension
            )

            saved_file = os.path.join(
                app.config["REVIEW_UPLOAD_FOLDER"],
                unique_filename
            )

            image.save(
                saved_file
            )

            review_image_url = (
                "/static/uploads/reviews/"
                + unique_filename
            )

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
                session["user_id"],
                user["name"],
                rating,
                review_text,
                review_image_url
            )
        )

        connection.commit()

        flash(
            "Thank you! Your review has been submitted.",
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
            connection.rollback()
        except Exception:
            pass

        if (
            saved_file
            and os.path.exists(saved_file)
        ):

            try:
                os.remove(saved_file)
            except Exception:
                pass

        print(
            "PRODUCT REVIEW ERROR:",
            type(error).__name__,
            str(error)
        )

        flash(
            "Unable to submit your review.",
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
# USER LOGIN
# =========================================================

@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():

    # Already logged in
    if session.get("user_id"):

        next_page = request.args.get(
            "next"
        )

        if (
            next_page
            and next_page.startswith("/")
        ):
            return redirect(
                next_page
            )

        return redirect(
            url_for("beauty")
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

        next_page = request.form.get(
            "next",
            ""
        ).strip()

        if not email or not password:

            flash(
                "Please enter your email and password.",
                "error"
            )

            return redirect(
                url_for(
                    "login",
                    next=next_page
                )
            )

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

        cursor = None
        user = None

        try:

            cursor = connection.cursor(
                dictionary=True
            )

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

        except Exception as error:

            print(
                "USER LOGIN ERROR:",
                type(error).__name__,
                str(error)
            )

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

        stored_password = user.get(
            "password"
        )

        if not stored_password:

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

        try:

            password_valid = check_password_hash(
                stored_password,
                password
            )

        except Exception as error:

            print(
                "PASSWORD CHECK ERROR:",
                type(error).__name__,
                str(error)
            )

            password_valid = False

        if not password_valid:

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

        # =================================================
        # CREATE PERMANENT USER SESSION
        # =================================================

        session.permanent = True

        session["user_id"] = user["id"]
        session["user_name"] = user["name"]
        session["user_email"] = user["email"]
        session["logged_in"] = True

        flash(
            f"Welcome back, {user['name']}!",
            "success"
        )

        # =================================================
        # RETURN TO REQUESTED PAGE
        # =================================================

        if (
            next_page
            and next_page.startswith("/")
        ):

            return redirect(
                next_page
            )

        return redirect(
            url_for("beauty")
        )

    return render_template(
        "login.html"
    )


# =========================================================
# USER REGISTER
# =========================================================

@app.route(
    "/register",
    methods=["GET", "POST"]
)
def register():

    # Already logged in
    if session.get("user_id"):

        return redirect(
            url_for("beauty")
        )

    if request.method == "POST":

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

        # =================================================
        # BASIC VALIDATION
        # =================================================

        if not name:

            flash(
                "Please enter your name.",
                "error"
            )

            return redirect(
                url_for("register")
            )

        if not email:

            flash(
                "Please enter your email address.",
                "error"
            )

            return redirect(
                url_for("register")
            )

        # Simple email validation
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

            return redirect(
                url_for("register")
            )

        if not password:

            flash(
                "Please enter a password.",
                "error"
            )

            return redirect(
                url_for("register")
            )

        if len(password) < 6:

            flash(
                "Password must contain at least 6 characters.",
                "error"
            )

            return redirect(
                url_for("register")
            )

        if password != confirm_password:

            flash(
                "Passwords do not match.",
                "error"
            )

            return redirect(
                url_for("register")
            )

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for("register")
            )

        cursor = None

        try:

            cursor = connection.cursor(
                dictionary=True
            )

            # =================================================
            # CHECK WHETHER EMAIL ALREADY EXISTS
            # =================================================

            cursor.execute(
                """
                SELECT
                    id

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
                    url_for("login")
                )

            # =================================================
            # HASH PASSWORD
            # =================================================

            hashed_password = (
                generate_password_hash(
                    password
                )
            )

            # =================================================
            # INSERT USER
            # =================================================

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

            flash(
                "Account created successfully. Please login.",
                "success"
            )

            return redirect(
                url_for("login")
            )

        except Exception as error:

            try:
                connection.rollback()
            except Exception:
                pass

            print()
            print("========================================")
            print("REGISTER ERROR")
            print("========================================")
            print(
                "ERROR TYPE:",
                type(error).__name__
            )
            print(
                "ERROR MESSAGE:",
                str(error)
            )
            print(
                "ERROR REPR:",
                repr(error)
            )
            print("========================================")
            print()

            flash(
                "Unable to create your account. Please try again.",
                "error"
            )

            return redirect(
                url_for("register")
            )

        finally:

            safe_close(
                cursor,
                connection
            )

    return render_template(
        "register.html"
    )


# =========================================================
# USER PROFILE
# =========================================================

@app.route("/profile")
def profile():

    user_id = session.get(
        "user_id"
    )

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

    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return redirect(
            url_for("beauty")
        )

    cursor = None

    try:

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

        user = cursor.fetchone()

        if not user:

            session.clear()

            flash(
                "Your account could not be found. Please login again.",
                "error"
            )

            return redirect(
                url_for("login")
            )

        # Keep session name/email synchronized
        session["user_name"] = user["name"]
        session["user_email"] = user["email"]

        return render_template(
            "profile.html",
            user=user,
            bag_count=get_bag_count()
        )

    except Exception as error:

        print(
            "PROFILE ERROR:",
            type(error).__name__,
            str(error)
        )

        flash(
            "Unable to load your profile.",
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
# USER LOGOUT
# =========================================================

@app.route("/logout")
def logout():

    session.clear()

    flash(
        "You have been logged out successfully.",
        "success"
    )

    return redirect(
        url_for("home")
    )


# =========================================================
# ADD TO BAG
# =========================================================

@app.route(
    "/cart/add/<int:product_id>",
    methods=["POST"]
)
def add_to_cart(product_id):

    user_id = session.get(
        "user_id"
    )

    # =====================================================
    # SERVER-SIDE LOGIN CHECK
    # =====================================================

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

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        # =================================================
        # GET PRODUCT
        # =================================================

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

        # =================================================
        # CHECK AVAILABILITY
        # =================================================

        if not product.get(
            "is_available"
        ):

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

        # =================================================
        # CHECK STOCK
        # =================================================

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

        # =================================================
        # CHECK EXISTING BAG ITEM
        # =================================================

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

        # =================================================
        # UPDATE EXISTING ITEM
        # =================================================

        if existing_item:

            current_quantity = int(
                existing_item.get(
                    "quantity"
                ) or 0
            )

            new_quantity = (
                current_quantity + 1
            )

            if new_quantity > stock:

                flash(
                    "You cannot add more than the available stock.",
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
                UPDATE cart_items

                SET quantity = %s

                WHERE id = %s
                  AND user_id = %s
                """,
                (
                    new_quantity,
                    existing_item["id"],
                    user_id
                )
            )

        # =================================================
        # INSERT NEW BAG ITEM
        # =================================================

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

        flash(
            f"{product['name']} has been added to your bag.",
            "success"
        )

        # Open bag after adding
        return redirect(
            url_for("cart")
        )

    except Exception as error:

        try:
            connection.rollback()
        except Exception:
            pass

        print()
        print("========================================")
        print("ADD TO BAG ERROR")
        print("========================================")
        print(
            "USER ID:",
            user_id
        )
        print(
            "PRODUCT ID:",
            product_id
        )
        print(
            "ERROR TYPE:",
            type(error).__name__
        )
        print(
            "ERROR MESSAGE:",
            str(error)
        )
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
# SHOPPING BAG
# =========================================================

@app.route("/cart")
def cart():

    user_id = session.get(
        "user_id"
    )

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

    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return render_template(
            "cart.html",
            cart_items=[],
            bag_count=0,
            subtotal=Decimal("0.00")
        )

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                ci.id AS cart_item_id,
                ci.product_id,
                ci.quantity,

                p.name,
                p.price,
                p.stock,
                p.is_available,

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

            ORDER BY
                ci.id DESC
            """,
            (user_id,)
        )

        cart_items = cursor.fetchall()

        subtotal = Decimal(
            "0.00"
        )

        for item in cart_items:

            price = Decimal(
                str(
                    item.get("price") or 0
                )
            )

            quantity = int(
                item.get("quantity") or 0
            )

            item["item_total"] = (
                price * quantity
            )

            subtotal += item[
                "item_total"
            ]

        bag_count = sum(
            int(
                item.get("quantity") or 0
            )
            for item in cart_items
        )

        return render_template(
            "cart.html",
            cart_items=cart_items,
            bag_count=bag_count,
            subtotal=subtotal
        )

    except Exception as error:

        print()
        print("========================================")
        print("BAG PAGE ERROR")
        print("========================================")
        print(
            "USER ID:",
            user_id
        )
        print(
            "ERROR TYPE:",
            type(error).__name__
        )
        print(
            "ERROR MESSAGE:",
            str(error)
        )
        print("========================================")
        print()

        flash(
            "Unable to load your bag.",
            "error"
        )

        return render_template(
            "cart.html",
            cart_items=[],
            bag_count=0,
            subtotal=Decimal("0.00")
        )

    finally:

        safe_close(
            cursor,
            connection
        )


# =========================================================
# REMOVE ITEM FROM BAG
# =========================================================

@app.route(
    "/cart/remove/<int:cart_item_id>",
    methods=["POST"]
)
def remove_from_cart(cart_item_id):

    user_id = session.get(
        "user_id"
    )

    if not user_id:

        flash(
            "Please login to manage your bag.",
            "error"
        )

        return redirect(
            url_for("login")
        )

    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return redirect(
            url_for("cart")
        )

    cursor = None

    try:

        cursor = connection.cursor()

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

        flash(
            "Product removed from your bag.",
            "success"
        )

        return redirect(
            url_for("cart")
        )

    except Exception as error:

        try:
            connection.rollback()
        except Exception:
            pass

        print(
            "REMOVE BAG ITEM ERROR:",
            type(error).__name__,
            str(error)
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
# UPDATE BAG QUANTITY
# =========================================================

@app.route(
    "/cart/update/<int:cart_item_id>",
    methods=["POST"]
)
def update_cart_quantity(cart_item_id):

    user_id = session.get(
        "user_id"
    )

    if not user_id:

        flash(
            "Please login to manage your bag.",
            "error"
        )

        return redirect(
            url_for("login")
        )

    quantity_value = request.form.get(
        "quantity",
        ""
    ).strip()

    try:

        quantity = int(
            quantity_value
        )

    except (
        ValueError,
        TypeError
    ):

        flash(
            "Invalid quantity.",
            "error"
        )

        return redirect(
            url_for("cart")
        )

    if quantity <= 0:

        return redirect(
            url_for(
                "remove_from_cart",
                cart_item_id=cart_item_id
            )
        )

    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return redirect(
            url_for("cart")
        )

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                ci.id,
                ci.quantity,
                p.stock,
                p.is_available

            FROM cart_items ci

            INNER JOIN products p
                ON p.id = ci.product_id

            WHERE ci.id = %s
              AND ci.user_id = %s

            LIMIT 1
            """,
            (
                cart_item_id,
                user_id
            )
        )

        item = cursor.fetchone()

        if not item:

            flash(
                "Bag item not found.",
                "error"
            )

            return redirect(
                url_for("cart")
            )

        stock = int(
            item.get("stock") or 0
        )

        if not item.get(
            "is_available"
        ):

            flash(
                "This product is currently unavailable.",
                "error"
            )

            return redirect(
                url_for("cart")
            )

        if quantity > stock:

            flash(
                f"Only {stock} item(s) are available.",
                "error"
            )

            return redirect(
                url_for("cart")
            )

        cursor.execute(
            """
            UPDATE cart_items

            SET quantity = %s

            WHERE id = %s
              AND user_id = %s
            """,
            (
                quantity,
                cart_item_id,
                user_id
            )
        )

        connection.commit()

        flash(
            "Bag quantity updated.",
            "success"
        )

        return redirect(
            url_for("cart")
        )

    except Exception as error:

        try:
            connection.rollback()
        except Exception:
            pass

        print(
            "UPDATE BAG ERROR:",
            type(error).__name__,
            str(error)
        )

        flash(
            "Unable to update your bag.",
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
# BUY NOW
# =========================================================

@app.route(
    "/buy-now/<int:product_id>",
    methods=["POST"]
)
def buy_now(product_id):

    if not session.get(
        "user_id"
    ):

        flash(
            "Please login to purchase this product.",
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

    return add_to_cart(
        product_id
    )


# =========================================================
# ADMIN LOGIN
# =========================================================

@app.route(
    "/admin",
    methods=["GET", "POST"]
)
def admin_login():

    if session.get(
        "admin_id"
    ):

        return redirect(
            url_for(
                "admin_dashboard"
            )
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

            return redirect(
                url_for("admin_login")
            )

        connection = get_db_connection()

        if connection is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for("admin_login")
            )

        cursor = None

        try:

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

            password_valid = False

            if admin:

                try:

                    password_valid = (
                        check_password_hash(
                            admin["password_hash"],
                            password
                        )
                    )

                except Exception:

                    password_valid = False

            if admin and password_valid:

                session.permanent = True

                session["admin_id"] = admin["id"]
                session["admin_name"] = admin["name"]
                session["admin_email"] = admin["email"]

                flash(
                    f"Welcome back, {admin['name']}!",
                    "success"
                )

                return redirect(
                    url_for(
                        "admin_dashboard"
                    )
                )

            flash(
                "Invalid admin email or password.",
                "error"
            )

            return redirect(
                url_for("admin_login")
            )

        except Exception as error:

            print(
                "ADMIN LOGIN ERROR:",
                type(error).__name__,
                str(error)
            )

            flash(
                "Something went wrong while logging in.",
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
# ADMIN DASHBOARD
# =========================================================

@app.route("/admin/dashboard")
def admin_dashboard():

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
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

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            """
        )

        total_products = (
            cursor.fetchone()["total"]
        )

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM categories
            """
        )

        total_categories = (
            cursor.fetchone()["total"]
        )

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM users
            """
        )

        total_users = (
            cursor.fetchone()["total"]
        )

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            WHERE is_available = 1
            """
        )

        available_products = (
            cursor.fetchone()["total"]
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

            ORDER BY
                p.id DESC

            LIMIT 10
            """
        )

        products = cursor.fetchall()

        products = prepare_products(
            products
        )

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

        print(
            "DASHBOARD ERROR:",
            type(error).__name__,
            str(error)
        )

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
                p.created_at,
                p.category_id,

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

            ORDER BY
                p.id DESC
            """
        )

        products = cursor.fetchall()

        products = prepare_products(
            products
        )

        return render_template(
            "admin/products.html",
            admin_name=session.get(
                "admin_name",
                "Admin"
            ),
            products=products
        )

    except Exception as error:

        print(
            "ADMIN PRODUCTS ERROR:",
            type(error).__name__,
            str(error)
        )

        flash(
            "Unable to load products.",
            "error"
        )

        return redirect(
            url_for("admin_dashboard")
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
    saved_files = []

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                name,
                description

            FROM categories

            ORDER BY
                name ASC
            """
        )

        categories = cursor.fetchall()

        if request.method == "GET":

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        name = request.form.get(
            "name",
            ""
        ).strip()

        description = request.form.get(
            "description",
            ""
        ).strip()

        category_id_value = request.form.get(
            "category_id",
            ""
        ).strip()

        product_type = request.form.get(
            "product_type",
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

        price_value = request.form.get(
            "price",
            ""
        ).strip()

        stock_value = request.form.get(
            "stock",
            ""
        ).strip()

        is_available = (
            1
            if request.form.get(
                "is_available"
            )
            else 0
        )

        # =================================================
        # NAME
        # =================================================

        if not name:

            flash(
                "Product name is required.",
                "error"
            )

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        # =================================================
        # CATEGORY
        # =================================================

        try:

            category_id = int(
                category_id_value
            )

        except (
            ValueError,
            TypeError
        ):

            flash(
                "Please select a valid category.",
                "error"
            )

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        cursor.execute(
            """
            SELECT
                id,
                name

            FROM categories

            WHERE id = %s

            LIMIT 1
            """,
            (category_id,)
        )

        selected_category = (
            cursor.fetchone()
        )

        if not selected_category:

            flash(
                "Selected category does not exist.",
                "error"
            )

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        # =================================================
        # PRODUCT TYPE
        # =================================================

        if not product_type:

            flash(
                "Please enter a product type.",
                "error"
            )

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        product_type_key = (
            normalize_product_type(
                product_type
            )
        )

        # =================================================
        # PRICE
        # =================================================

        try:

            if not price_value:
                raise InvalidOperation

            price = Decimal(
                price_value
            )

            if price < Decimal("0"):
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
                "Please enter a valid price.",
                "error"
            )

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        # =================================================
        # STOCK
        # =================================================

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

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        # =================================================
        # IMAGES
        # =================================================

        image_files = request.files.getlist(
            "images"
        )

        valid_images = []

        for image in image_files:

            if (
                not image
                or not image.filename
            ):
                continue

            filename = secure_filename(
                image.filename
            )

            if (
                not filename
                or not allowed_image(filename)
            ):

                flash(
                    "Only JPG, JPEG, PNG, WEBP and GIF images are allowed.",
                    "error"
                )

                return render_template(
                    "admin/add_product.html",
                    admin_name=session.get(
                        "admin_name",
                        "Admin"
                    ),
                    categories=categories
                )

            extension = get_file_extension(
                filename
            )

            image.seek(
                0,
                os.SEEK_END
            )

            file_size = image.tell()

            image.seek(0)

            if file_size <= 0:

                flash(
                    "One of the uploaded images is empty.",
                    "error"
                )

                return render_template(
                    "admin/add_product.html",
                    admin_name=session.get(
                        "admin_name",
                        "Admin"
                    ),
                    categories=categories
                )

            if file_size > MAX_IMAGE_SIZE:

                flash(
                    "Each product image must be smaller than 5 MB.",
                    "error"
                )

                return render_template(
                    "admin/add_product.html",
                    admin_name=session.get(
                        "admin_name",
                        "Admin"
                    ),
                    categories=categories
                )

            valid_images.append(
                (
                    image,
                    extension
                )
            )

        if not valid_images:

            flash(
                "Please upload at least one product image.",
                "error"
            )

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        # =================================================
        # INSERT PRODUCT
        # =================================================

        cursor.execute(
            """
            INSERT INTO products
            (
                category_id,
                name,
                description,
                price,
                stock,
                shade,
                color,
                product_type,
                is_available
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
                category_id,
                name,
                description,
                price,
                stock,
                shade,
                color,
                product_type_key,
                is_available
            )
        )

        product_id = cursor.lastrowid

        if product_id is None:

            raise RuntimeError(
                "Database did not return product ID."
            )

        # =================================================
        # SAVE IMAGES
        # =================================================

        for index, (
            image,
            extension
        ) in enumerate(valid_images):

            unique_filename = (
                "product_"
                + uuid.uuid4().hex
                + "."
                + extension
            )

            file_path = os.path.join(
                app.config[
                    "PRODUCT_UPLOAD_FOLDER"
                ],
                unique_filename
            )

            image.seek(0)

            image.save(
                file_path
            )

            saved_files.append(
                file_path
            )

            image_url = (
                "/static/uploads/products/"
                + unique_filename
            )

            is_primary = (
                1
                if index == 0
                else 0
            )

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

        connection.commit()

        flash(
            "Product added successfully!",
            "success"
        )

        return redirect(
            url_for(
                "admin_products"
            )
        )

    except Exception as error:

        try:
            connection.rollback()
        except Exception:
            pass

        for file_path in saved_files:

            try:

                if os.path.exists(
                    file_path
                ):
                    os.remove(
                        file_path
                    )

            except Exception:
                pass

        print()
        print("========================================")
        print("ADD PRODUCT ERROR")
        print("========================================")
        print(
            "ERROR TYPE:",
            type(error).__name__
        )
        print(
            "ERROR MESSAGE:",
            str(error)
        )
        print(
            "ERROR REPR:",
            repr(error)
        )
        print("========================================")
        print()

        flash(
            f"Unable to add product: {str(error)}",
            "error"
        )

        return redirect(
            url_for(
                "admin_add_product"
            )
        )

    finally:

        safe_close(
            cursor,
            connection
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

    flash(
        "You have been logged out.",
        "success"
    )

    return redirect(
        url_for("admin_login")
    )


# =========================================================
# UPLOAD ERROR
# =========================================================

@app.errorhandler(413)
def request_entity_too_large(error):

    flash(
        "The uploaded files are too large. Please upload smaller images.",
        "error"
    )

    return redirect(
        url_for("admin_add_product")
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