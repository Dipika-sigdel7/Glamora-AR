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

app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=3650)
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

    value = str(product_type).strip().lower()

    value = value.replace("_", " ")

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
        "lipstick": "lipstick",
        "lipsticks": "lipstick",
        "liquid lipstick": "lipstick",
        "liquid-lipstick": "lipstick",

        "eyeshadow": "eyeshadow",
        "eyeshadows": "eyeshadow",
        "eye shadow": "eyeshadow",
        "eye-shadows": "eyeshadow",

        "blush": "blush",
        "blushes": "blush",

        "eyeliner": "eyeliner",
        "eyeliners": "eyeliner",
        "eye liner": "eyeliner",
        "eye-liner": "eyeliner",

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
            normalize_product_type(product_type)
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
                str(category_name).lower()
            ).strip("-")

            product["category_slug"] = category_slug

        else:

            product["category_slug"] = ""

        # -------------------------------------------------
        # PRODUCT TYPE SLUG
        # -------------------------------------------------

        product["product_type_slug"] = (
            product["product_type_key"]
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

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT COALESCE(
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
        "bag_count": get_bag_count(),
        "current_user": current_user,
        "is_logged_in": bool(
            session.get("user_id")
        )
    }


# =========================================================
# REFRESH USER SESSION
# =========================================================

@app.before_request
def refresh_user_session():

    if session.get("user_id"):
        session.permanent = True


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

            WHERE p.is_available = 1

            ORDER BY
                p.id DESC
            """
        )

        products = cursor.fetchall() or []

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

        categories = cursor.fetchall() or []

        print("\n")
        print("=" * 60)
        print("GLAMORA AR - BEAUTY PAGE")
        print("=" * 60)

        print(
            "PRODUCT COUNT:",
            len(products)
        )

        for product in products:

            print(
                "ID:",
                product.get("id"),
                "| NAME:",
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

        print("=" * 60)
        print("\n")

        return render_template(
            "beauty.html",
            products=products,
            categories=categories
        )

    except Exception as error:

        print("\n")
        print("!" * 60)
        print("BEAUTY PAGE ERROR")
        print("ERROR:", repr(error))
        print("!" * 60)
        print("\n")

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
# REGISTER
# =========================================================

@app.route(
    "/register",
    methods=["GET", "POST"]
)
def register():

    next_url = request.args.get(
        "next",
        ""
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

        next_url = request.form.get(
            "next",
            ""
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

        if not email:

            flash(
                "Please enter your email.",
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

        if password != confirm_password:

            flash(
                "Passwords do not match.",
                "error"
            )

            return render_template(
                "register.html",
                next=next_url
            )

        if len(password) < 6:

            flash(
                "Password must be at least 6 characters.",
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

            cursor = connection.cursor(
                dictionary=True
            )

            cursor.execute(
                """
                SELECT
                    id
                FROM users
                WHERE email = %s
                LIMIT 1
                """,
                (email,)
            )

            existing_user = cursor.fetchone()

            if existing_user:

                flash(
                    "An account with this email already exists.",
                    "error"
                )

                return render_template(
                    "register.html",
                    next=next_url
                )

            password_hash = generate_password_hash(
                password
            )

            cursor.execute(
                """
                INSERT INTO users (
                    name,
                    email,
                    password
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
                    password_hash
                )
            )

            connection.commit()

            flash(
                "Registration successful. Please log in.",
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
                "REGISTER ERROR:",
                repr(error)
            )

            flash(
                "Unable to create account.",
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

    return render_template(
        "register.html",
        next=next_url
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

        next_url = request.form.get(
            "next",
            ""
        )

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
                WHERE email = %s
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
                "password"
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

                password_valid = check_password_hash(
                    stored_password,
                    password
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

            if next_url:

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

    session.pop(
        "user_id",
        None
    )

    session.pop(
        "user_name",
        None
    )

    session.pop(
        "user_email",
        None
    )

    session.pop(
        "logged_in",
        None
    )

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

        cursor = connection.cursor(
            dictionary=True
        )

        print("\n")
        print("=" * 60)
        print("GLAMORA AR - PRODUCT DETAILS")
        print("=" * 60)
        print(
            "PRODUCT ID:",
            product_id
        )

        # =================================================
        # GET PRODUCT
        # =================================================

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

        print(
            "PRODUCT RESULT:",
            product
        )

        # -------------------------------------------------
        # PRODUCT NOT FOUND
        # -------------------------------------------------

        if not product:

            print(
                "PRODUCT NOT FOUND:",
                product_id
            )

            flash(
                "Product not found.",
                "error"
            )

            return redirect(
                url_for("beauty")
            )

        # =================================================
        # GET PRODUCT IMAGES
        # =================================================

        images = []

        try:

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

            images = cursor.fetchall() or []

            print(
                "PRODUCT IMAGES:",
                images
            )

        except Exception as image_error:

            print(
                "PRODUCT IMAGES ERROR:",
                repr(image_error)
            )

            images = []

        # =================================================
        # PRIMARY IMAGE
        # =================================================

        product["image_url"] = None

        if images:

            product["image_url"] = (
                images[0].get(
                    "image_url"
                )
            )

        print(
            "PRIMARY IMAGE:",
            product.get("image_url")
        )

        # =================================================
        # GET REVIEWS
        # =================================================

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

            reviews = cursor.fetchall() or []

            print(
                "REVIEW COUNT:",
                len(reviews)
            )

        except Exception as review_error:

            print(
                "PRODUCT REVIEWS ERROR:",
                repr(review_error)
            )

            reviews = []

        # =================================================
        # REVIEW COUNT
        # =================================================

        review_count = len(
            reviews
        )

        # =================================================
        # AVERAGE RATING
        # =================================================

        average_rating = 0

        if reviews:

            ratings = []

            for review in reviews:

                try:

                    rating = float(
                        review.get(
                            "rating",
                            0
                        )
                    )

                    if rating > 0:

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

        print(
            "AVERAGE RATING:",
            average_rating
        )

        # =================================================
        # RENDER PRODUCT DETAILS
        # =================================================

        print(
            "RENDERING product_details.html"
        )

        print("=" * 60)
        print("\n")

        return render_template(
            "product_details.html",
            product=product,
            images=images,
            reviews=reviews,
            review_count=review_count,
            average_rating=average_rating
        )

    except Exception as error:

        # =================================================
        # ERROR OUTPUT ONLY
        # =================================================

        print("\n")
        print("!" * 60)
        print("PRODUCT DETAILS ERROR")
        print("!" * 60)
        print(
            "PRODUCT ID:",
            product_id
        )
        print(
            "ERROR:",
            repr(error)
        )
        print("!" * 60)
        print("\n")

        # -------------------------------------------------
        # NO FLASH MESSAGE HERE
        # -------------------------------------------------

        return redirect(
            url_for("beauty")
        )

    finally:

        safe_close(
            cursor=cursor,
            connection=connection
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

        if review_file and review_file.filename:

            filename = secure_filename(
                review_file.filename
            )

            if not allowed_image(
                filename
            ):

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

            review_file.seek(
                0
            )

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

        existing_item = cursor.fetchone()

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

        existing_item = cursor.fetchone()

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

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

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
                p.description,
                p.price,
                p.stock,
                p.shade,
                p.color,
                p.product_type,
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
                ON ci.product_id = p.id

            WHERE ci.user_id = %s

            ORDER BY
                ci.id DESC
            """,
            (session["user_id"],)
        )

        cart_items = cursor.fetchall() or []

        subtotal = Decimal("0.00")

        for item in cart_items:

            try:

                price = Decimal(
                    str(
                        item.get(
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

                price = Decimal("0.00")

            quantity = int(
                item.get(
                    "quantity",
                    0
                ) or 0
            )

            item["line_total"] = (
                price * quantity
            )

            subtotal += item[
                "line_total"
            ]

        return render_template(
            "cart.html",
            cart_items=cart_items,
            subtotal=subtotal
        )

    except Exception as error:

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
            subtotal=Decimal("0.00")
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

    if not session.get(
        "admin_id"
    ):

        return False

    return True


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

            return render_template(
                "admin/login.html"
            )

        connection = None
        cursor = None

        try:

            connection = get_db_connection()

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
                WHERE email = %s
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
                url_for(
                    "admin_dashboard"
                )
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

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            """
        )

        product_result = cursor.fetchone()

        product_count = int(
            product_result.get(
                "total",
                0
            ) or 0
        )

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM categories
            """
        )

        category_result = cursor.fetchone()

        category_count = int(
            category_result.get(
                "total",
                0
            ) or 0
        )

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM users
            """
        )

        user_result = cursor.fetchone()

        user_count = int(
            user_result.get(
                "total",
                0
            ) or 0
        )

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM products
            WHERE is_available = 1
            """
        )

        available_result = cursor.fetchone()

        available_count = int(
            available_result.get(
                "total",
                0
            ) or 0
        )

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

            ORDER BY
                p.id DESC

            LIMIT 10
            """
        )

        recent_products = (
            cursor.fetchall() or []
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

    try:

        connection = get_db_connection()

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
                ON p.category_id = c.id

            ORDER BY
                p.id DESC
            """
        )

        products = cursor.fetchall() or []

        products = prepare_products(
            products
        )

        return render_template(
            "admin/products.html",
            products=products
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

    if request.method == "POST":

        try:

            # -------------------------------------------------
            # FORM VALUES
            # -------------------------------------------------

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
            # VALIDATION
            # -------------------------------------------------

            if not name:

                flash(
                    "Product name is required.",
                    "error"
                )

                return redirect(
                    url_for(
                        "admin_add_product"
                    )
                )

            try:

                price = Decimal(
                    price_value
                )

                if price < 0:

                    raise InvalidOperation

            except (
                InvalidOperation,
                ValueError,
                TypeError
            ):

                flash(
                    "Please enter a valid price.",
                    "error"
                )

                return redirect(
                    url_for(
                        "admin_add_product"
                    )
                )

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
                    url_for(
                        "admin_add_product"
                    )
                )

            try:

                category_id = int(
                    category_id_value
                )

            except (
                ValueError,
                TypeError
            ):

                category_id = None

            is_available = (
                1
                if is_available_value
                else 0
            )

            # -------------------------------------------------
            # NORMALIZE PRODUCT TYPE
            # -------------------------------------------------

            normalized_type = normalize_product_type(
                product_type
            )

            # -------------------------------------------------
            # GET FILES
            # -------------------------------------------------

            image_files = request.files.getlist(
                "images"
            )

            # -------------------------------------------------
            # DATABASE
            # -------------------------------------------------

            connection = get_db_connection()

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
            # SAVE PRODUCT IMAGES
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

                if not allowed_image(
                    filename
                ):

                    continue

                image_file.seek(
                    0,
                    os.SEEK_END
                )

                file_size = image_file.tell()

                image_file.seek(
                    0
                )

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

                image_url = (
                    "uploads/products/"
                    + unique_filename
                )

                valid_images.append(
                    image_url
                )

            # -------------------------------------------------
            # INSERT IMAGE RECORDS
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

            # -------------------------------------------------
            # COMMIT
            # -------------------------------------------------

            connection.commit()

            flash(
                "Product added successfully.",
                "success"
            )

            return redirect(
                url_for(
                    "admin_products"
                )
            )

        except Exception as error:

            if connection:

                try:
                    connection.rollback()
                except Exception:
                    pass

            print("\n")
            print("!" * 60)
            print("ADMIN ADD PRODUCT ERROR")
            print("ERROR:", repr(error))
            print("!" * 60)
            print("\n")

            flash(
                "Unable to add product. Please check the server console.",
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

    # =====================================================
    # GET CATEGORIES
    # =====================================================

    try:

        connection = get_db_connection()

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
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )