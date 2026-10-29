import sqlite3

conn = sqlite3.connect('maddu-new/backend/dakshin.db')
cursor = conn.cursor()

def add_col(table, col_name, col_type):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
        print(f"Added {col_name} to {table}")
    except Exception as e:
        print(f"Column {col_name} on {table}: {e}")

listings_cols = [
    ("description", "TEXT"),
    ("unit", "TEXT"),
    ("rate_unit", "TEXT"),
    ("min_order", "TEXT"),
    ("min_order_qty", "REAL"),
    ("available_qty", "TEXT"),
    ("moisture", "TEXT"),
    ("protein", "TEXT"),
    ("specs", "TEXT"),
    ("operator_info", "TEXT"),
    ("service_coverage", "TEXT"),
    ("delivery_info", "TEXT")
]

for name, ctype in listings_cols:
    add_col("listings", name, ctype)

orders_cols = [
    ("order_type", "TEXT DEFAULT 'LIVESTOCK'"),
    ("quantity", "REAL"),
    ("unit", "TEXT"),
    ("unit_price", "REAL"),
    ("delivery_charge", "REAL DEFAULT 0.0"),
    ("delivery_address", "TEXT"),
    ("pincode", "TEXT"),
    ("required_date", "TEXT"),
    ("start_time", "TEXT"),
    ("duration_val", "REAL"),
    ("pricing_option", "TEXT"),
    ("customer_name", "TEXT"),
    ("customer_phone", "TEXT"),
    ("notes", "TEXT"),
    ("booking_ref", "TEXT")
]

for name, ctype in orders_cols:
    add_col("orders", name, ctype)

conn.commit()
conn.close()
print("Migration completed successfully!")

