import traceback
from app import create_app
app = create_app()
conn = app.get_hr_db()
cursor = conn.cursor()
sql = """INSERT INTO Employees (FullName, Email, DepartmentID, PositionID, Status, CreatedAt) 
         OUTPUT INSERTED.EmployeeID 
         VALUES ('test_abc', 'test_abc@test.com', 1, 1, 'Đang làm việc', GETDATE())"""
try:
    cursor.execute(sql)
    print("Inserted ID:", cursor.fetchone()[0])
    conn.rollback()
except Exception as e:
    print('ERROR:', e)
    traceback.print_exc()
