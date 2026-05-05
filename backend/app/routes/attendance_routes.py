from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta

attendance_bp = Blueprint('attendance_bp', __name__)

@attendance_bp.route('/api/attendance/detail', methods=['GET'])
def get_attendance_detail():
    try:
        employee_id = request.args.get('employee_id', type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        year = request.args.get('year', datetime.now().year, type=int)
        
        if not employee_id:
            return jsonify({"error": "Thiếu employee_id"}), 400
        
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        # 1. Lấy thông tin nhân viên
        cursor.execute("""
            SELECT EmployeeID, FullName 
            FROM employees_payroll 
            WHERE EmployeeID = %s
        """, (employee_id,))
        employee = cursor.fetchone()
        
        if not employee:
            return jsonify({"error": "Không tìm thấy nhân viên"}), 404
        
        employee_dict = {
            'EmployeeID': employee['EmployeeID'],
            'FullName': employee['FullName'],
            'Department': '---'
        }
        
        # 2. Lấy dữ liệu chấm công từ bảng attendance (cấu trúc đúng)
        cursor.execute("""
            SELECT 
                AttendanceMonth,
                WorkDays,
                LeaveDays,
                AbsentDays
            FROM attendance 
            WHERE EmployeeID = %s 
            AND MONTH(AttendanceMonth) = %s 
            AND YEAR(AttendanceMonth) = %s
        """, (employee_id, month, year))
        
        attendance_record = cursor.fetchone()
        
        # 3. Xử lý dữ liệu
        if attendance_record:
            work_days = attendance_record.get('WorkDays', 0) or 0
            leave_days = attendance_record.get('LeaveDays', 0) or 0
            absent_days = attendance_record.get('AbsentDays', 0) or 0
        else:
            work_days = 0
            leave_days = 0
            absent_days = 0
        
        # Tính tổng số ngày công chuẩn trong tháng
        first_day = datetime(year, month, 1)
        if month == 12:
            last_day = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = datetime(year, month + 1, 1) - timedelta(days=1)
        
        total_days = 0
        current_date = first_day
        while current_date <= last_day:
            if current_date.weekday() < 6:  # Thứ 2 đến thứ 7
                total_days += 1
            current_date += timedelta(days=1)
        
        # Tính tỷ lệ
        absence_rate = (absent_days / total_days * 100) if total_days > 0 else 0
        
        # Tạo chi tiết theo ngày (dạng tổng hợp, không chi tiết từng ngày vì bảng không lưu check_in/out)
        attendance_details = []
        current_date = first_day
        weekday_names = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
        
        while current_date <= last_day:
            weekday = current_date.weekday()
            weekday_name = weekday_names[weekday]
            has_shift = weekday < 6
            
            if has_shift:
                # Không thể biết chi tiết từng ngày, chỉ hiển thị tổng hợp
                status_label = '📊 Dữ liệu tổng hợp'
                status_color = 'text-blue-500'
            else:
                status_label = '📅 Nghỉ (Chủ nhật)'
                status_color = 'text-gray-400'
            
            attendance_details.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'weekday': weekday_name,
                'check_in': '---',
                'check_out': '---',
                'work_hours': '---',
                'overtime_hours': '---',
                'status_label': status_label,
                'status_color': status_color
            })
            
            current_date += timedelta(days=1)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'employee': employee_dict,
            'month': month,
            'year': year,
            'attendance_details': attendance_details,
            'statistics': {
                'total_days': total_days,
                'work_days': work_days,
                'late_days': 0,
                'early_days': 0,
                'absent_days': absent_days,
                'leave_days': leave_days,
                'total_work_hours': work_days * 8,  # Mỗi ngày 8 giờ
                'total_overtime_hours': 0,
                'absence_rate': round(absence_rate, 2)
            }
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Lấy chi tiết chấm công: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@attendance_bp.route('/api/attendance/employees', methods=['GET'])
def get_attendance_employees():
    """Lấy danh sách nhân viên để chọn xem chấm công"""
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT EmployeeID, FullName
            FROM employees_payroll 
            ORDER BY FullName
        """)
        employees = cursor.fetchall()
        for emp in employees:
            emp['Department'] = '---'
        return jsonify(employees), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()