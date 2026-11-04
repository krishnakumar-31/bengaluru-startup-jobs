export * from "./api";

export type RoleType = "all" | "full-time" | "part-time" | "internship" | "contract";
export type WorkplaceType = "all" | "on-site" | "hybrid" | "remote";
export type ExperienceLevel = "all" | "entry" | "mid" | "senior" | "lead";

export interface StartupJob {
  id: string;
  title: string;
  companyName: string;
  locality: string;
  roleType: string;
  workplaceType: string;
  experienceLevel: string;
  salaryDisplay: string;
  descriptionSnippet: string;
  tags: string[];
  postedTimeAgo: string;
  isSampleData: boolean;
  hubId: string;
}

export interface TechHub {
  id: string;
  name: string;
  tagline: string;
  activeOpeningsCount: number;
  prominentFor: string;
}

export interface FilterState {
  keyword: string;
  locality: string;
  roleType: string;
  workplaceType: string;
  experienceLevel: string;
  skills: string;
  company: string;
}

export interface GroupedOfficeLocation {
  officeId: number;
  companyId: number;
  companyName: string;
  companySlug?: string;
  companyLogo?: string | null;
  locality?: string | null;
  address?: string | null;
  city: string;
  latitude: number;
  longitude: number;
  jobs: {
    id: number;
    title: string;
    slug: string;
    employment_type: string;
    experience_level?: string | null;
    salary_min?: number | null;
    salary_max?: number | null;
    currency?: string | null;
    skills?: string[] | null;
  }[];
}
