from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    File,
    Form,
    status,
)
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_current_admin
from app.db.session import get_db
from app.models.admin_user import AdminUser
from app.services.admin_service import AdminService
from app.schemas.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminProfileResponse,
    AdminPasswordChangeRequest,
    AdminStatsOverview,
    AdminChartsResponse,
    AdminCompanyCreate,
    AdminCompanyUpdate,
    AdminOfficeCreate,
    AdminOfficeUpdate,
    AdminJobCreate,
    AdminJobUpdate,
    AdminJobStatusUpdate,
    ImportPreviewResponse,
    ImportConfirmResponse,
    AdminVerificationResponse,
)
from app.schemas.company import CompanyResponse, PaginatedCompaniesResponse, CompanyDetailResponse
from app.schemas.office import OfficeResponse
from app.schemas.job import JobResponse, PaginatedJobsResponse
from app.schemas.candidate_verification import (
    CandidateCompanyItem,
    CandidateVerificationUpdate,
    CandidateVerificationSummary,
    PaginatedCandidatesResponse,
)
from app.services.candidate_verification_service import CandidateVerificationService

admin_router = APIRouter()


# ==============================================================================
# 1. Admin Authentication Endpoints
# ==============================================================================

@admin_router.post("/auth/login", response_model=AdminLoginResponse, summary="Super Admin Login")
def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AdminLoginResponse:
    """Authenticates the single super admin and issues an HttpOnly session cookie + CSRF token."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    service = AdminService(db)
    token, csrf_token, admin = service.authenticate_admin(
        username=payload.username.strip(),
        plain_password=payload.password,
        client_ip=client_ip,
    )

    # Set secure HttpOnly session cookie
    response.set_cookie(
        key=settings.ADMIN_COOKIE_NAME,
        value=token,
        max_age=settings.ADMIN_JWT_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.ADMIN_COOKIE_SECURE,
        samesite=settings.ADMIN_COOKIE_SAMESITE,
        path="/",
    )

    # Set accessible CSRF cookie for client-side headers
    response.set_cookie(
        key=settings.ADMIN_CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=settings.ADMIN_JWT_EXPIRE_MINUTES * 60,
        httponly=False,  # Client can read this to send X-CSRF-Token header
        secure=settings.ADMIN_COOKIE_SECURE,
        samesite=settings.ADMIN_COOKIE_SAMESITE,
        path="/",
    )

    return AdminLoginResponse(
        username=admin.username,
        csrf_token=csrf_token,
        token_type="bearer",
        message="Super administrator login successful.",
    )


@admin_router.post("/auth/logout", summary="Super Admin Logout")
def admin_logout(
    response: Response,
    current_admin: AdminUser = Depends(get_current_admin),
):
    """Logs out administrator and clears session cookies."""
    response.delete_cookie(
        key=settings.ADMIN_COOKIE_NAME,
        path="/",
        samesite=settings.ADMIN_COOKIE_SAMESITE,
        secure=settings.ADMIN_COOKIE_SECURE,
    )
    response.delete_cookie(
        key=settings.ADMIN_CSRF_COOKIE_NAME,
        path="/",
        samesite=settings.ADMIN_COOKIE_SAMESITE,
        secure=settings.ADMIN_COOKIE_SECURE,
    )
    return {"message": "Logged out successfully."}


@admin_router.get("/auth/me", response_model=AdminProfileResponse, summary="Get Current Admin Profile")
def get_admin_profile(
    current_admin: AdminUser = Depends(get_current_admin),
) -> AdminProfileResponse:
    """Returns the authenticated administrator's profile."""
    return AdminProfileResponse.model_validate(current_admin)


@admin_router.put("/auth/password", summary="Change Super Admin Password")
def change_admin_password(
    payload: AdminPasswordChangeRequest,
    response: Response,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Changes administrator password and immediately invalidates all prior sessions."""
    service = AdminService(db)
    updated_admin = service.change_password(
        admin_user=current_admin,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )

    # Issue fresh session with new token_version
    from app.core.security import create_access_token, generate_csrf_token
    new_csrf = generate_csrf_token()
    new_token = create_access_token(
        subject=updated_admin.username,
        token_version=updated_admin.token_version,
        csrf_token=new_csrf,
    )

    response.set_cookie(
        key=settings.ADMIN_COOKIE_NAME,
        value=new_token,
        max_age=settings.ADMIN_JWT_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.ADMIN_COOKIE_SECURE,
        samesite=settings.ADMIN_COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        key=settings.ADMIN_CSRF_COOKIE_NAME,
        value=new_csrf,
        max_age=settings.ADMIN_JWT_EXPIRE_MINUTES * 60,
        httponly=False,
        secure=settings.ADMIN_COOKIE_SECURE,
        samesite=settings.ADMIN_COOKIE_SAMESITE,
        path="/",
    )

    return {
        "message": "Password changed successfully. All other sessions have been revoked.",
        "csrf_token": new_csrf,
    }


# ==============================================================================
# 2. Overview & Live Statistics Endpoints
# ==============================================================================

@admin_router.get("/stats", response_model=AdminStatsOverview, summary="Get Live Overview Statistics")
def get_stats_overview(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminStatsOverview:
    service = AdminService(db)
    return service.get_stats_overview()


@admin_router.get("/stats/charts", response_model=AdminChartsResponse, summary="Get Analytics Distribution Charts")
def get_charts(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminChartsResponse:
    service = AdminService(db)
    return service.get_charts_data()


# ==============================================================================
# 3. Company Management Endpoints
# ==============================================================================

@admin_router.get("/companies", response_model=PaginatedCompaniesResponse, summary="List Companies for Admin")
def list_companies(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    industry: Optional[str] = Query(default=None),
    is_verified: Optional[bool] = Query(default=None),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PaginatedCompaniesResponse:
    service = AdminService(db)
    items, total = service.list_companies(
        page=page, limit=limit, search=search, industry=industry, is_verified=is_verified
    )
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedCompaniesResponse(
        items=[CompanyResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@admin_router.post("/companies", response_model=CompanyResponse, summary="Create Company")
def create_company(
    payload: AdminCompanyCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CompanyResponse:
    service = AdminService(db)
    comp = service.create_company(payload)
    return CompanyResponse.model_validate(comp)


@admin_router.get("/companies/{company_id}", response_model=CompanyDetailResponse, summary="Get Company by ID")
def get_company(
    company_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CompanyDetailResponse:
    service = AdminService(db)
    comp = service.get_company(company_id)
    return CompanyDetailResponse.model_validate(comp)


@admin_router.put("/companies/{company_id}", response_model=CompanyResponse, summary="Update Company")
def update_company(
    company_id: int,
    payload: AdminCompanyUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CompanyResponse:
    service = AdminService(db)
    comp = service.update_company(company_id, payload)
    return CompanyResponse.model_validate(comp)


@admin_router.delete("/companies/{company_id}", summary="Delete Company (Protected)")
def delete_company(
    company_id: int,
    force: bool = Query(default=False, description="Explicit confirmation required if offices or jobs exist"),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    service.delete_company(company_id, force=force)
    return {"message": f"Company ID {company_id} deleted successfully."}


@admin_router.patch("/companies/{company_id}/verify", response_model=CompanyResponse, summary="Toggle Verification")
def toggle_company_verification(
    company_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CompanyResponse:
    service = AdminService(db)
    comp = service.toggle_company_verification(company_id)
    return CompanyResponse.model_validate(comp)


# ==============================================================================
# 4. Office Management Endpoints
# ==============================================================================

@admin_router.get("/offices", summary="List Offices")
def list_offices(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    company_id: Optional[int] = Query(default=None),
    locality: Optional[str] = Query(default=None),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    items, total = service.list_offices(page=page, limit=limit, company_id=company_id, locality=locality)
    return {
        "items": [
            {
                "id": o.id,
                "company_id": o.company_id,
                "company_name": o.company.name if o.company else None,
                "name": o.name,
                "address": o.address,
                "locality": o.locality,
                "city": o.city,
                "state": o.state,
                "postal_code": o.postal_code,
                "latitude": o.latitude,
                "longitude": o.longitude,
                "is_headquarters": o.is_headquarters,
                "created_at": o.created_at,
                "updated_at": o.updated_at,
            }
            for o in items
        ],
        "total": total,
    }


@admin_router.post("/offices", response_model=OfficeResponse, summary="Create Office")
def create_office(
    payload: AdminOfficeCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> OfficeResponse:
    service = AdminService(db)
    office = service.create_office(payload)
    return OfficeResponse.model_validate(office)


@admin_router.get("/offices/{office_id}", response_model=OfficeResponse, summary="Get Office by ID")
def get_office(
    office_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> OfficeResponse:
    service = AdminService(db)
    office = service.get_office(office_id)
    return OfficeResponse.model_validate(office)


@admin_router.put("/offices/{office_id}", response_model=OfficeResponse, summary="Update Office")
def update_office(
    office_id: int,
    payload: AdminOfficeUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> OfficeResponse:
    service = AdminService(db)
    office = service.update_office(office_id, payload)
    return OfficeResponse.model_validate(office)


@admin_router.delete("/offices/{office_id}", summary="Delete Office (Protected)")
def delete_office(
    office_id: int,
    force: bool = Query(default=False),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    service.delete_office(office_id, force=force)
    return {"message": f"Office ID {office_id} deleted successfully."}


# ==============================================================================
# 5. Job Management Endpoints
# ==============================================================================

@admin_router.get("/jobs", response_model=PaginatedJobsResponse, summary="List Jobs for Admin")
def list_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    company_id: Optional[int] = Query(default=None),
    locality: Optional[str] = Query(default=None),
    employment_type: Optional[str] = Query(default=None),
    work_mode: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PaginatedJobsResponse:
    service = AdminService(db)
    items, total = service.list_jobs(
        page=page,
        limit=limit,
        search=search,
        company_id=company_id,
        locality=locality,
        employment_type=employment_type,
        work_mode=work_mode,
        status_filter=status_filter,
    )
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedJobsResponse(
        items=[JobResponse.model_validate(j) for j in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@admin_router.post("/jobs", response_model=JobResponse, summary="Create Job")
def create_job(
    payload: AdminJobCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> JobResponse:
    service = AdminService(db)
    job = service.create_job(payload)
    return JobResponse.model_validate(job)


@admin_router.get("/jobs/{job_id}", response_model=JobResponse, summary="Get Job by ID")
def get_job(
    job_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> JobResponse:
    service = AdminService(db)
    job = service.get_job(job_id)
    return JobResponse.model_validate(job)


@admin_router.put("/jobs/{job_id}", response_model=JobResponse, summary="Update Job")
def update_job(
    job_id: int,
    payload: AdminJobUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> JobResponse:
    service = AdminService(db)
    job = service.update_job(job_id, payload)
    return JobResponse.model_validate(job)


@admin_router.patch("/jobs/{job_id}/status", response_model=JobResponse, summary="Change Job Status")
def set_job_status(
    job_id: int,
    payload: AdminJobStatusUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> JobResponse:
    service = AdminService(db)
    job = service.set_job_status(job_id, payload.status)
    return JobResponse.model_validate(job)


@admin_router.delete("/jobs/{job_id}", summary="Delete Job")
def delete_job(
    job_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    service.delete_job(job_id)
    return {"message": f"Job ID {job_id} deleted successfully."}


# ==============================================================================
# 6. Import & Verification Hub Endpoints
# ==============================================================================

@admin_router.get("/imports/template", summary="Download Unified CSV Import Template")
def download_import_template(
    current_admin: AdminUser = Depends(get_current_admin),
) -> Response:
    """Returns the standardized CSV template with headers and example records."""
    from app.services.unified_import_service import UnifiedImportService
    csv_data = UnifiedImportService.get_template_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="startup_jobs_import_template.csv"'
        },
    )


@admin_router.post("/imports/preview", response_model=ImportPreviewResponse, summary="Upload & Preview Import")
async def preview_import(
    file: UploadFile = File(...),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ImportPreviewResponse:
    filename = file.filename or ""
    content_bytes = await file.read()

    # Support UTF-8 with BOM (utf-8-sig), standard UTF-8, and latin-1 fallback
    try:
        content_str = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            content_str = content_bytes.decode("utf-8", errors="replace")
        except Exception:
            content_str = content_bytes.decode("latin-1", errors="replace")

    file_type = (
        "json"
        if filename.lower().endswith(".json")
        else "csv"
        if (filename.lower().endswith(".csv") or filename.lower().endswith(".tsv"))
        else ""
    )
    if not file_type:
        raise HTTPException(status_code=400, detail="Only .csv, .tsv and .json files are supported.")

    service = AdminService(db)
    return service.preview_import_file(content_str, file_type)


@admin_router.post("/imports/confirm", response_model=ImportConfirmResponse, summary="Confirm & Ingest Import")
async def confirm_import(
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ImportConfirmResponse:
    content_type = request.headers.get("content-type", "")
    raw_json = None
    if "application/json" in content_type:
        body = await request.json()
        raw_json = body.get("raw_accepted_json") or body.get("raw_json_records")
    else:
        form = await request.form()
        raw_json = form.get("raw_accepted_json") or form.get("raw_json_records")

    if not raw_json:
        raise HTTPException(status_code=400, detail="Missing accepted records payload")

    service = AdminService(db)
    return service.confirm_import(str(raw_json))


@admin_router.get("/verification", response_model=AdminVerificationResponse, summary="Verification Hub")
def get_verification_hub(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminVerificationResponse:
    service = AdminService(db)
    return service.get_verification_hub()


# ==============================================================================
# 7. MCA Candidate Verification Workflow Endpoints (Isolated from Production)
# ==============================================================================

@admin_router.get(
    "/candidates",
    response_model=PaginatedCandidatesResponse,
    summary="List MCA Candidate Companies with Verification State",
)
def list_candidate_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by verification status ('Needs Review', 'Verified', 'Rejected')"),
    classification: Optional[str] = Query(None, description="Filter by classification ('startup', 'established_company', 'uncertain_for_review')"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    locality: Optional[str] = Query(None, description="Filter by locality"),
    search: Optional[str] = Query(None, description="Search company name, CIN, or address"),
    exclude_rejected: bool = Query(False, description="Exclude rejected candidates from active list"),
    current_admin: AdminUser = Depends(get_current_admin),
) -> PaginatedCandidatesResponse:
    """Lists MCA candidate companies with pagination, filtering, and summary statistics."""
    service = CandidateVerificationService()
    return service.get_candidates(
        page=page,
        limit=limit,
        status_filter=status,
        classification=classification,
        industry=industry,
        locality=locality,
        search=search,
        exclude_rejected=exclude_rejected,
    )


@admin_router.get(
    "/candidates/summary",
    response_model=CandidateVerificationSummary,
    summary="Candidate Verification Summary Statistics",
)
def get_candidates_summary(
    current_admin: AdminUser = Depends(get_current_admin),
) -> CandidateVerificationSummary:
    """Returns aggregate verification metrics across the candidate company pool."""
    service = CandidateVerificationService()
    return service.compute_summary()


@admin_router.get(
    "/candidates/{cin}",
    response_model=CandidateCompanyItem,
    summary="Get Single Candidate Company by CIN",
)
def get_candidate_company(
    cin: str,
    current_admin: AdminUser = Depends(get_current_admin),
) -> CandidateCompanyItem:
    """Retrieves full candidate company details and current manual review state."""
    service = CandidateVerificationService()
    return service.get_candidate_by_cin(cin)


@admin_router.put(
    "/candidates/{cin}",
    response_model=CandidateCompanyItem,
    summary="Update Candidate Verification Review and Save Evidence",
)
def update_candidate_verification(
    cin: str,
    payload: CandidateVerificationUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
) -> CandidateCompanyItem:
    """Updates candidate verification review, status, and evidence. Does not alter production tables."""
    service = CandidateVerificationService()
    return service.update_candidate_verification(
        cin=cin,
        payload=payload,
        reviewed_by=current_admin.username,
    )


@admin_router.post(
    "/candidates/{cin}/promote",
    summary="Promote Approved Candidate to PostgreSQL",
)
def promote_candidate_to_database(
    cin: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Promotes an approved MCA candidate into PostgreSQL companies and offices tables."""
    service = CandidateVerificationService()
    return service.promote_candidate_to_db(cin=cin, db=db)
