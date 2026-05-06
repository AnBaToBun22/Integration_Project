import os
import pyodbc
from dotenv import load_dotenv

load_dotenv("backend/.env")
connstr = os.environ.get('HR_DB_CONNECTION_STRING', '').strip('"')
print(f"Connecting to: {connstr}")
conn = pyodbc.connect(connstr)
c = conn.cursor()

c.execute("""
    SELECT name, is_identity 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('Employees') AND name = 'EmployeeID'
""")
row = c.fetchone()
if row:
    print(f"Column: {row[0]}, Is Identity: {row[1]}")
else:
    print("EmployeeID column not found")

conn.close()
