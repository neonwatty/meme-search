import sqlite3


# initialize local db / table
def init_db(JOB_DB):
    conn = sqlite3.connect(JOB_DB)
    cursor = conn.cursor()

    # create table for job queue with retry_count for failure handling
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_core_id INTEGER,
            image_path TEXT NOT NULL,
            model TEXT NOT NULL,
            retry_count INTEGER DEFAULT 0
        )
    """)

    # Migration: add retry_count column if it doesn't exist (for existing databases)
    try:
        cursor.execute("ALTER TABLE jobs ADD COLUMN retry_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        # Column already exists, ignore
        pass

    conn.commit()
    conn.close()


# check queue length
def check_queue(JOB_DB):
    conn = sqlite3.connect(JOB_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM jobs")
    count = cursor.fetchone()[0]
    return {"queue_length": count}
