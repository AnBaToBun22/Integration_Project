from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required
from decimal import Decimal

report_bp = Blueprint('report_bp', __name__)


# --- API lấy danh sách các tháng có dữ liệu lương ---
@report_bp.route('/api/payroll/months', methods=['GET'])
@token_required
def get_payroll_months(current_user_role, **kwargs):
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT MONTH(SalaryMonth) as month, YEAR(SalaryMonth) as year 
            FROM salaries ORDER BY year DESC, month DESC
        """)
        records = cursor.fetchall()
        return jsonify(records), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()


# --- Báo cáo chi tiết lương theo tháng ---
@report_bp.route('/api/payroll/details', methods=['GET'])
@token_required
def get_payroll_details(current_user_role, **kwargs):
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
        
        # Serialize Decimal → float cho JSON
        result = []
        for row in records:
            result.append({
                "SalaryID": row['SalaryID'],
                "FullName": row['FullName'],
                "BaseSalary": float(row['BaseSalary']),
                "Bonus": float(row['Bonus']),
                "Deductions": float(row['Deductions']),
                "NetSalary": float(row['NetSalary'])
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()


@report_bp.route('/api/reports/payroll_list', methods=['GET'])
@token_required
def get_payroll_list(current_user_role, **kwargs):
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
        
        result = []
        for row in records:
            result.append({
                "SalaryID": row['SalaryID'],
                "FullName": row['FullName'],
                "BaseSalary": float(row['BaseSalary']),
                "Bonus": float(row['Bonus']),
                "Deductions": float(row['Deductions']),
                "NetSalary": float(row['NetSalary'])
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()


# --- Báo cáo Chấm công ---
@report_bp.route('/api/reports/attendance', methods=['GET'])
@token_required
def get_attendance_report(current_user_role, **kwargs):
    month = request.args.get('month', 9, type=int)
    year = request.args.get('year', 2024, type=int)
    show_all = request.args.get('showall', 'true').lower() == 'true'
    
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


# --- Báo cáo Cổ tức (MỚI) ---
@report_bp.route('/api/reports/dividends', methods=['GET'])
@token_required
def get_dividends_report(current_user_role, **kwargs):
    """Báo cáo cổ tức từ HR DB (SQL Server)"""
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT d.DividendID, e.FullName, d.DividendAmount, d.DividendDate
            FROM Dividends d
            JOIN Employees e ON d.EmployeeID = e.EmployeeID
            ORDER BY d.DividendDate DESC
        """)
        
        columns = [col[0] for col in cursor.description]
        records = []
        for row in cursor.fetchall():
            record = dict(zip(columns, row))
            record['DividendAmount'] = float(record['DividendAmount'])
            if record.get('DividendDate') and hasattr(record['DividendDate'], 'isoformat'):
                record['DividendDate'] = record['DividendDate'].isoformat()
            records.append(record)
        
        return jsonify(records), 200
    except Exception as e:
        print(f"[ERROR] Lấy báo cáo cổ tức thất bại: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()


# --- Báo cáo tổng hợp (MỚI) ---
@report_bp.route('/api/reports/summary', methods=['GET'])
@token_required
def get_summary_report(current_user_role, **kwargs):
    """Báo cáo tổng hợp kết hợp HR + Payroll + Dividends"""
    summary = {
        "hr": {"total_employees": 0, "active_employees": 0, "departments": 0, "positions": 0},
        "payroll": {"total_salary": 0, "avg_salary": 0, "salary_records": 0},
        "attendance": {"avg_work_days": 0, "total_absent": 0}
    }
    
    # HR Data
    try:
        conn = current_app.get_hr_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM Employees")
        summary["hr"]["total_employees"] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM Employees WHERE Status = N'Đang làm việc' OR Status = N'Active'")
        summary["hr"]["active_employees"] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM Departments")
        summary["hr"]["departments"] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM Positions")
        summary["hr"]["positions"] = cursor.fetchone()[0]
        
        
        conn.close()
    except Exception as e:
        print(f"[SUMMARY] HR error: {e}")
    
    # Payroll Data
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COALESCE(SUM(NetSalary), 0) as total, COALESCE(AVG(NetSalary), 0) as avg, COUNT(*) as cnt FROM salaries")
        row = cursor.fetchone()
        summary["payroll"]["total_salary"] = float(row['total'])
        summary["payroll"]["avg_salary"] = float(row['avg'])
        summary["payroll"]["salary_records"] = row['cnt']
        
        cursor.execute("SELECT COALESCE(AVG(WorkDays), 0) as avg_work, COALESCE(SUM(AbsentDays), 0) as total_absent FROM attendance")
        row = cursor.fetchone()
        summary["attendance"]["avg_work_days"] = float(row['avg_work'])
        summary["attendance"]["total_absent"] = float(row['total_absent'])
        
        conn.close()
    except Exception as e:
        print(f"[SUMMARY] Payroll error: {e}")
    
    return jsonify(summary), 200