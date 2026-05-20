import os
import sqlite3
from datetime import datetime

DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'cost.db')


def get_db():
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_store_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_number TEXT,
        description TEXT,
        process TEXT,
        material_family TEXT,
        material TEXT,
        complexity INTEGER,
        coo TEXT,
        volume_cm3 REAL,
        price_hv REAL,
        tool_price REAL,
        tool_lt REAL,
        supplier TEXT,
        product TEXT,
        revision TEXT,
        finish TEXT,
        thickness_mm REAL,
        envelope_x_mm REAL,
        envelope_y_mm REAL,
        envelope_z_mm REAL,
        production_lt REAL,
        added_by TEXT,
        updated_at TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS model_params (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        params_json TEXT,
        updated_by TEXT,
        updated_at TEXT
    )''')
    conn.commit()
    conn.close()


def get_all_parts():
    conn = get_db()
    rows = conn.execute('SELECT * FROM parts ORDER BY id').fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_part(data, added_by):
    conn = get_db()
    now = datetime.now().isoformat()
    conn.execute('''INSERT INTO parts
        (part_number, description, process, material_family, material,
         complexity, coo, volume_cm3, price_hv, tool_price, tool_lt, supplier,
         product, revision, finish, thickness_mm, envelope_x_mm, envelope_y_mm, envelope_z_mm, production_lt,
         added_by, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (data.get('part_number', ''), data.get('description', ''),
         data.get('process', ''), data.get('material_family', ''),
         data.get('material', ''), data.get('complexity', 1),
         data.get('coo', ''), data.get('volume_cm3', 0),
         data.get('price_hv', 0), data.get('tool_price', 0),
         data.get('tool_lt', 0), data.get('supplier', ''),
         data.get('product', ''), data.get('revision', ''),
         data.get('finish', ''), data.get('thickness_mm', 0),
         data.get('envelope_x_mm', 0), data.get('envelope_y_mm', 0),
         data.get('envelope_z_mm', 0), data.get('production_lt', 0),
         added_by, now))
    conn.commit()
    conn.close()


def update_part(part_id, data):
    conn = get_db()
    now = datetime.now().isoformat()
    conn.execute('''UPDATE parts SET
        part_number=?, description=?, process=?, material_family=?, material=?,
        complexity=?, coo=?, volume_cm3=?, price_hv=?, tool_price=?, tool_lt=?,
        supplier=?, product=?, revision=?, finish=?, thickness_mm=?,
        envelope_x_mm=?, envelope_y_mm=?, envelope_z_mm=?, production_lt=?, updated_at=?
        WHERE id=?''',
        (data.get('part_number', ''), data.get('description', ''),
         data.get('process', ''), data.get('material_family', ''),
         data.get('material', ''), data.get('complexity', 1),
         data.get('coo', ''), data.get('volume_cm3', 0),
         data.get('price_hv', 0), data.get('tool_price', 0),
         data.get('tool_lt', 0), data.get('supplier', ''),
         data.get('product', ''), data.get('revision', ''),
         data.get('finish', ''), data.get('thickness_mm', 0),
         data.get('envelope_x_mm', 0), data.get('envelope_y_mm', 0),
         data.get('envelope_z_mm', 0), data.get('production_lt', 0),
         now, part_id))
    conn.commit()
    conn.close()


def delete_part(part_id):
    conn = get_db()
    conn.execute('DELETE FROM parts WHERE id=?', (part_id,))
    conn.commit()
    conn.close()


def bulk_insert_parts(parts_list, added_by):
    conn = get_db()
    now = datetime.now().isoformat()
    for p in parts_list:
        pn = str(p.get('part_number', '')).strip()
        conn.execute('''INSERT INTO parts
            (part_number, description, process, material_family, material,
             complexity, coo, volume_cm3, price_hv, tool_price, tool_lt, supplier,
             product, revision, finish, thickness_mm, envelope_x_mm, envelope_y_mm, envelope_z_mm, production_lt,
             added_by, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (pn, p.get('description', ''), p.get('process', ''),
             p.get('material_family', ''), p.get('material', ''),
             p.get('complexity', 1), p.get('coo', ''),
             p.get('volume_cm3', 0), p.get('price_hv', 0),
             p.get('tool_price', 0), p.get('tool_lt', 0),
             p.get('supplier', ''), added_by, now))
    conn.commit()
    conn.close()
    return len(parts_list)


def get_model_params():
    conn = get_db()
    row = conn.execute('SELECT params_json FROM model_params ORDER BY id DESC LIMIT 1').fetchone()
    conn.close()
    if row:
        return row['params_json']
    return None


def save_model_params(params_json, updated_by):
    conn = get_db()
    now = datetime.now().isoformat()
    conn.execute('INSERT INTO model_params (params_json, updated_by, updated_at) VALUES (?,?,?)',
                 (params_json, updated_by, now))
    conn.commit()
    conn.close()
