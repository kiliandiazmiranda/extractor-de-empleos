export type JobPlatform = 'linkedin' | 'computrabajo' | 'elempleo';

export interface LinkedInJob {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  companyLogo?: string;
  location: string;
  postedDate: string; // ISO format: YYYY-MM-DD
  postedRelative: string;
  timestamp: number;
  linkedinUrl: string; // Direct URL to the job on its official platform
  benefits?: string;
  salary?: string;
  isSaved?: boolean;
  source?: JobPlatform | string;
  portalName?: string;
}

export interface JobCriteria {
  label: string;
  value: string;
}

export interface JobDetails {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  companyLogo?: string;
  location: string;
  applicants?: string;
  postedTime?: string;
  criteria: JobCriteria[];
  descriptionHtml: string;
  descriptionText: string;
  linkedinUrl: string;
  source?: JobPlatform | string;
  portalName?: string;
}

export interface JobSearchParams {
  keywords: string;
  location: string;
  sortBy: 'DD' | 'R'; // 'DD' = Date Descending (Más recientes), 'R' = Relevancia
  timeFilter: string; // 'r3600' (1h), 'r43200' (12h), 'r86400' (24h/1 día), 'r604800' (semana), 'r2592000' (mes), '' (cualquiera)
  workplaceType?: string; // opcional
  limit?: number; // cantidad máxima por búsqueda (default 100)
  platforms?: JobPlatform[]; // Platforms to query: linkedin, computrabajo, elempleo
}

export type ClientSortOption = 
  | 'date-desc' 
  | 'date-asc' 
  | 'title-asc' 
  | 'company-asc';
