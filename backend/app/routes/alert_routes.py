from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta
from ..auth_middleware import token_required, require_roles

alert_bp = Blueprint('alert_bp', __name__)


@alert_bp.route('/api/alerts', methods=['GET'])
@token_required
@require_roles(['Admin', 'HR Manager'])
def get_alerts():
    """
    API tổng hợp cảnh báo tự động:
    1. Kỷ niệm ngày vào làm (HireDate anniversary trong 7 ngày tới)
    2. Nhân viên nghỉ phép quá mức (LeaveDays > threshold)
    3. Sai lệch lương bất thường (chênh lệch > 20% so với tháng trước)
    """
    alerts = []
    today = datetime.now().date()

    # =============================================
    # 1. CẢNH BÁO KỶ NIỆM NGÀY VÀO LÀM
    # =============================================
    conn_hr = None
    try:
        conn_hr = current_app.get_hr_db()
        cursor = conn_hr.cursor()

        # Lấy nhân viên có ngày vào làm sắp đến kỷ niệm (trong 7 ngày tới)
        cursor.execute("""
            SELECT EmployeeID, FullName, HireDate
            FROM Employees 
            WHERE Status = N'Đang làm việc' OR Status = 'Active'
        """)

        for row in cursor.fetchall():
            emp_id, name, hire_date = row[0], row[1], row[2]
            if hire_date:
                # Tính ngày kỷ niệm năm nay
                try:
                    anniversary = hire_date.replace(year=today.year)
                except ValueError:
                    # Trường hợp 29/02 trong năm không nhuận
                    anniversary = hire_date.replace(year=today.year, day=28)

                days_until = (anniversary - today).days

                if 0 <= days_until <= 7:
                    years = today.year - hire_date.year
                    alerts.append({
                        'type': 'anniversary',
                        'severity': 'info',
                        'icon': '🎉',
                        'title': f'Kỷ niệm {years} năm làm việc',
                        'message': f'{name} sẽ kỷ niệm {years} năm vào ngày {anniversary.strftime("%d/%m/%Y")}',
                        'employee_id': emp_id,
                        'date': anniversary.strftime('%Y-%m-%d')
                    })
                elif days_until == 0:
                    years = today.year - hire_date.year
                    alerts.append({
                        'type': 'anniversary',
                        'severity': 'success',
                        'icon': '🎂',
                        'title': f'HÔM NAY: Kỷ niệm {years} năm!',
                        'message': f'{name} hôm nay kỷ niệm {years} năm làm việc tại công ty!',
                        'employee_id': emp_id,
                        'date': today.strftime('%Y-%m-%d')
                    })
    except Exception as e:
        print(f"[Alert] Lỗi kiểm tra kỷ niệm: {e}")
    finally:
        if conn_hr:
            conn_hr.close()

    # =============================================
    # 2. CẢNH BÁO NGHỈ PHÉP QUÁ MỨC
    # =============================================
    conn_payroll = None
    try:
        conn_payroll = current_app.get_payroll_db()
        cursor = conn_payroll.cursor()

        # Lấy nhân viên có tổng ngày nghỉ > 3 trong tháng gần nhất
        leave_threshold = int(request.args.get('leave_threshold', 3))

        cursor.execute("""
            SELECT a.EmployeeID, ep.FullName, a.LeaveDays, a.AbsentDays, a.AttendanceMonth
            FROM attendance a
            JOIN employees_payroll ep ON a.EmployeeID = ep.EmployeeID
            WHERE a.AttendanceMonth = (SELECT MAX(AttendanceMonth) FROM attendance)
              AND (a.LeaveDays > %s OR a.AbsentDays > %s)
            ORDER BY a.LeaveDays DESC
        """, (leave_threshold, leave_threshold))

        for row in cursor.fetchall():
            leave_days = row['LeaveDays']
            absent_days = row['AbsentDays']
            att_month = row['AttendanceMonth']

            if leave_days > leave_threshold:
                alerts.append({
                    'type': 'excessive_leave',
                    'severity': 'warning',
                    'icon': '⚠️',
                    'title': 'Nghỉ phép quá mức quy định',
                    'message': f"{row['FullName']} đã nghỉ {leave_days} ngày phép "
                               f"(vượt ngưỡng {leave_threshold} ngày) trong tháng {att_month.strftime('%m/%Y') if att_month else 'N/A'}",
                    'employee_id': row['EmployeeID'],
                    'value': leave_days
                })

            if absent_days > leave_threshold:
                alerts.append({
                    'type': 'excessive_absence',
                    'severity': 'danger',
                    'icon': '🚨',
                    'title': 'Vắng mặt quá nhiều',
                    'message': f"{row['FullName']} vắng mặt {absent_days} ngày "
                               f"trong tháng {att_month.strftime('%m/%Y') if att_month else 'N/A'}",
                    'employee_id': row['EmployeeID'],
                    'value': absent_days
                })

    except Exception as e:
        print(f"[Alert] Lỗi kiểm tra nghỉ phép: {e}")
    finally:
        if conn_payroll:
            conn_payroll.close()

    # =============================================
    # 3. CẢNH BÁO SAI LỆCH LƯƠNG BẤT THƯỜNG
    # =============================================
    conn_payroll2 = None
    try:
        conn_payroll2 = current_app.get_payroll_db()
        cursor = conn_payroll2.cursor()

        # So sánh lương tháng gần nhất với tháng trước đó
        cursor.execute("""
            SELECT s1.EmployeeID, ep.FullName, 
                   s1.NetSalary as CurrentSalary, 
                   s2.NetSalary as PreviousSalary,
                   s1.SalaryMonth as CurrentMonth,
                   s2.SalaryMonth as PreviousMonth
            FROM salaries s1
            JOIN salaries s2 ON s1.EmployeeID = s2.EmployeeID
            JOIN employees_payroll ep ON s1.EmployeeID = ep.EmployeeID
            WHERE s1.SalaryMonth = (SELECT MAX(SalaryMonth) FROM salaries)
              AND s2.SalaryMonth = (
                  SELECT MAX(SalaryMonth) FROM salaries 
                  WHERE SalaryMonth < (SELECT MAX(SalaryMonth) FROM salaries)
              )
              AND s1.NetSalary != s2.NetSalary
        """)

        for row in cursor.fetchall():
            current_salary = float(row['CurrentSalary'])
            previous_salary = float(row['PreviousSalary'])

            if previous_salary > 0:
                change_pct = ((current_salary - previous_salary) / previous_salary) * 100

                # Cảnh báo nếu chênh lệch > 20%
                if abs(change_pct) > 20:
                    direction = 'tăng' if change_pct > 0 else 'giảm'
                    alerts.append({
                        'type': 'salary_anomaly',
                        'severity': 'danger' if change_pct < -20 else 'warning',
                        'icon': '💰',
                        'title': f'Sai lệch lương bất thường ({direction} {abs(change_pct):.1f}%)',
                        'message': f"{row['FullName']}: Lương {direction} từ "
                                   f"{previous_salary:,.0f}₫ → {current_salary:,.0f}₫ "
                                   f"({change_pct:+.1f}%)",
                        'employee_id': row['EmployeeID'],
                        'value': change_pct
                    })

    except Exception as e:
        print(f"[Alert] Lỗi kiểm tra sai lệch lương: {e}")
    finally:
        if conn_payroll2:
            conn_payroll2.close()

    # Sắp xếp: danger > warning > info
    severity_order = {'danger': 0, 'warning': 1, 'info': 2, 'success': 3}
    alerts.sort(key=lambda x: severity_order.get(x.get('severity', 'info'), 99))

    return jsonify({
        'alerts': alerts,
        'total': len(alerts),
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 200
