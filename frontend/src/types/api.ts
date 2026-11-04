export interface ApiCompany {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  industry?: string | null;
  company_size?: string | null;
  founded_year?: number | null;
  is_verified: boolean;
  locality?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export type CompanyResponse = ApiCompany;

export interface ApiOffice {
  id: number;
  company_id: number;
  address?: string | null;
  locality?: string | null;
  city: string;
  state: string;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  experience_level?: string | null;
  role_type?: string | null;
  workplace_type?: string | null;
  locality?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  salary_currency?: string | null;
  skills?: string[] | null;
  application_url?: string | null;
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

export interface ImportPreviewItem {
  company_name: string;
  company_slug: string;
  locality?: string | null;
  job_title?: string | null;
  valid: boolean;
  issues: string[];
}

export interface ImportPreviewResponse {
  total_records: number;
  accepted_count: number;
  rejected_count: number;
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
}

export interface MCAPreviewFilterParams {
  file_path?: string;
  batch?: number;
  dataset?: string;
  locality?: string;
  industry?: string;
  geocoding_source?: string;
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
  database_modified?: boolean;
  items: MCAPreviewCompany[];
}
