import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  ClientSortOption,
  JobDetails,
  JobPlatform,
  JobSearchParams,
  LinkedInJob,
} from '../models/job.model';

import { normalizeText } from '../data/autocomplete.data';

const STORAGE_SAVED_KEY = 'linkedin_extractor_saved_jobs_v1';

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private readonly http = inject(HttpClient);

  // State signals
  readonly jobs = signal<LinkedInJob[]>([]);
  readonly savedJobs = signal<LinkedInJob[]>(this.loadSavedJobsFromStorage());
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Search parameters (worldwide by default)
  readonly searchParams = signal<JobSearchParams>({
    keywords: 'Desarrollador Software',
    location: 'Remoto',
    sortBy: 'DD',
    timeFilter: 'r2592000', // Default
    limit: 100,
    platforms: ['linkedin', 'computrabajo', 'elempleo'],
  });

  // Platforms that were selected during the last executed search
  readonly activeSearchPlatforms = signal<JobPlatform[]>([
    'linkedin',
    'computrabajo',
    'elempleo',
  ]);

  // Client filtering & sorting
  readonly filterQuery = signal<string>('');
  readonly selectedPlatformFilter = signal<JobPlatform | 'all'>('all');
  readonly sortOption = signal<ClientSortOption>('date-desc');
  readonly activeTab = signal<'all' | 'saved' | 'stats'>('all');
  readonly viewMode = signal<'cards' | 'table'>('cards');

  // Selected job details
  readonly selectedJob = signal<LinkedInJob | null>(null);
  readonly jobDetails = signal<JobDetails | null>(null);
  readonly isLoadingDetails = signal<boolean>(false);
  readonly detailsError = signal<string | null>(null);

  // Toast notifications
  readonly toast = signal<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Computed state
  readonly totalExtracted = computed(() => this.jobs().length);
  readonly totalSaved = computed(() => this.savedJobs().length);

  /**
   * Filtered and sorted jobs list based on active tab, text query, and sort option.
   * If a term (like "frontend") is searched, only jobs that actually mention that term
   * in the title, company, location, or benefits/description will be included.
   * If a job does not match the searched terms, it is excluded.
   */
  readonly displayJobs = computed(() => {
    const tab = this.activeTab();
    const sourceList = tab === 'saved' ? this.savedJobs() : this.jobs();
    const rawQuery = this.filterQuery().trim();
    const normQuery = normalizeText(rawQuery);
    const sort = this.sortOption();
    const platform = this.selectedPlatformFilter();
    const savedIds = new Set(this.savedJobs().map((j) => j.id));

    // Query tokens
    const tokens = normQuery ? normQuery.split(/\s+/).filter(Boolean) : [];

    // Filter with strict term containment: every token must be found in the job text
    const scoredList: { job: LinkedInJob; score: number }[] = [];

    for (const rawJob of sourceList) {
      // Platform filter
      if (platform !== 'all' && rawJob.source !== platform) {
        continue;
      }

      const job: LinkedInJob = {
        ...rawJob,
        isSaved: savedIds.has(rawJob.id),
      };

      if (tokens.length === 0) {
        scoredList.push({ job, score: 0 });
        continue;
      }

      const normTitle = normalizeText(job.title);
      const normCompany = normalizeText(job.company);
      const normLocation = normalizeText(job.location);
      const normBenefits = normalizeText(job.benefits || '');
      const normSalary = normalizeText(job.salary || '');
      const fullCorpus = `${normTitle} ${normCompany} ${normLocation} ${normBenefits} ${normSalary}`;

      // Helper function to check if token exists (with hyphenated variations like frontend / front-end)
      const tokenInCorpus = (token: string): boolean => {
        if (fullCorpus.includes(token)) return true;
        if (token === 'frontend' && (fullCorpus.includes('front-end') || fullCorpus.includes('front end'))) {
          return true;
        }
        if (token === 'backend' && (fullCorpus.includes('back-end') || fullCorpus.includes('back end'))) {
          return true;
        }
        if (token === 'fullstack' && (fullCorpus.includes('full-stack') || fullCorpus.includes('full stack'))) {
          return true;
        }
        return false;
      };

      // REQUIRE ALL TOKENS: if any searched word is missing from the job, remove/exclude it!
      const allTokensPresent = tokens.every((token) => tokenInCorpus(token));
      if (!allTokensPresent) {
        continue;
      }

      // Calculate relevance score for ranking
      let score = 0;
      if (normTitle.includes(normQuery)) {
        score += 80;
      }
      for (const token of tokens) {
        if (normTitle.includes(token)) {
          score += 35;
        } else if (normCompany.includes(token)) {
          score += 20;
        } else if (normLocation.includes(token)) {
          score += 15;
        } else if (normBenefits.includes(token)) {
          score += 10;
        }
      }

      scoredList.push({ job, score });
    }

    // Sort: 1. Más reciente (default), 2. Más antiguo, 3. Título, 4. Empresa
    return scoredList
      .sort((a, b) => {
        if (sort === 'date-desc') {
          return b.job.timestamp - a.job.timestamp;
        }
        if (sort === 'date-asc') {
          return a.job.timestamp - b.job.timestamp;
        }
        if (sort === 'title-asc') {
          return a.job.title.localeCompare(b.job.title);
        }
        if (sort === 'company-asc') {
          return a.job.company.localeCompare(b.job.company);
        }
        return b.score - a.score;
      })
      .map((item) => item.job);
  });

  /**
   * Analytics breakdown of currently loaded jobs
   */
  readonly stats = computed(() => {
    const list = this.jobs();
    if (list.length === 0) {
      return {
        topCompanies: [],
        topLocations: [],
        recentCount: 0,
        averageDaysAgo: 0,
      };
    }

    const companyCount: Record<string, number> = {};
    const locationCount: Record<string, number> = {};
    let recentCount = 0;
    const now = Date.now();
    const oneWeekAgo = now - 7 * 86400 * 1000;

    for (const job of list) {
      companyCount[job.company] = (companyCount[job.company] || 0) + 1;
      // Simplify location (first token or city)
      const locKey = job.location.split(',')[0].trim();
      locationCount[locKey] = (locationCount[locKey] || 0) + 1;
      if (job.timestamp >= oneWeekAgo) {
        recentCount++;
      }
    }

    const topCompanies = Object.entries(companyCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topLocations = Object.entries(locationCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      topCompanies,
      topLocations,
      recentCount,
      percentageRecent: Math.round((recentCount / list.length) * 100),
    };
  });

  constructor() {
    // Initial fetch on app start so the user immediately sees real live extracted jobs
    this.extractJobs();
  }

  /**
   * Extract real jobs from LinkedIn via server endpoint
   */
  extractJobs(customParams?: Partial<JobSearchParams>) {
    if (customParams) {
      this.searchParams.update((p) => ({ ...p, ...customParams }));
    }

    const params = this.searchParams();
    this.isLoading.set(true);
    this.error.set(null);

    const queryParams: Record<string, string> = {
      keywords: params.keywords,
      location: params.location,
      sortBy: params.sortBy,
      limit: String(params.limit),
    };
    if (params.timeFilter) queryParams['timeFilter'] = params.timeFilter;
    if (params.workplaceType) queryParams['workplaceType'] = params.workplaceType;
    if (params.platforms && params.platforms.length > 0) {
      queryParams['platforms'] = params.platforms.join(',');
      this.activeSearchPlatforms.set(params.platforms);
      const currentFilter = this.selectedPlatformFilter();
      if (currentFilter !== 'all' && !params.platforms.includes(currentFilter)) {
        this.selectedPlatformFilter.set('all');
      }
    }

    this.http
      .get<{ success: boolean; total: number; jobs: LinkedInJob[]; error?: string }>('/api/jobs', {
        params: queryParams,
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.success && Array.isArray(res.jobs)) {
            const savedIds = new Set(this.savedJobs().map((j) => j.id));
            const processed = res.jobs.map((j) => ({
              ...j,
              isSaved: savedIds.has(j.id),
            }));
            this.jobs.set(processed);
            this.showToast(
              `Se han extraído ${processed.length} ofertas`,
              'success'
            );
          } else {
            this.error.set(res.error || 'No se pudieron extraer ofertas');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          let friendlyMsg = err.message || 'Error de conexión con el extractor';
          if (friendlyMsg.includes('Http failure during parsing')) {
            friendlyMsg = 'El servidor devolvió una respuesta no válida o la ruta de la API no está respondiendo en este entorno. Comprueba que las funciones serverless estén habilitadas.';
          }
          this.error.set(friendlyMsg);
          this.showToast('Error al conectar con las plataformas de empleo', 'error');
        },
      });
  }

  /**
   * Open job details modal/drawer and load real details from the official platform
   */
  selectJob(job: LinkedInJob) {
    this.selectedJob.set(job);
    this.detailsError.set(null);

    if (!job.id && !job.linkedinUrl) return;

    this.isLoadingDetails.set(true);
    this.jobDetails.set(null);

    this.http
      .get<JobDetails & { success: boolean; error?: string }>('/api/jobs/details', {
        params: { id: job.id, url: job.linkedinUrl },
      })
      .subscribe({
        next: (data) => {
          this.isLoadingDetails.set(false);
          if (data && data.title) {
            this.jobDetails.set(data);
          } else {
            this.detailsError.set(data.error || 'No se pudieron cargar todos los detalles');
          }
        },
        error: () => {
          this.isLoadingDetails.set(false);
          this.detailsError.set('No se pudo cargar la descripción completa desde el portal oficial');
        },
      });
  }

  closeDetails() {
    this.selectedJob.set(null);
    this.jobDetails.set(null);
  }

  /**
   * Toggle bookmarking/saving a job
   */
  toggleSaveJob(job: LinkedInJob) {
    const saved = [...this.savedJobs()];
    const index = saved.findIndex((j) => j.id === job.id);

    if (index >= 0) {
      saved.splice(index, 1);
      this.savedJobs.set(saved);
      this.saveToStorage(saved);
      this.showToast('Oferta eliminada de guardadas', 'info');
    } else {
      saved.unshift({ ...job, isSaved: true });
      this.savedJobs.set(saved);
      this.saveToStorage(saved);
      this.showToast('Oferta guardada en favoritos', 'success');
    }

    // Update in jobs signal as well
    this.jobs.update((list) =>
      list.map((j) => (j.id === job.id ? { ...j, isSaved: !j.isSaved } : j))
    );
    if (this.selectedJob()?.id === job.id) {
      this.selectedJob.update((j) => (j ? { ...j, isSaved: !j.isSaved } : null));
    }
  }

  /**
   * Extract single job directly by pasting a LinkedIn URL
   */
  extractFromUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    // Check if contains job id: e.g. /view/4432815744 or ?currentJobId=4432815744
    let jobId = '';
    const viewMatch = trimmed.match(/\/jobs\/view\/(?:[^/]+-)?(\d+)/i);
    const paramMatch = trimmed.match(/currentJobId=(\d+)/i);
    const directNumber = trimmed.match(/^(\d+)$/);

    if (viewMatch) {
      jobId = viewMatch[1];
    } else if (paramMatch) {
      jobId = paramMatch[1];
    } else if (directNumber) {
      jobId = directNumber[1];
    }

    if (!jobId) {
      this.showToast('URL de LinkedIn no válida. Debe contener un ID de empleo.', 'error');
      return;
    }

    const dummyJob: LinkedInJob = {
      id: jobId,
      title: 'Cargando oferta directa...',
      company: 'LinkedIn',
      location: 'Consultando...',
      postedDate: new Date().toISOString().split('T')[0],
      postedRelative: 'Reciente',
      timestamp: Date.now(),
      linkedinUrl: `https://www.linkedin.com/jobs/view/${jobId}`,
    };

    this.selectJob(dummyJob);
    this.showToast(`Extrayendo oferta con ID ${jobId}...`, 'info');
  }

  /**
   * Export extracted jobs to CSV
   */
  exportToCsv(customList?: LinkedInJob[]) {
    const list = customList || this.displayJobs();
    if (list.length === 0) {
      this.showToast('No hay ofertas para exportar', 'error');
      return;
    }

    const headers = [
      'ID',
      'Título del Puesto',
      'Empresa',
      'Ubicación',
      'Fecha Publicación',
      'Tiempo Relativo',
      'Enlace Directo LinkedIn',
      'Enlace Empresa',
      'Beneficios / Etiquetas',
    ];

    const rows = list.map((job) => [
      `"${(job.id || '').replace(/"/g, '""')}"`,
      `"${(job.title || '').replace(/"/g, '""')}"`,
      `"${(job.company || '').replace(/"/g, '""')}"`,
      `"${(job.location || '').replace(/"/g, '""')}"`,
      `"${job.postedDate || ''}"`,
      `"${(job.postedRelative || '').replace(/"/g, '""')}"`,
      `"${job.linkedinUrl}"`,
      `"${job.companyUrl || ''}"`,
      `"${(job.benefits || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `linkedin_ofertas_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast(`Exportadas ${list.length} ofertas a CSV`, 'success');
  }

  /**
   * Export extracted jobs to JSON
   */
  exportToJson(customList?: LinkedInJob[]) {
    const list = customList || this.displayJobs();
    if (list.length === 0) {
      this.showToast('No hay ofertas para exportar', 'error');
      return;
    }

    const jsonStr = JSON.stringify(list, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `linkedin_ofertas_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast(`Exportadas ${list.length} ofertas a JSON`, 'success');
  }

  /**
   * Copy text to clipboard with notification
   */
  async copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      this.showToast('Enlace de LinkedIn copiado al portapapeles', 'success');
      return true;
    } catch {
      this.showToast('No se pudo copiar el enlace', 'error');
      return false;
    }
  }

  showToast(message: string, type: 'success' | 'info' | 'error' = 'info') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 3500);
  }

  private loadSavedJobsFromStorage(): LinkedInJob[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_SAVED_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(jobs: LinkedInJob[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(jobs));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }
}
