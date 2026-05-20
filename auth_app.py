import os
import secrets
import sqlite3
from datetime import datetime, timedelta
from functools import wraps
from flask import request, redirect, session, jsonify, render_template
from werkzeug.security import generate_password_hash, check_password_hash

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "andy.grunes@generac.com")
AUTH_DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "auth.db")


def get_auth_db():
    os.makedirs(os.path.dirname(AUTH_DATABASE), exist_ok=True)
    conn = sqlite3.connect(AUTH_DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db():
    conn = get_auth_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password_hash TEXT,
        name TEXT,
        role TEXT DEFAULT 'user',
        added_by TEXT,
        added_at TEXT,
        last_login TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS invite_links (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT,
        expires_at TEXT,
        used INTEGER DEFAULT 0
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS reset_links (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT,
        expires_at TEXT,
        used INTEGER DEFAULT 0
    )""")
    try:
        c.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
    except sqlite3.OperationalError:
        pass
    c.execute("INSERT OR IGNORE INTO users (email, role, added_by, added_at) VALUES (?, ?, ?, ?)",
              (ADMIN_EMAIL.lower(), "admin", "SYSTEM", datetime.now().isoformat()))
    row = c.execute("SELECT password_hash, role FROM users WHERE email=?", (ADMIN_EMAIL.lower(),)).fetchone()
    if row and not row["password_hash"]:
        c.execute("UPDATE users SET password_hash=?, name=?, role=? WHERE email=?",
                  (generate_password_hash("Generac2026"), "Andy Grunes", "admin", ADMIN_EMAIL.lower()))
    elif row and row["role"] != "admin":
        c.execute("UPDATE users SET role=? WHERE email=?", ("admin", ADMIN_EMAIL.lower()))
    conn.commit()
    conn.close()


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_email"):
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_email"):
            return redirect("/login")
        if not is_admin_user():
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated


def is_admin_user():
    email = session.get("user_email", "").lower()
    if not email:
        return False
    conn = get_auth_db()
    row = conn.execute("SELECT role FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    return row and row["role"] == "admin"


def register_auth_routes(app):
    @app.route("/login", methods=["GET", "POST"])
    def login():
        if request.method == "GET":
            return render_template("login.html", error=None)
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "").strip()
        if not email or not password:
            return render_template("login.html", error="Email and password required")
        if not email.endswith("@generac.com"):
            return render_template("login.html", error="Only @generac.com email addresses are allowed")
        conn = get_auth_db()
        user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        conn.close()
        if not user or not user["password_hash"]:
            return render_template("login.html", error="Invalid credentials")
        if not check_password_hash(user["password_hash"], password):
            return render_template("login.html", error="Invalid credentials")
        session["user_email"] = email
        session["user_name"] = user["name"] or email.split("@")[0]
        conn = get_auth_db()
        conn.execute("UPDATE users SET last_login=? WHERE email=?", (datetime.now().isoformat(), email))
        conn.commit()
        conn.close()
        return redirect("/")

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect("/login")

    @app.route("/invite/<token>", methods=["GET", "POST"])
    def accept_invite(token):
        conn = get_auth_db()
        inv = conn.execute("SELECT * FROM invite_links WHERE token=? AND used=0", (token,)).fetchone()
        conn.close()
        if not inv:
            return render_template("login.html", error="Invalid or expired invite link")
        if inv["expires_at"] and datetime.fromisoformat(inv["expires_at"]) < datetime.now():
            return render_template("login.html", error="Invite link has expired")
        if request.method == "GET":
            return render_template("invite.html", email=inv["email"], token=token)
        name = request.form.get("name", "").strip()
        password = request.form.get("password", "").strip()
        if not name or not password or len(password) < 6:
            return render_template("invite.html", email=inv["email"], token=token,
                                   error="Name required and password must be at least 6 characters")
        conn = get_auth_db()
        conn.execute("UPDATE users SET password_hash=?, name=? WHERE email=?",
                     (generate_password_hash(password), name, inv["email"]))
        conn.execute("UPDATE invite_links SET used=1 WHERE token=?", (token,))
        conn.commit()
        conn.close()
        session["user_email"] = inv["email"]
        session["user_name"] = name
        return redirect("/")

    @app.route("/reset-password/<token>", methods=["GET", "POST"])
    def reset_password(token):
        conn = get_auth_db()
        link = conn.execute("SELECT * FROM reset_links WHERE token=? AND used=0", (token,)).fetchone()
        conn.close()
        if not link:
            return render_template("login.html", error="Invalid or expired reset link")
        if link["expires_at"] and datetime.fromisoformat(link["expires_at"]) < datetime.now():
            return render_template("login.html", error="Reset link has expired")
        if request.method == "GET":
            return render_template("reset_password.html", email=link["email"], token=token)
        password = request.form.get("password", "").strip()
        if not password or len(password) < 6:
            return render_template("reset_password.html", email=link["email"], token=token,
                                   error="Password must be at least 6 characters")
        conn = get_auth_db()
        conn.execute("UPDATE users SET password_hash=? WHERE email=?",
                     (generate_password_hash(password), link["email"]))
        conn.execute("UPDATE reset_links SET used=1 WHERE token=?", (token,))
        conn.commit()
        conn.close()
        return render_template("login.html", error=None, success="Password reset successfully. You can now sign in.")

    @app.route("/change-password", methods=["GET", "POST"])
    @require_auth
    def change_password():
        if request.method == "GET":
            return render_template("change_password.html",
                                   user_name=session.get("user_name", ""),
                                   is_admin=is_admin_user())
        current = request.form.get("current_password", "").strip()
        new_pw = request.form.get("new_password", "").strip()
        confirm = request.form.get("confirm_password", "").strip()
        if not current or not new_pw:
            return render_template("change_password.html", error="All fields are required",
                                   user_name=session.get("user_name", ""), is_admin=is_admin_user())
        if new_pw != confirm:
            return render_template("change_password.html", error="New passwords do not match",
                                   user_name=session.get("user_name", ""), is_admin=is_admin_user())
        if len(new_pw) < 6:
            return render_template("change_password.html", error="Password must be at least 6 characters",
                                   user_name=session.get("user_name", ""), is_admin=is_admin_user())
        conn = get_auth_db()
        user = conn.execute("SELECT password_hash FROM users WHERE email=?", (session["user_email"],)).fetchone()
        if not user or not check_password_hash(user["password_hash"], current):
            conn.close()
            return render_template("change_password.html", error="Current password is incorrect",
                                   user_name=session.get("user_name", ""), is_admin=is_admin_user())
        conn.execute("UPDATE users SET password_hash=? WHERE email=?",
                     (generate_password_hash(new_pw), session["user_email"]))
        conn.commit()
        conn.close()
        return render_template("change_password.html", success="Password changed successfully",
                               user_name=session.get("user_name", ""), is_admin=is_admin_user())

    @app.route("/admin")
    @require_admin
    def admin_page():
        conn = get_auth_db()
        users = conn.execute("SELECT * FROM users ORDER BY added_at DESC").fetchall()
        invites = conn.execute("SELECT * FROM invite_links WHERE used=0 ORDER BY created_at DESC").fetchall()
        reset_links = conn.execute("SELECT * FROM reset_links WHERE used=0 ORDER BY created_at DESC").fetchall()
        conn.close()
        return render_template("admin.html", users=[dict(u) for u in users],
                               invites=[dict(i) for i in invites],
                               reset_links=[dict(r) for r in reset_links],
                               admin_email=ADMIN_EMAIL.lower(),
                               user_name=session.get("user_name", ""),
                               is_admin=True)

    @app.route("/admin/invite", methods=["POST"])
    @require_admin
    def create_invite():
        email = request.form.get("email", "").strip().lower()
        role = request.form.get("role", "user").strip().lower()
        if role not in ("admin", "user"):
            role = "user"
        if not email:
            return redirect("/admin")
        if not email.endswith("@generac.com"):
            return redirect("/admin")
        conn = get_auth_db()
        conn.execute("INSERT OR IGNORE INTO users (email, role, added_by, added_at) VALUES (?,?,?,?)",
                     (email, role, session["user_email"], datetime.now().isoformat()))
        token = secrets.token_urlsafe(32)
        expires = (datetime.now() + timedelta(days=7)).isoformat()
        conn.execute("INSERT INTO invite_links (token, email, created_by, created_at, expires_at) VALUES (?,?,?,?,?)",
                     (token, email, session["user_email"], datetime.now().isoformat(), expires))
        conn.commit()
        conn.close()
        return redirect("/admin")

    @app.route("/admin/toggle-role", methods=["POST"])
    @require_admin
    def toggle_role():
        email = request.form.get("email", "").strip().lower()
        if not email or email == ADMIN_EMAIL.lower():
            return redirect("/admin")
        conn = get_auth_db()
        user = conn.execute("SELECT role FROM users WHERE email=?", (email,)).fetchone()
        if user:
            new_role = "admin" if user["role"] != "admin" else "user"
            conn.execute("UPDATE users SET role=? WHERE email=?", (new_role, email))
            conn.commit()
        conn.close()
        return redirect("/admin")

    @app.route("/admin/reset-password", methods=["POST"])
    @require_admin
    def admin_reset_password():
        email = request.form.get("email", "").strip().lower()
        if not email:
            return redirect("/admin")
        conn = get_auth_db()
        user = conn.execute("SELECT email FROM users WHERE email=?", (email,)).fetchone()
        if not user:
            conn.close()
            return redirect("/admin")
        token = secrets.token_urlsafe(32)
        expires = (datetime.now() + timedelta(days=7)).isoformat()
        conn.execute("INSERT INTO reset_links (token, email, created_by, created_at, expires_at) VALUES (?,?,?,?,?)",
                     (token, email, session["user_email"], datetime.now().isoformat(), expires))
        conn.commit()
        conn.close()
        return redirect("/admin")

    @app.route("/admin/remove", methods=["POST"])
    @require_admin
    def remove_user():
        email = request.form.get("email", "").strip().lower()
        if email and email != ADMIN_EMAIL.lower() and email != session.get("user_email", "").lower():
            conn = get_auth_db()
            conn.execute("DELETE FROM users WHERE email=?", (email,))
            conn.execute("DELETE FROM invite_links WHERE email=?", (email,))
            conn.execute("DELETE FROM reset_links WHERE email=?", (email,))
            conn.commit()
            conn.close()
        return redirect("/admin")
