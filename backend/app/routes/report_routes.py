from flask import Blueprint, jsonify, request, current_app
from decimal import Decimal
from ..auth_middleware import token_required, require_roles

report_bp = Blueprint('report_bp', __name__)

# API Báo cáo Chấm công (UC.13) - Lấy từ MySQL (PAYROLL)
@report_bp.route('/api/reports/attendance', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager', 'Payroll Manager']) # Chặn quyền Employee
def get_attendance_report(current_user_role):
    # 1. Nhận tham số từ request (URL của React gửi lên)
    # type=int đảm bảo dữ liệu nhận được luôn là số
    month = request.args.get('month', 12, type=int) 
    year = request.args.get('year', 2025, type=int)

    try:
        # 2. Lấy connection kết nối MySQL từ current_app
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()

        # 3. Câu lệnh SQL (Dùng %s để truyền biến, giúp chống SQL Injection tuyệt đối)
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
            HAVING TotalAbsentDays > 0
            ORDER BY TotalAbsentDays DESC;
        """
        
        # Thực thi SQL và truyền 2 biến month, year vào chỗ %s
        cursor.execute(sql_query, (month, year))
        records = cursor.fetchall() # Lấy toàn bộ danh sách kết quả

        # 4. Xử lý ép kiểu dữ liệu Decimal thành Float chuẩn JSON
        result = []
        for row in records:
            # Lệnh SUM trong SQL thường trả về kiểu Decimal, hàm jsonify của Flask sẽ báo lỗi nếu không ép về float
            result.append({
                "FullName": row['FullName'],
                "TotalWorkDays": float(row['TotalWorkDays']) if isinstance(row['TotalWorkDays'], Decimal) else row['TotalWorkDays'],
                "TotalLeaveDays": float(row['TotalLeaveDays']) if isinstance(row['TotalLeaveDays'], Decimal) else row['TotalLeaveDays'],
                "TotalAbsentDays": float(row['TotalAbsentDays']) if isinstance(row['TotalAbsentDays'], Decimal) else row['TotalAbsentDays']
            })

        # 5. Trả kết quả JSON về cho Frontend với HTTP Status 200 (Thành công)
        return jsonify(result), 200

    except Exception as e:
        # Bắt lỗi DB sập hoặc sai câu lệnh và báo về HTTP Status 500
        return jsonify({"error": str(e)}), 500
    finally:
        # 6. Luôn nhớ đóng kết nối DB để không bị tràn bộ nhớ Server
        if 'cursor' in locals(): 
            cursor.close()
        if 'conn' in locals(): 
            conn.close()