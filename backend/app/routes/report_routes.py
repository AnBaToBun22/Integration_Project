from flask import Blueprint, jsonify, request, current_app
from decimal import Decimal
from ..auth_middleware import token_required, require_roles

report_bp = Blueprint('report_bp', __name__)

# API Báo cáo Chấm công (UC.13) - Lấy từ MySQL (PAYROLL)
@report_bp.route('/api/reports/attendance', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager', 'Payroll Manager'])
def get_attendance_report(current_user_role):
    month = request.args.get('month', 12, type=int)
    year = request.args.get('year', 2025, type=int)
    show_all = request.args.get('showall', 'false').lower() == 'true'
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        # Câu lệnh SQL an toàn với %s placeholders
        sql_query = """
            SELECT 
                ep.FullName, 
                SUM(a.WorkDays) AS TotalWorkDays,
                SUM(a.LeaveDays) AS TotalLeaveDays,
                SUM(a.AbsentDays) AS TotalAbsentDays
            FROM attendance a
            JOIN employeespayroll ep ON a.EmployeeID = ep.EmployeeID
            WHERE MONTH(a.AttendanceMonth) = %s AND YEAR(a.AttendanceMonth) = %s
            GROUP BY a.EmployeeID, ep.FullName
        """
        # Thêm điều kiện HAVING linh hoạt (nếu không showall)
        if not show_all:
            sql_query += " HAVING SUM(a.AbsentDays) > 0"
        sql_query += " ORDER BY TotalAbsentDays DESC;"  # Sắp xếp theo số ngày vắng giảm dần
        cursor.execute(sql_query, (month, year))
        records = cursor.fetchall()
        # Ép kiểu Decimal -> float để trả JSON hợp lệ
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
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()