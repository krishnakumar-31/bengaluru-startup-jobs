export interface ApiCompany {
  id: number;
  name: string;
  slug: string;
  cin?: string | null;
  description?: string | null;
  website?: string | null;
  website_url?: string | null;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  industry?: string | null;
  company_size?: string | null;
  founded_year?: number | null;
  is_verified: boolean;
  locality?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  offices?: ApiOffice[];
  jobs?: ApiJob[];
  created_at: string;
  updated_at: string;
}

export type CompanyResponse = ApiCompany;

export interface ApiOffice {
  id: number;
  company_id: number;
  company_name?: string | null;
  name?: string | null;
  address?: string | null;
  locality?: string | null;
  city: string;
  state: string;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_headquarters?: boolean;
  created_at: string;
  updated_at: string;
}

export type OfficeResponse = ApiOffice;

export interface ApiJobSource {
  id: number;
  job_id: number;
  source_name: string;
  source_url: string;
  last_verified_at?: string | null;
  created_at: string;
}

export interface ApiJob {
  id: number;
  company_id: number;
  office_id?: number | null;
  title: string;
  slug: string;
  description: string;
  employment_type: string;
  work_mode?: string;
  vacancies?: number;
  experience_level?: string | null;
  experience_min?: number | null;
  experience_max?: number | null;
  role_type?: string | null;
  workplace_type?: string | null;
  locality?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  salary_currency?: string | null;
  skills?: string[] | null;
  application_url?: string | null;
  job_source_url?: string | null;
  status: string;
  is_active: boolean;
  posted_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  company?: ApiCompany | null;
  office?: ApiOffice | null;
  sources?: ApiJobSource[];
}

export type JobResponse = ApiJob;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export type PaginatedCompaniesResponse = PaginatedResponse<ApiCompany>;
export type PaginatedJobsResponse = PaginatedResponse<ApiJob>;

export interface ApiJobMap {
  id: number;
  title: string;
  slug: string;
  employment_type: string;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  skills?: string[] | null;
  status: string;
  company_id: number;
  office_id: number;
  company_name: string;
  locality?: string | null;
  address?: string | null;
  city: string;
  latitude: number;
  longitude: number;
  company?: ApiCompany | null;
  office?: ApiOffice | null;
}

export interface JobFilterParams {
  page?: number;
  limit?: number;
  skip?: number;
  search?: string;
  skills?: string;
  locality?: string;
  employment_type?: string;
  experience_level?: string;
  company?: string;
  company_id?: number;
  status?: string;
  include_expired?: boolean;
}

export interface MapFilterParams {
  locality?: string;
  skills?: string;
  search?: string;
  status?: string;
  include_expired?: boolean;
}

export interface CompanyFilterParams {
  page?: number;
  limit?: number;
  skip?: number;
  search?: string;
  name?: string;
  industry?: string;
  locality?: string;
  is_verified?: boolean;
}

// --- Admin Dashboard Types ---
export interface AdminProfileResponse {
  id: number;
  username: string;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChartItem {
  label: string;
  count: number;
  percentage: number;
}

export interface AdminStatsOverview {
  total_companies: number;
  verified_companies: number;
  unverified_companies: number;
  total_offices: number;
  total_jobs: number;
  active_jobs: number;
  expired_jobs: number;
  unverified_jobs: number;
  recent_companies: ApiCompany[];
  recent_jobs: ApiJob[];
}

export interface AdminChartsResponse {
  companies_by_industry: ChartItem[];
  jobs_by_industry: ChartItem[];
  jobs_by_locality: ChartItem[];
  jobs_by_status: ChartItem[];
}

export interface PublicStatsResponse {
  total_approved_companies: number;
  total_office_locations: number;
  active_job_openings: number;
  total_vacancies: number;
}

export interface MapJobBrief {
  id: number;
  title: string;
  slug: string;
  employment_type: string;
  work_mode: string;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  vacancies: number;
  skills?: string[] | null;
  status: string;
}

export interface OfficeLocationMapResponse {
  office_id: number;
  office_name?: string | null;
  company_id: number;
  company_name: string;
  company_slug: string;
  company_logo_url?: string | null;
  industry?: string | null;
  address?: string | null;
  locality?: string | null;
  city: string;
  state: string;
  postal_code?: string | null;
  latitude: number;
  longitude: number;
  is_headquarters: boolean;
  is_verified: boolean;
  has_active_vacancies: boolean;
  active_jobs_count: number;
  total_vacancies: number;
  jobs: MapJobBrief[];
}

export interface ImportPreviewItem {
  row_number?: number;
  company_name: string;
  company_slug: string;
  company_cin?: string | null;
  office_name?: string | null;
  locality?: string | null;
  job_title?: string | null;
  job_slug?: string | null;
  vacancies?: number | null;
  is_duplicate_company?: boolean;
  is_duplicate_office?: boolean;
  is_duplicate_job?: boolean;
  valid: boolean;
  issues: string[];
  warnings?: string[];
}

export interface ImportPreviewResponse {
  total_records: number;
  accepted_count: number;
  rejected_count: number;
  new_companies_count?: number;
  existing_companies_count?: number;
  new_offices_count?: number;
  new_jobs_count?: number;
  items: ImportPreviewItem[];
  raw_accepted_json?: string | null;
}

export interface ImportConfirmResponse {
  companies_created: number;
  companies_updated: number;
  offices_created: number;
  offices_updated: number;
  jobs_created: number;
  jobs_updated: number;
  skipped_count?: number;
  rejected_count?: number;
  message: string;
}

export interface AdminVerificationResponse {
  unverified_companies: ApiCompany[];
  unverified_jobs: ApiJob[];
  expired_jobs: ApiJob[];
}

// --- MCA Preview Types ---
export interface MCAPreviewCompany {
  cin: string;
  name: string;
  legal_name?: string | null;
  slug?: string | null;
  industry?: string | null;
  mca_sector?: string | null;
  founded_year?: number | null;
  registration_date?: string | null;
  authorized_capital?: number | null;
  paidup_capital?: number | null;
  locality?: string | null;
  postal_code?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  geocoding_source: string; // "nominatim_osm" | "locality_centroid" | "pincode_centroid"
  confidence: string; // "high" | "medium" | "low"
  is_verified?: boolean;
  verification_status?: string | null;
  candidate_status?: string | null;
  is_duplicate?: boolean;
  entity_classification?: "startup" | "established_company" | "uncertain_for_review" | string | null;
  classification_reason?: string | null;
}

export interface MCAPreviewFilterParams {
  file_path?: string;
  batch?: number;
  dataset?: string;
  locality?: string;
  industry?: string;
  geocoding_source?: string;
  entity_classification?: string;
  include_duplicates?: boolean;
}

export interface MCAPreviewSummary {
  file_name: string;
  total_records: number;
  valid_coordinates_count: number;
  skipped_records_count: number;
  total_processed?: number;
  valid_records_count?: number;
  duplicate_records_count?: number;
  failed_records_count?: number;
  address_level_count: number;
  locality_centroid_count: number;
  manual_verification_count?: number;
  startup_count?: number;
  established_company_count?: number;
  uncertain_for_review_count?: number;
  database_modified?: boolean;
  items: MCAPreviewCompany[];
}

// --- Manual Company Verification Workflow Types ---
export type CandidateVerificationStatus = "Needs Review" | "Verified" | "Rejected";

export interface CandidateCompanyItem {
  cin: string;
  name: string;
  legal_name: string;
  slug: string;
  industry?: string | null;
  mca_sector?: string | null;
  founded_year?: number | null;
  registration_date?: string | null;
  authorized_capital?: number | null;
  paidup_capital?: number | null;
  company_status: string;
  entity_classification: "startup" | "established_company" | "uncertain_for_review" | string;
  classification_reason?: string | null;
  registered_address: string;
  postal_code?: string | null;
  locality?: string | null;
  latitude: number;
  longitude: number;
  geocoding_source: string;
  confidence: string;
  verification_status: CandidateVerificationStatus;
  is_verified: boolean;
  official_website?: string | null;
  evidence_url?: string | null;
  actual_operating_office_address?: string | null;
  operating_locality?: string | null;
  operating_pincode?: string | null;
  operating_latitude?: number | null;
  operating_longitude?: number | null;
  reviewer_notes?: string | null;
  verification_date?: string | null;
  reviewed_by?: string | null;
}

export interface CandidateVerificationUpdatePayload {
  verification_status: CandidateVerificationStatus;
  official_website?: string | null;
  evidence_url?: string | null;
  actual_operating_office_address?: string | null;
  operating_locality?: string | null;
  operating_pincode?: string | null;
  reviewer_notes?: string | null;
}

export interface CandidateVerificationSummary {
  total_candidates: number;
  needs_review_count: number;
  verified_count: number;
  rejected_count: number;
  startup_count: number;
  established_count: number;
  uncertain_count: number;
  operating_office_confirmed_count: number;
  website_confirmed_count: number;
  evidence_confirmed_count: number;
}

export interface PaginatedCandidatesResponse {
  items: CandidateCompanyItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  summary: CandidateVerificationSummary;
}
