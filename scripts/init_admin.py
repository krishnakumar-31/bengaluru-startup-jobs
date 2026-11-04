#!/usr/bin/env python
"""Root wrapper for backend/scripts/init_admin.py"""
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from scripts.init_admin import init_admin

if __name__ == "__main__":
    sys.exit(init_admin())
