from flask import Blueprint, jsonify, request, current_app
from decimal import Decimal
from ..auth_middleware import token_required, require_roles

report_bp = Blueprint('report_bp', __name__)

# --- API lấy danh sách các tháng có dữ liệu lương ---
@report_bp.route('/api/payroll/months', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def get_payroll_months():
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT MONTH(SalaryMonth) as month, YEAR(SalaryMonth) as year FROM salaries ORDER BY year DESC, month DESC")
        records = cursor.fetchall()
        return jsonify(records), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()

@report_bp.route('/api/payroll/details', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def get_payroll_details():
    # Nhận tháng/năm từ query params, mặc định = 9/2024 (khớp với data thực tế)
    month = request.args.get('month', 9, type=int)
    year = request.args.get('year', 2024, type=int)
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        # Kết nối bảng lương và nhân viên để lấy tên hiển thị
        sql = """
            SELECT s.SalaryID, ep.FullName, s.BaseSalary, s.Bonus, s.Deductions, s.NetSalary 
            FROM salaries s
            JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
            WHERE MONTH(s.SalaryMonth) = %s AND YEAR(s.SalaryMonth) = %s
        """
        cursor.execute(sql, (month, year))
        records = cursor.fetchall()
        return jsonify(records), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()
        
@report_bp.route('/api/reports/payroll_list', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def get_payroll_list():
    # Nhận tháng/năm từ query params, mặc định = 9/2024 (khớp với data thực tế)
    month = request.args.get('month', 9, type=int)
    year = request.args.get('year', 2024, type=int)
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        sql = """
            SELECT s.SalaryID, ep.FullName, s.BaseSalary, s.Bonus, s.Deductions, s.NetSalary 
            FROM salaries s
            JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
            WHERE MONTH(s.SalaryMonth) = %s AND YEAR(s.SalaryMonth) = %s
        """
        cursor.execute(sql, (month, year))
        records = cursor.fetchall()
        return jsonify(records), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()

# --- ROUTE 2: Báo cáo Chấm công (Cho biểu đồ Recharts) ---
@report_bp.route('/api/reports/attendance', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def get_attendance_report():
    month = request.args.get('month', 9, type=int)
    year = request.args.get('year', 2024, type=int)
    show_all = request.args.get('showall', 'false').lower() == 'true'
    
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        sql_query = """
            SELECT 
                ep.FullName, 
                SUM(a.WorkDays) AS TotalWorkDays,
                SUM(a.LeaveDays) AS TotalLeaveDays,
                SUM(a.AbsentDays) AS TotalAbsentDays
            FROM attendance a
            JOIN employees_payroll ep ON a.EmployeeID = ep.EmployeeID
            WHERE MONTH(a.AttendanceMonth) = %s AND YEAR(a.AttendanceMonth) = %s
            GROUP BY a.EmployeeID, ep.FullName
        """
        
        if not show_all:
            sql_query += " HAVING SUM(a.AbsentDays) > 0"
        sql_query += " ORDER BY TotalAbsentDays DESC;"
        
        cursor.execute(sql_query, (month, year))
        records = cursor.fetchall()
        
        result = []
        for row in records:
            result.append({
                "FullName": row['FullName'],
                "TotalWorkDays": float(row['TotalWorkDays']),
                "TotalLeaveDays": float(row['TotalLeaveDays']),
                "TotalAbsentDays": float(row['TotalAbsentDays'])
            })
            
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[ERROR] Lấy báo cáo chấm công thất bại: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()