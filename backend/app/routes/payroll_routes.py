# backend/app/routes/payroll_routes.py
from flask import Blueprint, jsonify, request, current_app
from datetime import datetime

payroll_bp = Blueprint('payroll_bp', __name__)

def format_money(amount):
    """Format số tiền thành dạng VND"""
    if amount is None:
        return 0
    return f"{amount:,.0f}"


@payroll_bp.route('/api/payroll/update-salary', methods=['POST'])
def update_salary_history():
    """
    Cập nhật lương cho nhân viên
    - Lưu vào bảng salary_history
    - Cập nhật bảng salaries cho tháng hiện tại và tương lai
    """
    try:
        data = request.get_json()
        employee_id = data.get('employee_id')
        new_salary = float(data.get('new_salary', 0))
        effective_date = data.get('effective_date')
        reason = data.get('reason', 'Cập nhật lương')
        created_by = data.get('created_by', 1)
        
        if not employee_id or not new_salary or not effective_date:
            return jsonify({"error": "Thiếu thông tin bắt buộc!"}), 400
        
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        # 1. Lấy lương hiện tại
        cursor.execute("""
            SELECT BaseSalary, FullName 
            FROM salaries s
            JOIN employees_payroll ep ON s.EmployeeID = ep.EmployeeID
            WHERE s.EmployeeID = %s 
            ORDER BY s.SalaryMonth DESC LIMIT 1
        """, (employee_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({"error": "Không tìm thấy nhân viên!"}), 404
        
        old_salary = float(result['BaseSalary']) if result['BaseSalary'] else 0
        employee_name = result['FullName']
        
        # 2. Kiểm tra bảng salary_history đã tồn tại chưa, nếu chưa thì tạo
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS salary_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                employee_id INT NOT NULL,
                employee_name VARCHAR(255),
                old_salary DECIMAL(15,2),
                new_salary DECIMAL(15,2) NOT NULL,
                effective_date DATE NOT NULL,
                reason VARCHAR(255),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Nếu bảng đã tồn tại nhưng thiếu cột `employee_name`, thêm cột này
        try:
            cursor.execute("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_history' AND COLUMN_NAME = 'employee_name'
            """)
            col = cursor.fetchone()
            if not col:
                cursor.execute("ALTER TABLE salary_history ADD COLUMN employee_name VARCHAR(255)")
        except Exception:
            # Nếu kiểm tra thông tin schema không khả thi trên DB này, tiếp tục và để INSERT xử lý lỗi nếu có
            pass
        
        # 3. Lưu vào bảng lịch sử
        cursor.execute("""
            INSERT INTO salary_history 
            (employee_id, employee_name, old_salary, new_salary, effective_date, reason, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (employee_id, employee_name, old_salary, new_salary, effective_date, reason, created_by))
        
        # 4. Lấy năm tháng hiệu lực (dùng ngày bắt đầu của tháng để so sánh ngày đầy đủ)
        effect_year = int(effective_date[:4])
        effect_month = int(effective_date[5:7])
        effect_start_date = f"{effect_year}-{effect_month:02d}-01"

        # 5. Cập nhật bảng salaries từ tháng hiệu lực trở đi (so sánh theo ngày đầy đủ)
        cursor.execute("""
            SELECT SalaryID, SalaryMonth, BaseSalary
            FROM salaries
            WHERE EmployeeID = %s
            AND SalaryMonth >= %s
            ORDER BY SalaryMonth
        """, (employee_id, effect_start_date))
        
        salary_records = cursor.fetchall()

        print(f"[DEBUG] Found {len(salary_records)} salary records to update for employee_id={employee_id} starting {effect_start_date}")
        updated_count = 0

        for record in salary_records:
            salary_id = record['SalaryID']
            salary_month = record['SalaryMonth']
            old_base = float(record['BaseSalary']) if record['BaseSalary'] else 0
            print(f"[DEBUG] Record SalaryID={salary_id}, SalaryMonth={salary_month}, old_base={old_base}")
            # Tính prorate nếu ngày hiệu lực nằm giữa tháng
            cursor.execute("""
                SELECT DAY(LAST_DAY(%s)) as days_in_month
            """, (salary_month,))
            days_in_month = cursor.fetchone()['days_in_month']
            
            salary_year = salary_month.year
            salary_month_num = salary_month.month
            
            if salary_year == effect_year and salary_month_num == effect_month:
                # Tháng hiệu lực: tính prorate
                effect_day = int(effective_date[8:10])
                days_before = effect_day - 1
                days_after = days_in_month - days_before + 1
                
                daily_rate_old = old_base / days_in_month
                daily_rate_new = new_salary / days_in_month
                
                prorated_salary = (daily_rate_old * days_before) + (daily_rate_new * days_after)
                new_base = prorated_salary
            else:
                # Tháng sau hiệu lực: áp dụng lương mới
                new_base = new_salary
            
            # Tính lại NetSalary
            net_salary = new_base - (new_base * 0.105)
            
            # Cập nhật
            cursor.execute("""
                UPDATE salaries 
                SET BaseSalary = %s, NetSalary = %s
                WHERE SalaryID = %s
            """, (new_base, net_salary, salary_id))
            updated_count += 1
            print(f"[DEBUG] Updated SalaryID={salary_id}: {old_base} -> {new_base} (Net: {net_salary})")
        
        conn.commit()
        print(f"[DEBUG] commit complete, total updated: {updated_count}")

        # Nếu không có bản ghi salaries nào được cập nhật (không tồn tại bản ghi cho tháng hiệu lực),
        # chèn một bản ghi mới cho tháng hiệu lực để UI có thể hiển thị thay đổi.
        if updated_count == 0:
            try:
                new_base = new_salary
                net_salary = new_base - (new_base * 0.105)
                cursor.execute("""
                    INSERT INTO salaries (EmployeeID, SalaryMonth, BaseSalary, Bonus, Deductions, NetSalary, AllowanceResponsibility, AdvancePayment, OtherDeduction)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (employee_id, effect_start_date, new_base, 0, 0, net_salary, 0, 0, 0))
                conn.commit()
                print(f"[DEBUG] Inserted new salary row for employee_id={employee_id} month={effect_start_date} base={new_base}")
            except Exception as ie:
                print(f"[DEBUG] Failed to insert salary row: {ie}")
        
        return jsonify({
            "success": True,
            "message": f"✅ Đã cập nhật lương cho {employee_name}\n📊 Từ {format_money(old_salary)} ₫ lên {format_money(new_salary)} ₫",
            "data": {
                "employee_id": employee_id,
                "employee_name": employee_name,
                "old_salary": old_salary,
                "new_salary": new_salary,
                "effective_date": effective_date,
                "reason": reason
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


@payroll_bp.route('/api/payroll/salary-history/<int:employee_id>', methods=['GET'])
def get_salary_history(employee_id):
    """Lấy lịch sử thay đổi lương của nhân viên"""
    try:
        conn = current_app.get_payroll_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, old_salary, new_salary, effective_date, reason, created_at
            FROM salary_history 
            WHERE employee_id = %s 
            ORDER BY effective_date DESC
        """, (employee_id,))
        
        records = cursor.fetchall()
        
        history = []
        for r in records:
            history.append({
                'id': r['id'],
                'old_salary': float(r['old_salary']) if r['old_salary'] else 0,
                'new_salary': float(r['new_salary']),
                'effective_date': r['effective_date'].strftime('%Y-%m-%d'),
                'reason': r['reason'],
                'created_at': r['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return jsonify({
            "success": True,
            "history": history
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()