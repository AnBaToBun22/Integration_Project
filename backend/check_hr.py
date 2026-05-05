import os
from dotenv import load_dotenv
import pyodbc

load_dotenv()
connstr = os.environ.get('HR_DB_CONNECTION_STRING', '').strip('"')
print('ConnStr:', connstr[:60])

conn = pyodbc.connect(connstr)
c = conn.cursor()

c.execute('SELECT COUNT(*) FROM Employees')
print('HR employees:', c.fetchone()[0])

c.execute("SELECT COUNT(*) FROM Employees WHERE Status = N'Đang làm việc'")
print('Active employees:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM Departments')
print('Departments:', c.fetchone()[0])

# Check table columns
c.execute("SELECT TOP 1 * FROM Employees")
cols = [col[0] for col in c.description]
print('Employee columns:', cols)

c.execute("SELECT DISTINCT Status FROM Employees")
print('Statuses:', [r[0] for r in c.fetchall()])

conn.close()
