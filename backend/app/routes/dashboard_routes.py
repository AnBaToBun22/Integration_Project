from flask import Blueprint, jsonify, current_app
from decimal import Decimal
from ..models import AuditLog
dashboard_bp = Blueprint('dashboard_bp', __name__)

@dashboard_bp.route('/api/logs', methods=['GET'])
def get_audit_logs():
    try:
        # Lấy danh sách log, sắp xếp mới nhất lên đầu
        logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(50).all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
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
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM Employees")
        stats["hr_total_employees"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM Employees WHERE Status = N'Đang làm việc' OR Status = N'Active'")
        stats["hr_active_employees"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM Departments")
        stats["hr_departments"] = cursor.fetchone()[0]

        stats["hr_connected"] = True
        conn.close()
    except Exception as e:
        print(f"[Dashboard] HR DB error: {e}")

    # === 2. Lấy dữ liệu từ Payroll (MySQL) ===
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as cnt FROM employees_payroll")
        stats["payroll_employee_count"] = cursor.fetchone()['cnt']

        cursor.execute("SELECT COALESCE(SUM(NetSalary), 0) as total FROM salaries")
        total = cursor.fetchone()['total']
        stats["payroll_total_salary"] = float(total) if total else 0

        cursor.execute("SELECT COUNT(*) as cnt FROM salaries")
        stats["payroll_salary_records"] = cursor.fetchone()['cnt']

        stats["payroll_connected"] = True
        conn.close()
    except Exception as e:
        print(f"[Dashboard] Payroll DB error: {e}")

    return jsonify(stats), 200
