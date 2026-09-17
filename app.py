
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

app.secret_key = "glamora-ar-secret-key"


# =========================================================
# UPLOAD CONFIGURATION
# =========================================================

PRODUCT_UPLOAD_FOLDER = os.path.join(
    app.root_path,
    "static",
    "uploads",
    "products"
)

os.makedirs(
    PRODUCT_UPLOAD_FOLDER,
    exist_ok=True
)

app.config["PRODUCT_UPLOAD_FOLDER"] = PRODUCT_UPLOAD_FOLDER

# Maximum complete request size
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
    "highlight": "highlighter",
}


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def allowed_image(filename):

    if not filename:
        return False

    filename = secure_filename(filename)

    if "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()

    return extension in ALLOWED_IMAGE_EXTENSIONS


def get_file_extension(filename):

    filename = secure_filename(filename)

    if "." not in filename:
        return ""

    return filename.rsplit(".", 1)[1].lower()


# =========================================================
# NORMALIZE PRODUCT TYPE
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

    if value in PRODUCT_TYPE_ALIASES:
        return PRODUCT_TYPE_ALIASES[value]

    no_hyphen = value.replace("-", " ")

    if no_hyphen in PRODUCT_TYPE_ALIASES:
        return PRODUCT_TYPE_ALIASES[no_hyphen]

    return value.replace(" ", "-")


# =========================================================
# PREPARE PRODUCTS
# =========================================================

def prepare_products(products):

    for product in products:

        product["product_type_key"] = normalize_product_type(
            product.get("product_type")
        )

    return products


# =========================================================
# GET CATEGORIES
# =========================================================

def get_categories():

    connection = get_db_connection()

    if connection is None:
        return []

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute("""
            SELECT
                id,
                name,
                description
            FROM categories
            ORDER BY name ASC
        """)

        return cursor.fetchall()

    except Exception as error:

        print(
            "CATEGORY ERROR:",
            type(error).__name__,
            str(error)
        )

        return []

    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# GET PRIMARY PRODUCT IMAGE
# =========================================================

def get_product_image(product_id):

    connection = get_db_connection()

    if connection is None:
        return None

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

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

        image = cursor.fetchone()

        if image:
            return image["image_url"]

        return None

    except Exception as error:

        print(
            "PRODUCT IMAGE ERROR:",
            type(error).__name__,
            str(error)
        )

        return None

    finally:

        if cursor:
            cursor.close()

        connection.close()


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
            categories=[]
        )

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        # =================================================
        # LOAD AVAILABLE PRODUCTS
        # =================================================

        cursor.execute("""
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
        """)

        products = cursor.fetchall()

        products = prepare_products(
            products
        )

        # =================================================
        # LOAD CATEGORIES
        # =================================================

        cursor.execute("""
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
        """)

        categories = cursor.fetchall()

        # =================================================
        # DEBUG
        # =================================================

        print()
        print("========================================")
        print("GLAMORA AR - BEAUTY PAGE")
        print("========================================")
        print("Products found:", len(products))
        print("Categories found:", len(categories))

        for product in products:

            print(
                "PRODUCT:",
                product["id"],
                "|",
                product["name"],
                "| CATEGORY:",
                product["category_name"],
                "| TYPE:",
                product["product_type"],
                "| TYPE KEY:",
                product["product_type_key"],
                "| IMAGE:",
                product["image_url"]
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
            categories=[]
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# PRODUCT DETAILS
# =========================================================

@app.route("/product/<int:product_id>")
def product_details(product_id):

    connection = get_db_connection()

    # =====================================================
    # DATABASE CONNECTION CHECK
    # =====================================================

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
                ON c.id = p.category_id

            WHERE p.id = %s

            LIMIT 1
            """,
            (product_id,)
        )

        product = cursor.fetchone()

        # =================================================
        # PRODUCT NOT FOUND
        # =================================================

        if not product:

            flash(
                "Product not found.",
                "error"
            )

            return redirect(
                url_for("beauty")
            )

        # =================================================
        # NORMALIZE PRODUCT TYPE
        # =================================================

        product["product_type_key"] = normalize_product_type(
            product.get("product_type")
        )

        # =================================================
        # GET PRODUCT IMAGES
        # =================================================

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

        # =================================================
        # PRIMARY IMAGE
        # =================================================

        if images:

            product["image_url"] = images[0].get(
                "image_url"
            )

        else:

            product["image_url"] = None

        # =================================================
        # GET PRODUCT REVIEWS
        #
        # This requires the product_reviews table.
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

            reviews = cursor.fetchall()

        except Exception as review_error:

            # Reviews should not prevent the product
            # details page from loading if the review
            # table has not been created yet.

            print()
            print("========================================")
            print("PRODUCT REVIEWS LOAD WARNING")
            print("========================================")
            print(
                "ERROR TYPE:",
                type(review_error).__name__
            )
            print(
                "ERROR MESSAGE:",
                str(review_error)
            )
            print("========================================")
            print()

            reviews = []

        # =================================================
        # REVIEW SUMMARY
        # =================================================

        review_count = len(reviews)

        if review_count > 0:

            total_rating = sum(
                int(review.get("rating") or 0)
                for review in reviews
            )

            average_rating = round(
                total_rating / review_count,
                1
            )

        else:

            average_rating = 0

        # =================================================
        # DEBUG INFORMATION
        # =================================================

        print()
        print("========================================")
        print("GLAMORA AR - PRODUCT DETAILS")
        print("========================================")
        print(
            "PRODUCT ID:",
            product.get("id")
        )
        print(
            "PRODUCT NAME:",
            product.get("name")
        )
        print(
            "CATEGORY:",
            product.get("category_name")
        )
        print(
            "PRODUCT TYPE:",
            product.get("product_type")
        )
        print(
            "PRODUCT TYPE KEY:",
            product.get("product_type_key")
        )
        print(
            "PRICE:",
            product.get("price")
        )
        print(
            "STOCK:",
            product.get("stock")
        )
        print(
            "IMAGE COUNT:",
            len(images)
        )
        print(
            "REVIEW COUNT:",
            review_count
        )
        print(
            "AVERAGE RATING:",
            average_rating
        )
        print("========================================")
        print()

        # =================================================
        # RENDER PRODUCT DETAILS PAGE
        # =================================================

        return render_template(
            "product_details.html",
            product=product,
            images=images,
            reviews=reviews,
            review_count=review_count,
            average_rating=average_rating
        )

    # =====================================================
    # ERROR HANDLING
    # =====================================================

    except Exception as error:

        print()
        print("========================================")
        print("PRODUCT DETAILS ERROR")
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
            "Unable to load product.",
            "error"
        )

        return redirect(
            url_for("beauty")
        )

    # =====================================================
    # CLOSE DATABASE RESOURCES
    # =====================================================

    finally:

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


# ADD TO CART
@app.route("/cart/add/<int:product_id>", methods=["POST"])
def add_to_cart(product_id):

    if not session.get("user_id"):
        flash("Please login to add products to your cart.", "error")
        return redirect(url_for("login"))

    connection = get_db_connection()

    if connection is None:
        flash("Database connection failed.", "error")
        return redirect(url_for(
            "product_details",
            product_id=product_id
        ))

    cursor = None

    try:

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, name, price, stock, is_available
            FROM products
            WHERE id = %s
            LIMIT 1
        """, (product_id,))

        product = cursor.fetchone()

        if not product:

            flash("Product not found.", "error")

            return redirect(url_for("beauty"))


        if not product["is_available"] or product["stock"] <= 0:

            flash("This product is currently out of stock.", "error")

            return redirect(url_for(
                "product_details",
                product_id=product_id
            ))


        user_id = session["user_id"]


        cursor.execute("""
            SELECT id, quantity
            FROM cart_items
            WHERE user_id = %s
              AND product_id = %s
            LIMIT 1
        """, (user_id, product_id))

        existing = cursor.fetchone()


        if existing:

            new_quantity = existing["quantity"] + 1

            if new_quantity > product["stock"]:
                new_quantity = product["stock"]

            cursor.execute("""
                UPDATE cart_items
                SET quantity = %s
                WHERE id = %s
            """, (new_quantity, existing["id"]))

        else:

            cursor.execute("""
                INSERT INTO cart_items
                (user_id, product_id, quantity)
                VALUES (%s, %s, 1)
            """, (user_id, product_id))


        connection.commit()

        flash(
            f"{product['name']} added to your cart.",
            "success"
        )

        return redirect(url_for(
            "product_details",
            product_id=product_id
        ))


    except Exception as error:

        connection.rollback()

        print("ADD TO CART ERROR:", error)

        flash(
            "Unable to add product to cart.",
            "error"
        )

        return redirect(url_for(
            "product_details",
            product_id=product_id
        ))


    finally:

        if cursor:
            cursor.close()

        connection.close()



# ADD REVIEW WITH IMAGE
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

        return redirect(url_for("login"))


    rating_value = request.form.get("rating", "").strip()

    review_text = request.form.get(
        "review_text",
        ""
    ).strip()


    try:

        rating = int(rating_value)

        if rating < 1 or rating > 5:
            raise ValueError

    except (ValueError, TypeError):

        flash(
            "Please select a valid rating.",
            "error"
        )

        return redirect(url_for(
            "product_details",
            product_id=product_id
        ))


    connection = get_db_connection()

    if connection is None:

        flash(
            "Database connection failed.",
            "error"
        )

        return redirect(url_for(
            "product_details",
            product_id=product_id
        ))


    cursor = None
    saved_file = None


    try:

        cursor = connection.cursor(dictionary=True)


        # CHECK PRODUCT

        cursor.execute("""
            SELECT id
            FROM products
            WHERE id = %s
            LIMIT 1
        """, (product_id,))

        product = cursor.fetchone()


        if not product:

            flash(
                "Product not found.",
                "error"
            )

            return redirect(url_for("beauty"))


        # GET USER

        cursor.execute("""
            SELECT id, name
            FROM users
            WHERE id = %s
            LIMIT 1
        """, (session["user_id"],))

        user = cursor.fetchone()


        if not user:

            session.clear()

            flash(
                "Please login again.",
                "error"
            )

            return redirect(url_for("login"))


        # REVIEW IMAGE

        review_image_url = None

        image = request.files.get("review_image")


        if image and image.filename:

            filename = secure_filename(
                image.filename
            )

            if not allowed_image(filename):

                flash(
                    "Only JPG, JPEG, PNG, WEBP and GIF images are allowed.",
                    "error"
                )

                return redirect(url_for(
                    "product_details",
                    product_id=product_id
                ))


            extension = get_file_extension(
                filename
            )


            unique_filename = (
                "review_"
                + uuid.uuid4().hex
                + "."
                + extension
            )


            review_folder = os.path.join(
                app.root_path,
                "static",
                "uploads",
                "reviews"
            )

            os.makedirs(
                review_folder,
                exist_ok=True
            )


            saved_file = os.path.join(
                review_folder,
                unique_filename
            )


            image.save(saved_file)


            review_image_url = (
                "/static/uploads/reviews/"
                + unique_filename
            )


        # INSERT REVIEW

        cursor.execute("""
            INSERT INTO product_reviews
            (
                product_id,
                user_id,
                customer_name,
                rating,
                review_text,
                review_image
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            product_id,
            session["user_id"],
            user["name"],
            rating,
            review_text,
            review_image_url
        ))


        connection.commit()


        flash(
            "Thank you! Your review has been submitted.",
            "success"
        )


        return redirect(url_for(
            "product_details",
            product_id=product_id
        ))


    except Exception as error:

        connection.rollback()

        if saved_file and os.path.exists(saved_file):

            try:
                os.remove(saved_file)
            except Exception:
                pass


        print(
            "PRODUCT REVIEW ERROR:",
            error
        )


        flash(
            "Unable to submit your review.",
            "error"
        )


        return redirect(url_for(
            "product_details",
            product_id=product_id
        ))


    finally:

        if cursor:
            cursor.close()

        connection.close()


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
                url_for("login")
            )

        conn = get_db_connection()

        if conn is None:

            flash(
                "Database connection failed.",
                "error"
            )

            return redirect(
                url_for("login")
            )

        cursor = None

        try:

            cursor = conn.cursor(
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

            user = None

        finally:

            if cursor:
                cursor.close()

            conn.close()

        if not user:

            flash(
                "Invalid email or password.",
                "error"
            )

            return redirect(
                url_for("login")
            )

        if not check_password_hash(
            user["password"],
            password
        ):

            flash(
                "Invalid email or password.",
                "error"
            )

            return redirect(
                url_for("login")
            )

        session["user_id"] = user["id"]
        session["user_name"] = user["name"]
        session["user_email"] = user["email"]
        session["logged_in"] = True

        return redirect(
            url_for("home")
        )

    return render_template(
        "login.html"
    )


# =========================================================
# REGISTER
# =========================================================

@app.route(
    "/register",
    methods=["GET", "POST"]
)
def register():

    return render_template(
        "register.html"
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

            if admin and check_password_hash(
                admin["password_hash"],
                password
            ):

                session["admin_id"] = admin["id"]
                session["admin_name"] = admin["name"]
                session["admin_email"] = admin["email"]

                flash(
                    f"Welcome back, {admin['name']}!",
                    "success"
                )

                return redirect(
                    url_for("admin_dashboard")
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

            if cursor:
                cursor.close()

            connection.close()

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

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM products
        """)

        total_products = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM categories
        """)

        total_categories = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM users
        """)

        total_users = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM products
            WHERE is_available = 1
        """)

        available_products = cursor.fetchone()["total"]

        cursor.execute("""
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
        """)

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

        if cursor:
            cursor.close()

        connection.close()


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

        cursor.execute("""
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
        """)

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

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# ADMIN ADD PRODUCT
# =========================================================

@app.route(
    "/admin/products/add",
    methods=["GET", "POST"]
)
def admin_add_product():

    # =====================================================
    # ADMIN CHECK
    # =====================================================

    if not admin_required():

        return redirect(
            url_for("admin_login")
        )

    # =====================================================
    # DATABASE CONNECTION
    # =====================================================

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

        # =================================================
        # LOAD CATEGORIES
        # =================================================

        cursor.execute("""
            SELECT
                id,
                name,
                description
            FROM categories
            ORDER BY name ASC
        """)

        categories = cursor.fetchall()

        # =================================================
        # GET REQUEST
        # =================================================

        if request.method == "GET":

            return render_template(
                "admin/add_product.html",
                admin_name=session.get(
                    "admin_name",
                    "Admin"
                ),
                categories=categories
            )

        # =================================================
        # FORM DATA
        # =================================================

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
            if request.form.get("is_available")
            else 0
        )

        # =================================================
        # VALIDATE NAME
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
        # VALIDATE CATEGORY
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

        selected_category = cursor.fetchone()

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
        # VALIDATE PRODUCT TYPE
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

        product_type_key = normalize_product_type(
            product_type
        )

        # =================================================
        # VALIDATE PRICE
        # =================================================

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
        # VALIDATE STOCK
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
        # GET IMAGES
        # =================================================

        image_files = request.files.getlist(
            "images"
        )

        valid_images = []

        for image in image_files:

            if not image:
                continue

            if not image.filename:
                continue

            filename = secure_filename(
                image.filename
            )

            if not filename:
                continue

            # ---------------------------------------------
            # EXTENSION
            # ---------------------------------------------

            if not allowed_image(
                filename
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

            # ---------------------------------------------
            # FILE SIZE
            # ---------------------------------------------

            image.seek(
                0,
                os.SEEK_END
            )

            file_size = image.tell()

            image.seek(0)

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

        # =================================================
        # REQUIRE IMAGE
        # =================================================

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

        if not product_id:

            raise Exception(
                "Product ID was not generated."
            )

        # =================================================
        # SAVE IMAGES
        # =================================================

        for index, (
            image,
            extension
        ) in enumerate(valid_images):

            unique_filename = (
                uuid.uuid4().hex
                + "."
                + extension
            )

            file_path = os.path.join(
                app.config["PRODUCT_UPLOAD_FOLDER"],
                unique_filename
            )

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

        # =================================================
        # COMMIT EVERYTHING
        # =================================================

        connection.commit()

        # =================================================
        # SUCCESS DEBUG
        # =================================================

        print()
        print("========================================")
        print("PRODUCT ADDED SUCCESSFULLY")
        print("========================================")
        print("Product ID:", product_id)
        print("Product:", name)
        print(
            "Category:",
            selected_category["name"]
        )
        print(
            "Product Type:",
            product_type_key
        )
        print(
            "Images:",
            len(valid_images)
        )
        print(
            "Available:",
            is_available
        )
        print("========================================")
        print()

        flash(
            "Product added successfully!",
            "success"
        )

        return redirect(
            url_for("admin_products")
        )

    # =====================================================
    # ERROR HANDLING
    # =====================================================

    except Exception as error:

        # -------------------------------------------------
        # ROLLBACK DATABASE
        # -------------------------------------------------

        try:

            connection.rollback()

        except Exception as rollback_error:

            print(
                "ROLLBACK ERROR:",
                type(rollback_error).__name__,
                str(rollback_error)
            )

        # -------------------------------------------------
        # DELETE SAVED IMAGES
        # -------------------------------------------------

        for file_path in saved_files:

            try:

                if os.path.exists(
                    file_path
                ):

                    os.remove(
                        file_path
                    )

            except Exception as cleanup_error:

                print(
                    "IMAGE CLEANUP ERROR:",
                    type(cleanup_error).__name__,
                    str(cleanup_error)
                )

        # -------------------------------------------------
        # PRINT REAL ERROR
        # -------------------------------------------------

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

        # -------------------------------------------------
        # SHOW ACTUAL ERROR
        # -------------------------------------------------

        flash(
            f"Unable to add product: {str(error)}",
            "error"
        )

        return redirect(
            url_for("admin_add_product")
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
# MAXIMUM UPLOAD ERROR
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

