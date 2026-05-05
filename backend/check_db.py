import sqlite3

conn = sqlite3.connect('instance/auth_dashboard.db')
c = conn.cursor()

# Xem tất cả bảng
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("=== TABLES ===")
for row in c.fetchall():
    print(f"  - {row[0]}")

# Xem cấu trúc bảng users
print("\n=== USERS TABLE SCHEMA ===")
c.execute("PRAGMA table_info(users)")
for col in c.fetchall():
    print(f"  {col[1]:20s} {col[2]:15s} {'NOT NULL' if col[3] else 'NULLABLE'}")

# Xem dữ liệu
print("\n=== USER DATA ===")
c.execute("SELECT id, username, role, created_at FROM users")
rows = c.fetchall()
if rows:
    for r in rows:
        print(f"  ID={r[0]}, Username={r[1]}, Role={r[2]}, Created={r[3]}")
else:
    print("  (empty - no users registered yet)")

print(f"\nTotal: {len(rows)} users")
conn.close()
