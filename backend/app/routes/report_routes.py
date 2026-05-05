from flask import Blueprint, jsonify, request, current_app
from decimal import Decimal

report_bp = Blueprint('report_bp', __name__)

# --- API lấy danh sách các tháng có dữ liệu lương ---
@report_bp.route('/api/payroll/months', methods=['GET'])
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
def get_payroll_details():
    month = request.args.get('month', 9, type=int)
    year = request.args.get('year', 2024, type=int)
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        sql = """
            SELECT s.SalaryID, ep.EmployeeID, ep.FullName, s.BaseSalary, s.Bonus, s.Deductions, s.NetSalary,
                   s.AllowanceResponsibility, s.AdvancePayment, s.OtherDeduction
            FROM salaries s
            JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
            WHERE MONTH(s.SalaryMonth) = %s AND YEAR(s.SalaryMonth) = %s
        """
        cursor.execute(sql, (month, year))
        records = cursor.fetchall()
        
        # Chuyển đổi các giá trị Decimal sang float để JSON serializable
        result = []
        for record in records:
            result.append({
                'SalaryID': record['SalaryID'],
                'EmployeeID': record['EmployeeID'],
                'FullName': record['FullName'],
                'BaseSalary': float(record['BaseSalary']) if record['BaseSalary'] else 0,
                'Bonus': float(record['Bonus']) if record['Bonus'] else 0,
                'Deductions': float(record['Deductions']) if record['Deductions'] else 0,
                'NetSalary': float(record['NetSalary']) if record['NetSalary'] else 0,
                'AllowanceResponsibility': float(record['AllowanceResponsibility']) if record['AllowanceResponsibility'] else 0,
                'AdvancePayment': float(record['AdvancePayment']) if record['AdvancePayment'] else 0,
                'OtherDeduction': float(record['OtherDeduction']) if record['OtherDeduction'] else 0
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()
        
@report_bp.route('/api/reports/payroll_list', methods=['GET'])
def get_payroll_list():
    month = request.args.get('month', 9, type=int)
    year = request.args.get('year', 2024, type=int)
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        sql = """
            SELECT s.SalaryID, ep.EmployeeID, ep.FullName, s.BaseSalary, s.Bonus, s.Deductions, s.NetSalary,
                   s.AllowanceResponsibility, s.AdvancePayment, s.OtherDeduction
            FROM salaries s
            JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
            WHERE MONTH(s.SalaryMonth) = %s AND YEAR(s.SalaryMonth) = %s
        """
        cursor.execute(sql, (month, year))
        records = cursor.fetchall()
        
        # Chuyển đổi các giá trị Decimal sang float để JSON serializable
        result = []
        for record in records:
            result.append({
                'SalaryID': record['SalaryID'],
                'EmployeeID': record['EmployeeID'],
                'FullName': record['FullName'],
                'BaseSalary': float(record['BaseSalary']) if record['BaseSalary'] else 0,
                'Bonus': float(record['Bonus']) if record['Bonus'] else 0,
                'Deductions': float(record['Deductions']) if record['Deductions'] else 0,
                'NetSalary': float(record['NetSalary']) if record['NetSalary'] else 0,
                'AllowanceResponsibility': float(record['AllowanceResponsibility']) if record['AllowanceResponsibility'] else 0,
                'AdvancePayment': float(record['AdvancePayment']) if record['AdvancePayment'] else 0,
                'OtherDeduction': float(record['OtherDeduction']) if record['OtherDeduction'] else 0
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): conn.close()


# ==================== API CẬP NHẬT LƯƠNG CHI TIẾT ====================
@report_bp.route('/api/reports/payroll/<int:salary_id>', methods=['PUT'])
def update_payroll(salary_id):
    """Cập nhật lương chi tiết cho nhân viên (chỉ Admin/Manager)"""
    try:
        data = request.get_json()
        
        # Lấy dữ liệu từ frontend - ép kiểu float
        base_salary = float(data.get('baseSalary', 0))
        bonus = float(data.get('bonus', 0))
        allowance = float(data.get('allowance', 0))      # Phụ cấp trách nhiệm
        advance = float(data.get('advance', 0))          # Tạm ứng
        other = float(data.get('other', 0))              # Khấu trừ khác
        
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        # Lấy Deductions hiện tại từ database
        cursor.execute("SELECT Deductions FROM salaries WHERE SalaryID = %s", (salary_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({"error": "Không tìm thấy bản ghi lương"}), 404
        
        # Chuyển đổi Decimal sang float
        deductions = float(result['Deductions']) if result['Deductions'] else 0
        
        # Tổng thu nhập (I) = Lương cơ bản + Thưởng + Phụ cấp
        income_total = base_salary + bonus + allowance
        
        # Tổng khấu trừ (II) = BHXH(8%) + BHYT(1.5%) + BHTN(1%) + Thuế TNCN(50% của Deductions) + Tạm ứng + Khác
        social_ins = base_salary * 0.08
        health_ins = base_salary * 0.015
        unemp_ins = base_salary * 0.01
        personal_tax = deductions * 0.5
        deduction_total = social_ins + health_ins + unemp_ins + personal_tax + advance + other
        
        # Thực nhận (III) = I - II
        net_salary = income_total - deduction_total
        
        # Cập nhật bảng salaries
        cursor.execute("""
            UPDATE salaries 
            SET BaseSalary = %s, 
                Bonus = %s, 
                NetSalary = %s,
                AllowanceResponsibility = %s,
                AdvancePayment = %s,
                OtherDeduction = %s
            WHERE SalaryID = %s
        """, (base_salary, bonus, net_salary, allowance, advance, other, salary_id))
        
        conn.commit()
        
        return jsonify({
            "message": "Cập nhật lương thành công",
            "data": {
                "SalaryID": salary_id,
                "BaseSalary": base_salary,
                "Bonus": bonus,
                "NetSalary": net_salary,
                "AllowanceResponsibility": allowance,
                "AdvancePayment": advance,
                "OtherDeduction": other
            }
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Cập nhật lương thất bại: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()


# --- API báo cáo Chấm công ---
@report_bp.route('/api/reports/attendance', methods=['GET'])
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
                "TotalWorkDays": float(row['TotalWorkDays']) if row['TotalWorkDays'] else 0,
                "TotalLeaveDays": float(row['TotalLeaveDays']) if row['TotalLeaveDays'] else 0,
                "TotalAbsentDays": float(row['TotalAbsentDays']) if row['TotalAbsentDays'] else 0
            })
            
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[ERROR] Lấy báo cáo chấm công thất bại: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()