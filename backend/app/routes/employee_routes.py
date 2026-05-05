from flask import Blueprint, jsonify, request, current_app
from ..auth_middleware import token_required, require_roles

employee_bp = Blueprint('employee_bp', __name__)

# UC.5: Xem danh sách nhân viên
@employee_bp.route('/api/employees', methods=['GET'])
#@token_required
def get_employees(): 
    try:
        conn = current_app.get_hr_db() 
        cursor = conn.cursor()
        
        query = "SELECT EmployeeID, FullName, Email, PhoneNumber, DateOfBirth, Gender, HireDate, DepartmentID, PositionID, Status FROM Employees"
        cursor.execute(query)
        
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
        return jsonify(results), 200
    except Exception as e:
        print("ERROR AT HR:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals(): 
            conn.close()

# UC.6: Add new employee to both SQL Server and MySQL
@employee_bp.route('/api/employees', methods=['POST'])
#@token_required
#@require_roles(['Admin', 'HR Manager'])
def add_employee():
    data = request.json
    
    required_fields = ['FullName', 'Email', 'DepartmentID']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": f"Missing required fields: {', '.join(required_fields)}"}), 400
    
    conn_sql_server = None
    conn_mysql = None
    
    try:
        # Step 1: Save to SQL Server (HUMANnew)
        conn_sql_server = current_app.get_hr_db()
        cursor_sql = conn_sql_server.cursor()
        
        check_email = "SELECT COUNT(*) FROM Employees WHERE Email = ?"
        cursor_sql.execute(check_email, (data.get('Email', ''),))
        email_exists = cursor_sql.fetchone()[0]
        
        if email_exists > 0:
            return jsonify({"error": f"Email '{data.get('Email')}' already exists!"}), 400
        
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
            data.get('Status', 'Dang lam viec')
        )
        
        cursor_sql.execute(sql_insert, params)
        conn_sql_server.commit()
        
        cursor_sql.execute("SELECT @@IDENTITY as EmployeeID")
        employee_id = cursor_sql.fetchone()[0]
        print(f"OK SQL Server (HUMANnew) - Employee ID: {employee_id}")
        
        # Step 2: Save to MySQL (payroll_2026)
        conn_mysql = current_app.get_payroll_db()
        cursor_mysql = conn_mysql.cursor()
        
        check_query = "SELECT EmployeeID FROM employees_payroll WHERE EmployeeID = %s"
        cursor_mysql.execute(check_query, (int(employee_id),))
        existing_employee = cursor_mysql.fetchone()
        
        if not existing_employee:
            mysql_insert = """
                INSERT INTO employees_payroll (
                    EmployeeID, FullName, DepartmentID, PositionID, Status
                ) 
                VALUES (%s, %s, %s, %s, %s)
            """
            
            mysql_params = (
                int(employee_id),
                data.get('FullName', ''),
                data.get('DepartmentID', ''),
                data.get('PositionID', ''),
                data.get('Status', 'Dang lam viec')
            )
            
            cursor_mysql.execute(mysql_insert, mysql_params)
            conn_mysql.commit()
            print(f"OK MySQL (payroll_2026) - Employee ID: {employee_id}")
        else:
            print(f"SKIP: Employee ID {employee_id} already exists in MySQL")
        
        return jsonify({
            "message": "Employee added successfully to both HUMANnew and payroll_2026",
            "employee_id": int(employee_id),
            "full_name": data.get('FullName')
        }), 201
        
    except Exception as e:
        if conn_sql_server:
            conn_sql_server.rollback()
        if conn_mysql:
            conn_mysql.rollback()
        
        print(f"ERROR adding employee: {str(e)}")
        return jsonify({"error": f"Error: {str(e)}"}), 500
        
    finally:
        if conn_sql_server:
            conn_sql_server.close()
        if conn_mysql:
            conn_mysql.close()


# UC.7: Update employee info
@employee_bp.route('/api/employees/<int:emp_id>', methods=['PUT'])
#@token_required
#@require_roles(['Admin', 'HR Manager'])
def update_employee(emp_id):
    data = request.json
    conn_sql = None
    conn_mysql = None
    
    try:
        # Step 1: Update SQL Server (HUMANnew)
        conn_sql = current_app.get_hr_db()
        cursor_sql = conn_sql.cursor()
        
        sql = """
            UPDATE Employees 
            SET FullName = ?, Email = ?, PhoneNumber = ?, 
                DepartmentID = ?, PositionID = ?, Status = ?, UpdatedAt = GETDATE()
            WHERE EmployeeID = ?
        """
        cursor_sql.execute(sql, (
            data.get('FullName', ''), 
            data.get('Email', ''), 
            data.get('PhoneNumber'),
            data.get('DepartmentID'), 
            data.get('PositionID'), 
            data.get('Status'), 
            emp_id
        ))
        conn_sql.commit()
        print(f"OK SQL Server (HUMANnew) - Employee ID: {emp_id}")
        
        # Step 2: Update MySQL (payroll_2026)
        conn_mysql = current_app.get_payroll_db()
        cursor_mysql = conn_mysql.cursor()
        
        mysql_update = """
            UPDATE employees_payroll 
            SET FullName = %s, DepartmentID = %s, 
                PositionID = %s, Status = %s
            WHERE EmployeeID = %s
        """
        cursor_mysql.execute(mysql_update, (
            data.get('FullName', ''),
            data.get('DepartmentID', ''),
            data.get('PositionID', ''),
            data.get('Status', 'Dang lam viec'),
            emp_id
        ))
        conn_mysql.commit()
        print(f"OK MySQL (payroll_2026) - Employee ID: {emp_id}")
        
        return jsonify({"message": "Employee updated in both HUMANnew and payroll_2026"}), 200
    except Exception as e:
        if conn_sql:
            conn_sql.rollback()
        if conn_mysql:
            conn_mysql.rollback()
        print(f"ERROR updating employee: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn_sql:
            conn_sql.close()
        if conn_mysql:
            conn_mysql.close()


# UC.8: Delete employee from both SQL Server and MySQL
@employee_bp.route('/api/employees/<int:emp_id>', methods=['DELETE'])
#@token_required
#@require_roles(['Admin'])
def delete_employee(emp_id):
    conn_sql = None
    conn_mysql = None
    
    try:
        # Step 1: Delete from SQL Server (HUMANnew)
        conn_sql = current_app.get_hr_db()
        cursor_sql = conn_sql.cursor()
        
        cursor_sql.execute("SELECT COUNT(*) FROM Employees WHERE EmployeeID = ?", (emp_id,))
        if cursor_sql.fetchone()[0] == 0:
            return jsonify({"error": "Employee not found!"}), 404
        
        cursor_sql.execute("DELETE FROM Employees WHERE EmployeeID = ?", (emp_id,))
        conn_sql.commit()
        print(f"OK SQL Server (HUMANnew) - Employee ID: {emp_id} deleted")
        
        # Step 2: Delete from MySQL (payroll_2026)
        conn_mysql = current_app.get_payroll_db()
        cursor_mysql = conn_mysql.cursor()
        
        mysql_delete = "DELETE FROM employees_payroll WHERE EmployeeID = %s"
        cursor_mysql.execute(mysql_delete, (emp_id,))
        conn_mysql.commit()
        print(f"OK MySQL (payroll_2026) - Employee ID: {emp_id} deleted")
        
        return jsonify({"message": "Xóa thành công"}), 200
    except Exception as e:
        if conn_sql:
            conn_sql.rollback()
        if conn_mysql:
            conn_mysql.rollback()
        print(f"ERROR deleting employee: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn_sql:
            conn_sql.close()
        if conn_mysql:
            conn_mysql.close()
