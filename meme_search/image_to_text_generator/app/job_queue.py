import sqlite3


# initialize local db / table
def init_db(JOB_DB):
    conn = sqlite3.connect(JOB_DB)
    cursor = conn.cursor()

    # create table for job queue
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_core_id INTEGER,
            image_path TEXT NOT NULL,
            model TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


# check queue length
def check_queue(JOB_DB):
    conn = sqlite3.connect(JOB_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM jobs")
    count = cursor.fetchone()[0]
    return {"queue_length": count}
