from app import create_app
app = create_app()
conn = app.get_hr_db()
cursor = conn.cursor()
cursor.execute("SELECT name FROM sys.triggers WHERE parent_id = OBJECT_ID('Employees')")
print("Triggers:", cursor.fetchall())
