# Python Virtual Environment Setup Guide (Windows)

This guide provides step-by-step instructions for configuring and running the **Bengaluru Startup Jobs Map** backend on Windows using Python 3.11+.

---

## 1. Prerequisites

- **Python 3.10+** (Python 3.11 recommended).
- Verify Python installation:
  ```powershell
  python --version
  ```

---

## 2. Create the Virtual Environment

From the project root or the `backend/` directory:

```powershell
# Navigate to the backend directory
cd backend

# Create a virtual environment named .venv
python -m venv .venv
```

---

## 3. Activate the Virtual Environment

### In Windows PowerShell:
If PowerShell blocks script execution (`UnauthorizedAccess`), set your execution policy for the current user or process:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then activate:
```powershell
.\.venv\Scripts\Activate.ps1
```

*(Optional bypass for a single session without altering global policies):*
```powershell
powershell -ExecutionPolicy Bypass -NoExit -Command ".\.venv\Scripts\Activate.ps1"
```

### In Windows Command Prompt (cmd.exe):
```cmd
.\.venv\Scripts\activate.bat
```

### In Git Bash:
```bash
source .venv/Scripts/activate
```

When activated, you will see `(.venv)` in your terminal prompt.

---

## 4. Install Dependencies

With the virtual environment active, upgrade pip and install the backend requirements:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 5. Configure Environment Variables

Copy the sample environment file:
```powershell
Copy-Item .env.example .env
```
*(No PostgreSQL installation is needed for initial development or health checks. Connection defaults are pre-configured.)*

---

## 6. Run the FastAPI Development Server

Start the application with Uvicorn:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Interactive API Documentation (Swagger UI)**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
- **Alternative Documentation (ReDoc)**: [http://127.0.0.1:8000/api/v1/redoc](http://127.0.0.1:8000/api/v1/redoc)
- **Health Check Endpoint**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

## 7. Run Automated Tests

Execute the test suite using `pytest`:

```powershell
pytest
```

---

## 8. Deactivate the Virtual Environment

When finished, run:
```powershell
deactivate
```
