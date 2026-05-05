import os
from dotenv import load_dotenv
import pymysql

load_dotenv()

try:
    conn = pymysql.connect(
        host=os.environ.get('PAYROLL_DB_HOST', 'localhost'),
        user=os.environ.get('PAYROLL_DB_USER', 'root'),
        password=os.environ.get('PAYROLL_DB_PASSWORD', '06012005'),
        database=os.environ.get('PAYROLL_DB_NAME', 'payroll_2026'),
    )
    
    cursor = conn.cursor()
    
    # Lấy danh sách tất cả table
    cursor.execute("SHOW TABLES")
    print("=== PAYROLL DATABASE TABLES ===")
    tables = cursor.fetchall()
    for table in tables:
        print(f"  - {table[0]}")
    
    # Kiểm tra employees table
    print("\n=== EMPLOYEES TABLE STRUCTURE ===")
    cursor.execute("DESCRIBE employees")
    for col in cursor.fetchall():
        print(f"  {col[0]:20s} {col[1]:30s}")
    
    # Kiểm tra xem có bảng departments_payroll không
    cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'payroll_2026' AND table_name = 'departments_payroll'")
    has_dept_table = cursor.fetchone()[0]
    print(f"\n=== Departments table exists: {bool(has_dept_table)} ===")
    
    if has_dept_table:
        print("\n=== DEPARTMENTS_PAYROLL TABLE STRUCTURE ===")
        cursor.execute("DESCRIBE departments_payroll")
        for col in cursor.fetchall():
            print(f"  {col[0]:20s} {col[1]:30s}")
    
    # Count records
    print("\n=== RECORD COUNTS ===")
    cursor.execute("SELECT COUNT(*) FROM employees")
    print(f"  Employees: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM salaries")
    print(f"  Salaries: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM attendance")
    print(f"  Attendance: {cursor.fetchone()[0]}")
    
    cursor.close()
    conn.close()
    print("\n✅ MySQL Payroll Database check completed!")

except Exception as e:
    print(f"❌ Error: {str(e)}")
