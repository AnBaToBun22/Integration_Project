from app import create_app
from app.utils.db_manager import DBManager

app = create_app()
with app.app_context():
    data = {
        'FullName': 'Test User',
        'Email': 'testuser@example.com',
        'DepartmentID': 1,
        'PositionID': 1,
        'Gender': 'Nam',
        'DateOfBirth': '1990-01-01',
        'PhoneNumber': '0123456789',
        'HireDate': '2023-01-01',
        'Status': 'Đang làm việc'
    }
    
    try:
        with DBManager.dual_transaction() as (conn_hr, conn_payroll):
            cursor_hr = conn_hr.cursor()
            
            # Check email
            cursor_hr.execute("SELECT COUNT(*) FROM Employees WHERE Email = ?", (data['Email'],))
            if cursor_hr.fetchone()[0] > 0:
                print("Email already exists")
            else:
                sql_insert = """
                    INSERT INTO Employees (
                        FullName, DateOfBirth, Gender, PhoneNumber, 
                        Email, HireDate, DepartmentID, PositionID, 
                        Status, CreatedAt
                    ) 
                    OUTPUT INSERTED.EmployeeID
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
                """
                params = (
                    data['FullName'], data['DateOfBirth'], data['Gender'],
                    data['PhoneNumber'], data['Email'], data['HireDate'],
                    data['DepartmentID'], data['PositionID'], data['Status']
                )
                cursor_hr.execute(sql_insert, params)
                
                row = cursor_hr.fetchone()
                print("INSERT row result:", row)
                if row:
                    employee_id = int(row[0])
                    print("Inserted EmployeeID:", employee_id)
                else:
                    print("Failed to get EmployeeID from OUTPUT")
                
                # Test payroll sync
                cursor_payroll = conn_payroll.cursor()
                sql_sync = """
                    INSERT INTO employees_payroll (EmployeeID, FullName, DepartmentID, PositionID, Status, SyncedAt)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """
                cursor_payroll.execute(sql_sync, (
                    employee_id, data['FullName'], data['DepartmentID'],
                    data['PositionID'], data['Status']
                ))
                print("Payroll synced")
                
            conn_hr.rollback() # Don't actually save
            conn_payroll.rollback()
            print("Rollback successful")
            
    except Exception as e:
        print("ERROR:", e)
        import traceback
        traceback.print_exc()
