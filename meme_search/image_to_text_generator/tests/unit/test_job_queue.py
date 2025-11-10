import pytest
import sqlite3
import os
import tempfile
import sys
from pathlib import Path

# Add app directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

from job_queue import init_db, check_queue


class TestJobQueue:
    """Test suite for job queue database operations"""

    @pytest.fixture
    def temp_db(self):
        """Create a temporary database for testing"""
        fd, path = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        yield path
        # Cleanup
        if os.path.exists(path):
            os.unlink(path)

    def test_init_db_creates_database(self, temp_db):
        """Test that init_db creates a database file"""
        # Execute
        init_db(temp_db)

        # Assert
        assert os.path.exists(temp_db)

    def test_init_db_creates_jobs_table(self, temp_db):
        """Test that init_db creates the jobs table with correct schema"""
        # Execute
        init_db(temp_db)

        # Assert - check table exists and has correct columns
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()

        # Check table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'")
        result = cursor.fetchone()
        assert result is not None
        assert result[0] == 'jobs'

        # Check columns
        cursor.execute("PRAGMA table_info(jobs)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        assert 'id' in column_names
        assert 'image_core_id' in column_names
        assert 'image_path' in column_names
        assert 'model' in column_names

        conn.close()

    def test_init_db_id_is_primary_key_autoincrement(self, temp_db):
        """Test that id column is primary key with autoincrement"""
        # Execute
        init_db(temp_db)

        # Assert
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()

        cursor.execute("PRAGMA table_info(jobs)")
        columns = cursor.fetchall()

        # Find id column
        id_column = next(col for col in columns if col[1] == 'id')
        # Column info: (cid, name, type, notnull, dflt_value, pk)
        assert id_column[5] == 1  # pk = 1 means primary key

        conn.close()

    def test_init_db_idempotent(self, temp_db):
        """Test that init_db can be called multiple times safely"""
        # Execute multiple times
        init_db(temp_db)
        init_db(temp_db)
        init_db(temp_db)

        # Assert - should not raise errors and table should exist
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'")
        result = cursor.fetchone()
        assert result is not None
        conn.close()

    def test_check_queue_empty_database(self, temp_db):
        """Test check_queue returns 0 for empty database"""
        # Setup
        init_db(temp_db)

        # Execute
        result = check_queue(temp_db)

        # Assert
        assert result == {"queue_length": 0}

    def test_check_queue_with_jobs(self, temp_db):
        """Test check_queue returns correct count with jobs"""
        # Setup
        init_db(temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()

        # Insert test jobs
        cursor.execute("INSERT INTO jobs (image_core_id, image_path, model) VALUES (1, 'path1.jpg', 'Florence-2-base')")
        cursor.execute("INSERT INTO jobs (image_core_id, image_path, model) VALUES (2, 'path2.jpg', 'Moondream2')")
        cursor.execute("INSERT INTO jobs (image_core_id, image_path, model) VALUES (3, 'path3.jpg', 'Florence-2-base')")

        conn.commit()
        conn.close()

        # Execute
        result = check_queue(temp_db)

        # Assert
        assert result == {"queue_length": 3}

    def test_check_queue_with_single_job(self, temp_db):
        """Test check_queue with exactly one job"""
        # Setup
        init_db(temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO jobs (image_core_id, image_path, model) VALUES (1, 'test.jpg', 'test-model')")
        conn.commit()
        conn.close()

        # Execute
        result = check_queue(temp_db)

        # Assert
        assert result == {"queue_length": 1}

    def test_check_queue_with_many_jobs(self, temp_db):
        """Test check_queue with many jobs"""
        # Setup
        init_db(temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()

        # Insert 100 jobs
        for i in range(100):
            cursor.execute(
                "INSERT INTO jobs (image_core_id, image_path, model) VALUES (?, ?, ?)",
                (i, f'path{i}.jpg', 'test-model')
            )

        conn.commit()
        conn.close()

        # Execute
        result = check_queue(temp_db)

        # Assert
        assert result == {"queue_length": 100}

    def test_jobs_table_accepts_required_fields(self, temp_db):
        """Test that jobs table accepts all required fields"""
        # Setup
        init_db(temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()

        # Execute - insert with all fields
        cursor.execute(
            "INSERT INTO jobs (image_core_id, image_path, model) VALUES (?, ?, ?)",
            (42, 'test/path/to/image.jpg', 'Florence-2-large')
        )
        conn.commit()

        # Assert - verify insertion
        cursor.execute("SELECT * FROM jobs WHERE image_core_id = 42")
        result = cursor.fetchone()

        assert result is not None
        assert result[1] == 42  # image_core_id
        assert result[2] == 'test/path/to/image.jpg'  # image_path
        assert result[3] == 'Florence-2-large'  # model

        conn.close()

    def test_jobs_table_not_null_constraints(self, temp_db):
        """Test that NOT NULL constraints are enforced"""
        # Setup
        init_db(temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()

        # Execute & Assert - image_path NOT NULL
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                "INSERT INTO jobs (image_core_id, image_path, model) VALUES (?, ?, ?)",
                (1, None, 'test-model')
            )

        # Execute & Assert - model NOT NULL
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                "INSERT INTO jobs (image_core_id, image_path, model) VALUES (?, ?, ?)",
                (1, 'test.jpg', None)
            )

        conn.close()

    def test_check_queue_returns_dict_structure(self, temp_db):
        """Test that check_queue returns the correct dictionary structure"""
        # Setup
        init_db(temp_db)

        # Execute
        result = check_queue(temp_db)

        # Assert
        assert isinstance(result, dict)
        assert 'queue_length' in result
        assert isinstance(result['queue_length'], int)

    def test_init_db_closes_connection(self, temp_db):
        """Test that init_db properly closes database connection"""
        # Execute
        init_db(temp_db)

        # Assert - should be able to open connection again without issues
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM jobs")
        result = cursor.fetchone()
        assert result[0] == 0
        conn.close()
