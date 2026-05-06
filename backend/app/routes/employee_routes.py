from flask import Blueprint, jsonify, request, current_app

from ..auth_middleware import token_required, require_roles

from ..models import AuditLog

from .. import db

from ..utils.db_manager import DBManager



employee_bp = Blueprint('employee_bp', __name__)





# UC.5: Xem danh sÃ¡ch nhÃ¢n viÃªn (JOIN tÃªn phÃ²ng ban + chá»©c vá»¥)

@employee_bp.route('/api/employees', methods=['GET'])

@token_required

def get_employees(current_user_role, **kwargs): 

    try:

        with DBManager.hr_connection() as conn:

            cursor = conn.cursor()

            

            # JOIN Departments & Positions Äá» tráº£ vá» tÃªn thay vÃ¬ chá» mÃ£ ID

            query = """

                SELECT e.EmployeeID, e.FullName, e.Email, e.PhoneNumber, 

                       e.DateOfBirth, e.Gender, e.HireDate, 

                       e.DepartmentID, d.DepartmentName,

                       e.PositionID, p.PositionName,

                       e.Status

                FROM Employees e

                LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID

                LEFT JOIN Positions p ON e.PositionID = p.PositionID

            """

            cursor.execute(query)

            

            columns = [column[0] for column in cursor.description]

            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

            

            # Serialize date objects

            for row in results:

                for key in ['DateOfBirth', 'HireDate']:

                    if row.get(key) and hasattr(row[key], 'isoformat'):

                        row[key] = row[key].isoformat()

                

            return jsonify(results), 200

    except Exception as e:

        print("[ERROR] HR GET employees:", e)

        return jsonify({"error": str(e)}), 500





# UC.6: ThÃªm nhÃ¢n viÃªn má»i vÃ o cáº£ SQL Server VÃ@employee_bp.route('/api/employees', methods=['POST'])

@token_required

@require_roles(['Admin', 'HR Manager'])

def add_employee(current_user_role, **kwargs):

    current_username = kwargs.get('current_username', 'Unknown')

    data = request.json

    

    required_fields = ['FullName', 'Email', 'DepartmentID']

    if not all(field in data and data[field] for field in required_fields):

        return jsonify({"error": f"Thiáº¿u cÃ¡c trÆ°á»ng báº¯t buá»c: {', '.join(required_fields)}"}), 400

    

    try:

        with DBManager.dual_transaction() as (conn_hr, conn_payroll):

            cursor_hr = conn_hr.cursor()

            

            # 1. HR DB logic

            cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE Email = ?", (data.get('Email', ''),))

            if cursor_hr.fetchone()[0] > 0:

                return jsonify({"error": f"Email '{data.get('Email')}' ÄÃ£ tá»n táº¡i trong há» thá»ng!"}), 400

            

            sql_insert = """

                INSERT INTO Employees (

                    FullName, DateOfBirth, Gender, PhoneNumber, 

                    Email, HireDate, DepartmentID, PositionID, 

                    Status, CreatedAt

                ) 

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())

            """

            

            params = (

                data.get('FullName', ''),

                data.get('DateOfBirth'), 

                data.get('Gender'),

                data.get('PhoneNumber', ''),

                data.get('Email', ''),

                data.get('HireDate'), 

                data.get('DepartmentID'), 

                data.get('PositionID'),

                data.get('Status', 'Äang lÃ m viá»c')

            )

            

            cursor_hr.execute(sql_insert, params)

            

            # Láº¥y ID nhÃ¢n viÃªn vá»«a táº¡o - dÃ¹ng SCOPE_IDENTITY() an toÃ n hÆ¡n

            cursor_hr.execute("SELECT SCOPE_IDENTITY() as EmployeeID")

            employee_id = int(cursor_hr.fetchone()[0])



            # 2. Payroll DB logic

            cursor_payroll = conn_payroll.cursor()

            sql_sync = """

                INSERT INTO employees_payroll (EmployeeID, FullName, DepartmentID, PositionID, Status, SyncedAt)

                VALUES (%s, %s, %s, %s, %s, NOW())

            """

            cursor_payroll.execute(sql_sync, (

                employee_id,

                data.get('FullName', ''),

                data.get('DepartmentID'),

                data.get('PositionID'),

                data.get('Status', 'Äang lÃ m viá»c')

            ))

            

            # 3. Commit

            conn_hr.commit()

            conn_payroll.commit()

            

            # 4. AuditLog

            try:

                log = AuditLog(

                    username=current_username,

                    action="THÃM Má»I",

                    detail=f"ÄÃ£ thÃªm nhÃ¢n viÃªn: {data.get('FullName')} (ID: {employee_id}) + Äá»ng bá» Payroll"

                )

                db.session.add(log)

                db.session.commit()

            except Exception as log_err:

                print("Lá»i lÆ°u log:", log_err)

            

            return jsonify({

                "message": "ThÃªm nhÃ¢n viÃªn thÃ nh cÃ´ng vÃ  ÄÃ£ Äá»ng bá» sang Payroll!",

                "employee_id": employee_id,

                "full_name": data.get('FullName'),

                "synced": True

            }), 201

            

    except Exception as e:

        print(f"â Lá»i khi thÃªm nhÃ¢n viÃªn: {str(e)}")

        return jsonify({"error": f"Lá»i: {str(e)}"}), 500

        

    finally:

        if conn_hr:

            conn_hr.close()

        if conn_payroll:

            conn_payroll.close()





# UC.7: Cáº­p nháº­t thÃ´ng tin nhÃ¢n viÃªn + Äá»ng bá» Payroll

@employee_bp.route('/api/employees/<int:emp_id>', methods=['PUT'])

@token_required

@require_roles(['Admin', 'HR Manager'])

def update_employee(current_user_role, emp_id, **kwargs):

    current_username = kwargs.get('current_username', 'Unknown')

    data = request.json

    

    try:

        with DBManager.dual_transaction() as (conn_hr, conn_payroll):

            cursor_hr = conn_hr.cursor()

            

            # 1. Cáº­p nháº­t HR DB

            sql = """

                UPDATE Employees 

                SET FullName = ?, Email = ?, PhoneNumber = ?, 

                    DepartmentID = ?, PositionID = ?, Status = ?, UpdatedAt = GETDATE()

                WHERE EmployeeID = ?

            """

            cursor_hr.execute(sql, (

                data['FullName'], data['Email'], data.get('PhoneNumber'),

                data.get('DepartmentID'), data.get('PositionID'), 

                data.get('Status'), emp_id

            ))

            

            # 2. Äá»ng bá» sang Payroll DB (Upsert style)

            cursor_payroll = conn_payroll.cursor()

            cursor_payroll.execute("SELECT COUNT(*) as cnt FROM employees_payroll WHERE EmployeeID = %s", (emp_id,))

            exists = cursor_payroll.fetchone()['cnt'] > 0

            

            if exists:

                sql_sync = """

                    UPDATE employees_payroll 

                    SET FullName = %s, DepartmentID = %s, PositionID = %s, Status = %s, SyncedAt = NOW()

                    WHERE EmployeeID = %s

                """

                cursor_payroll.execute(sql_sync, (

                    data['FullName'], data.get('DepartmentID'),

                    data.get('PositionID'), data.get('Status'), emp_id

                ))

            else:

                sql_sync = """

                    INSERT INTO employees_payroll (EmployeeID, FullName, DepartmentID, PositionID, Status, SyncedAt)

                    VALUES (%s, %s, %s, %s, %s, NOW())

                """

                cursor_payroll.execute(sql_sync, (

                    emp_id, data['FullName'], data.get('DepartmentID'),

                    data.get('PositionID'), data.get('Status')

                ))

            

            # Commit Cáº¢ HAI

            conn_hr.commit()

            conn_payroll.commit()



            # AuditLog

            try:

                log = AuditLog(

                    username=current_username,

                    action="Cáº¬P NHáº¬T",

                    detail=f"Cáº­p nháº­t nhÃ¢n viÃªn mÃ£: {emp_id} ({data['FullName']}) + Äá»ng bá» Payroll"

                )

                db.session.add(log)

                db.session.commit()

            except Exception as log_err:

                print("Lá»i lÆ°u log:", log_err)



            return jsonify({"message": "Cáº­p nháº­t nhÃ¢n viÃªn thÃ nh cÃ´ng vÃ  ÄÃ£ Äá»ng bá»!"}), 200

    except Exception as e:

        return jsonify({"error": str(e)}), 500





# UC.8: XÃ³a nhÃ¢n viÃªn (chuyá»n tráº¡ng thÃ¡i) â Kiá»m tra Dividend & Salary trÆ°á»c

@employee_bp.route('/api/employees/<int:emp_id>', methods=['DELETE'])

@token_required

@require_roles(['Admin'])

def delete_employee(current_user_role, emp_id, **kwargs):

    current_username = kwargs.get('current_username', 'Unknown')

    conn_hr = None

    conn_payroll = None

    

    try:

        conn_hr = current_app.get_hr_db()

        cursor_hr = conn_hr.cursor()

        

        # Kiá»m tra nhÃ¢n viÃªn tá»n táº¡i

        cursor_hr.execute("SELECT FullName FROM Employees WHERE EmployeeID = ?", (emp_id,))

        emp_row = cursor_hr.fetchone()

        if not emp_row:

            return jsonify({"error": "NhÃ¢n viÃªn khÃ´ng tá»n táº¡i!"}), 404

        

        emp_name = emp_row[0]

        

        

        

        # ============================================

        # KIá»M TRA: CÃ³ dá»¯ liá»u Salary trong Payroll khÃ´ng?

        # ============================================

        salary_count = 0

        try:

            conn_payroll = current_app.get_payroll_db()

            cursor_payroll = conn_payroll.cursor()

            cursor_payroll.execute("SELECT COUNT(*) as cnt FROM salaries WHERE EmployeeID = %s", (emp_id,))

            salary_count = cursor_payroll.fetchone()['cnt']

        except Exception as payroll_err:

            print(f"[WARNING] KhÃ´ng thá» kiá»m tra Payroll: {payroll_err}")

        

        if salary_count > 0:
            return jsonify({
                "error": f"Không thể xóa nhân viên '{emp_name}'! "
                         f"Nhân viên này đã có {salary_count} bản ghi lương (Salaries). "
                         f"Hãy chuyển trạng thái thành 'Đã nghỉ việc' thay vì xóa."
            }), 400

        

        # Chuyá»n tráº¡ng thÃ¡i thÃ nh "ÄÃ£ nghá» viá»c"

        cursor_hr.execute(

            "UPDATE Employees SET Status = N'ÄÃ£ nghá» viá»c', UpdatedAt = GETDATE() WHERE EmployeeID = ?", 

            (emp_id,)

        )

        conn_hr.commit()

        

        # Äá»ng bá» tráº¡ng thÃ¡i sang Payroll

        if conn_payroll:

            try:

                cursor_payroll.execute(

                    "UPDATE employees_payroll SET Status = %s, SyncedAt = NOW() WHERE EmployeeID = %s",

                    ('ÄÃ£ nghá» viá»c', emp_id)

                )

                conn_payroll.commit()

            except Exception as sync_err:

                print(f"[WARNING] Sync status to Payroll failed: {sync_err}")



        # Ghi AuditLog

        try:

            log = AuditLog(

                username=current_username,

                action="XÃA (NGHá» VIá»C)",

                detail=f"ÄÃ£ cho nhÃ¢n viÃªn '{emp_name}' (mÃ£ {emp_id}) nghá» viá»c"

            )

            db.session.add(log)

            db.session.commit()

        except Exception as log_err:

            print("Lá»i lÆ°u log:", log_err)



        return jsonify({"message": f"ÄÃ£ chuyá»n tráº¡ng thÃ¡i nhÃ¢n viÃªn '{emp_name}' thÃ nh 'ÄÃ£ nghá» viá»c'!"}), 200

    except Exception as e:

        return jsonify({"error": str(e)}), 500

    finally:

        if conn_hr: conn_hr.close()

        if conn_payroll: conn_payroll.close()