import os
import secrets
import sqlite3
from datetime import datetime, timedelta
from functools import wraps
from flask import request, redirect, session, jsonify, render_template
from werkzeug.security import generate_password_hash, check_password_hash

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'andy.grunes@generac.com')
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', ADMIN_EMAIL).split(',')}
AUTH_DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'auth.db')


def get_auth_db():
    os.makedirs(os.path.dirname(AUTH_DATABASE), exist_ok=True)
    conn = sqlite3.connect(AUTH_DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db():
    conn = get_auth_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password_hash TEXT,
        name TEXT,
        added_by TEXT,
        added_at TEXT,
        last_login TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS invite_links (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT,
        expires_at TEXT,
        used INTEGER DEFAULT 0
    )''')
    c.execute('INSERT OR IGNORE INTO users (email, added_by, added_at) VALUES (?, ?, ?)',
              (ADMIN_EMAIL.lower(), 'SYSTEM', datetime.now().isoformat()))
    # Set default admin password on first run if not already set
    row = c.execute('SELECT password_hash FROM users WHERE email=?', (ADMIN_EMAIL.lower(),)).fetchone()
    if row and not row[0]:
        from werkzeug.security import generate_password_hash
        c.execute('UPDATE users SET password_hash=?, name=? WHERE email=?',
                  (generate_password_hash('Generac2026'), 'Andy Grunes', ADMIN_EMAIL.lower()))
    conn.commit()
    conn.close()


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('user_email'):
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('user_email'):
            return redirect('/login')
        if session.get('user_email', '').lower() not in ADMIN_EMAILS:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


def is_admin_user():
    return session.get('user_email', '').lower() in ADMIN_EMAILS


def register_auth_routes(app):
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'GET':
            return render_template('login.html', error=None)
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        if not email or not password:
            return render_template('login.html', error='Email and password required')
        if not email.endswith('@generac.com'):
            return render_template('login.html', error='Only @generac.com email addresses are allowed')
        conn = get_auth_db()
        user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        conn.close()
        if not user or not user['password_hash']:
            return render_template('login.html', error='Invalid credentials')
        if not check_password_hash(user['password_hash'], password):
            return render_template('login.html', error='Invalid credentials')
        session['user_email'] = email
        session['user_name'] = user['name'] or email.split('@')[0]
        conn = get_auth_db()
        conn.execute('UPDATE users SET last_login=? WHERE email=?', (datetime.now().isoformat(), email))
        conn.commit()
        conn.close()
        return redirect('/')

    @app.route('/logout')
    def logout():
        session.clear()
        return redirect('/login')

    @app.route('/invite/<token>', methods=['GET', 'POST'])
    def accept_invite(token):
        conn = get_auth_db()
        inv = conn.execute('SELECT * FROM invite_links WHERE token=? AND used=0', (token,)).fetchone()
        conn.close()
        if not inv:
            return render_template('login.html', error='Invalid or expired invite link')
        if inv['expires_at'] and datetime.fromisoformat(inv['expires_at']) < datetime.now():
            return render_template('login.html', error='Invite link has expired')
        if request.method == 'GET':
            return render_template('invite.html', email=inv['email'], token=token)
        name = request.form.get('name', '').strip()
        password = request.form.get('password', '').strip()
        if not name or not password or len(password) < 6:
            return render_template('invite.html', email=inv['email'], token=token,
                                   error='Name required and password must be at least 6 characters')
        conn = get_auth_db()
        conn.execute('UPDATE users SET password_hash=?, name=? WHERE email=?',
                     (generate_password_hash(password), name, inv['email']))
        conn.execute('UPDATE invite_links SET used=1 WHERE token=?', (token,))
        conn.commit()
        conn.close()
        session['user_email'] = inv['email']
        session['user_name'] = name
        return redirect('/')

    @app.route('/admin')
    @require_admin
    def admin_page():
        conn = get_auth_db()
        users = conn.execute('SELECT * FROM users ORDER BY added_at DESC').fetchall()
        invites = conn.execute('SELECT * FROM invite_links WHERE used=0 ORDER BY created_at DESC').fetchall()
        conn.close()
        return render_template('admin.html', users=[dict(u) for u in users],
                               invites=[dict(i) for i in invites],
                               admin_emails=ADMIN_EMAILS,
                               user_name=session.get('user_name', ''),
                               is_admin=True)

    @app.route('/admin/invite', methods=['POST'])
    @require_admin
    def create_invite():
        email = request.form.get('email', '').strip().lower()
        if not email:
            return redirect('/admin')
        if not email.endswith('@generac.com'):
            return redirect('/admin')
        conn = get_auth_db()
        conn.execute('INSERT OR IGNORE INTO users (email, added_by, added_at) VALUES (?,?,?)',
                     (email, session['user_email'], datetime.now().isoformat()))
        token = secrets.token_urlsafe(32)
        expires = (datetime.now() + timedelta(days=7)).isoformat()
        conn.execute('INSERT INTO invite_links (token, email, created_by, created_at, expires_at) VALUES (?,?,?,?,?)',
                     (token, email, session['user_email'], datetime.now().isoformat(), expires))
        conn.commit()
        conn.close()
        return redirect('/admin')

    @app.route('/admin/remove', methods=['POST'])
    @require_admin
    def remove_user():
        email = request.form.get('email', '').strip().lower()
        if email and email not in ADMIN_EMAILS:
            conn = get_auth_db()
            conn.execute('DELETE FROM users WHERE email=?', (email,))
            conn.commit()
            conn.close()
        return redirect('/admin')
