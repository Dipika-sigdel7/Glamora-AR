import os
import uuid
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

from werkzeug.security import check_password_hash
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

        print("CATEGORY ERROR:", error)

        return []

    finally:

        if cursor:
            cursor.close()

        connection.close()


def get_product_image(product_id):

    connection = get_db_connection()

    if connection is None:
        return None

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute("""
            SELECT
                image_url
            FROM product_images
            WHERE product_id = %s
            ORDER BY
                is_primary DESC,
                id ASC
            LIMIT 1
        """, (product_id,))

        image = cursor.fetchone()

        if image:
            return image["image_url"]

        return None

    except Exception as error:

        print("PRODUCT IMAGE ERROR:", error)

        return None

    finally:

        if cursor:
            cursor.close()

        connection.close()


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
        # PRODUCTS
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

        # =================================================
        # CATEGORIES
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
                "| AVAILABLE:",
                product["is_available"],
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
        print(error)
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

                c.name AS category_name

            FROM products p

            LEFT JOIN categories c
                ON c.id = p.category_id

            WHERE p.id = %s

            LIMIT 1
        """, (product_id,))

        product = cursor.fetchone()

        if not product:

            flash(
                "Product not found.",
                "error"
            )

            return redirect(
                url_for("beauty")
            )

        cursor.execute("""
            SELECT
                id,
                image_url,
                is_primary
            FROM product_images
            WHERE product_id = %s
            ORDER BY
                is_primary DESC,
                id ASC
        """, (product_id,))

        images = cursor.fetchall()

        return render_template(
            "product_details.html",
            product=product,
            images=images
        )

    except Exception as error:

        print("PRODUCT DETAILS ERROR:", error)

        flash(
            "Unable to load product.",
            "error"
        )

        return redirect(
            url_for("beauty")
        )

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
# LOGIN
# =========================================================

@app.route("/login")
def login():

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

            cursor.execute("""
                SELECT
                    id,
                    name,
                    email,
                    password_hash
                FROM admins
                WHERE email = %s
                LIMIT 1
            """, (email,))

            admin = cursor.fetchone()

            if (
                admin
                and check_password_hash(
                    admin["password_hash"],
                    password
                )
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

            print("ADMIN LOGIN ERROR:", error)

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

        print("DASHBOARD ERROR:", error)

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

        return render_template(
            "admin/products.html",
            admin_name=session.get(
                "admin_name",
                "Admin"
            ),
            products=products
        )

    except Exception as error:

        print("ADMIN PRODUCTS ERROR:", error)

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
        # GET
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
        # FORM VALUES
        # =================================================

        name = request.form.get(
            "name",
            ""
        ).strip()

        description = request.form.get(
            "description",
            ""
        ).strip()

        category_id = request.form.get(
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
                category_id
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

        cursor.execute("""
            SELECT
                id,
                name
            FROM categories
            WHERE id = %s
            LIMIT 1
        """, (category_id,))

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

        # =================================================
        # PRICE
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

            if not filename:

                continue

            if not allowed_image(filename):

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
        # DATABASE TRANSACTION
        # =================================================

        connection.start_transaction()

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
                product_type,
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
                app.config[
                    "PRODUCT_UPLOAD_FOLDER"
                ],
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
        # COMMIT
        # =================================================

        connection.commit()

        print()
        print("========================================")
        print("PRODUCT ADDED SUCCESSFULLY")
        print("========================================")
        print("Product ID:", product_id)
        print("Product:", name)
        print("Category:", selected_category["name"])
        print("Product Type:", product_type)
        print("Images:", len(valid_images))
        print("Available:", is_available)
        print("========================================")
        print()

        flash(
            "Product added successfully!",
            "success"
        )

        return redirect(
            url_for("admin_products")
        )

    except Exception as error:

        try:
            connection.rollback()
        except Exception:
            pass

        for file_path in saved_files:

            try:

                if os.path.exists(file_path):

                    os.remove(
                        file_path
                    )

            except Exception as cleanup_error:

                print(
                    "IMAGE CLEANUP ERROR:",
                    cleanup_error
                )

        print()
        print("========================================")
        print("ADD PRODUCT ERROR")
        print("========================================")
        print(error)
        print("========================================")
        print()

        flash(
            "Unable to add product. Please try again.",
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