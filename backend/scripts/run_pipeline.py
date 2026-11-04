#!/usr/bin/env python
"""Convenient entry-point script to run the Bengaluru Startup Jobs Map Data Pipeline."""
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.pipeline.cli import main

if __name__ == "__main__":
    sys.exit(main())
