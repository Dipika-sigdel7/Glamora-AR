from flask import Flask, render_template

app = Flask(__name__)


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# BEAUTY PAGE
# =========================================================

@app.route("/beauty")
def beauty():
    return render_template("beauty.html")


# =========================================================
# ABOUT PAGE
# =========================================================

@app.route("/about")
def about():
    return render_template("about.html")


# =========================================================
# CONTACT PAGE
# =========================================================

@app.route("/contact")
def contact():
    return render_template("contact.html")


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )