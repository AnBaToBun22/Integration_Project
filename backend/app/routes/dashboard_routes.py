from flask import Blueprint, jsonify, current_app
from decimal import Decimal

dashboard_bp = Blueprint('dashboard_bp', __name__)

@dashboard_bp.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """API tổng hợp dữ liệu cho trang Dashboard"""
    stats = {
        "hr_total_employees": 0,
        "hr_active_employees": 0,
        "hr_departments": 0,
        "payroll_total_salary": 0,
        "payroll_employee_count": 0,
        "payroll_salary_records": 0,
        "hr_connected": False,
        "payroll_connected": False
    }

    # === 1. Lấy dữ liệu từ HR (SQL Server) ===
    try:
        conn = current_app.get_hr_db()
        stats["hr_connected"] = True
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT COUNT(*) FROM Employees")
            row = cursor.fetchone()
            stats["hr_total_employees"] = row[0] if row else 0

            cursor.execute("SELECT COUNT(*) FROM Employees WHERE Status = N'Đang làm việc' OR Status = N'Active'")
            row = cursor.fetchone()
            stats["hr_active_employees"] = row[0] if row else 0

            cursor.execute("SELECT COUNT(*) FROM Departments")
            row = cursor.fetchone()
            stats["hr_departments"] = row[0] if row else 0
        except Exception as q_e:
            print(f"[Dashboard] HR DB Query error: {q_e}")
        finally:
            conn.close()
    except Exception as e:
        print(f"[Dashboard] HR DB Connection error: {e}")

    # === 2. Lấy dữ liệu từ Payroll (MySQL) ===
    try:
        conn = current_app.get_payroll_db()
        stats["payroll_connected"] = True
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT COUNT(*) as cnt FROM employees_payroll")
            row = cursor.fetchone()
            stats["payroll_employee_count"] = row['cnt'] if row else 0

            cursor.execute("SELECT COALESCE(SUM(NetSalary), 0) as total FROM salaries")
            row = cursor.fetchone()
            total = row['total'] if row else 0
            stats["payroll_total_salary"] = float(total) if total else 0

            cursor.execute("SELECT COUNT(*) as cnt FROM salaries")
            row = cursor.fetchone()
            stats["payroll_salary_records"] = row['cnt'] if row else 0
        except Exception as q_e:
            print(f"[Dashboard] Payroll DB Query error: {q_e}")
        finally:
            conn.close()
    except Exception as e:
        print(f"[Dashboard] Payroll DB Connection error: {e}")

    return jsonify(stats), 200
