import os
import sys
import tempfile
from pathlib import Path

_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db_file.close()

os.environ["DATABASE_URL"] = f"sqlite:///{_db_file.name}"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ENVIRONMENT"] = "test"

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
