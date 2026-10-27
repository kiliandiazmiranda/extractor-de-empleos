import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { JobService } from './services/job.service';
import { JobDrawerComponent } from './components/job-drawer';
import { JobTableComponent } from './components/job-table';
import { JobStatsComponent } from './components/job-stats';
import { ClientSortOption, JobPlatform } from './models/job.model';
import {
  WORLDWIDE_LOCATIONS,
  TECH_ROLES_KEYWORDS,
  searchAutocomplete,
} from './data/autocomplete.data';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    JobDrawerComponent,
    JobTableComponent,
    JobStatsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly jobService = inject(JobService);
  readonly currentYear = new Date().getFullYear();

  // Search panel collapse/expand state (collapsed after search or when viewing saved/stats)
  readonly isSearchPanelCollapsed = signal<boolean>(false);

  // Selected platforms to query
  readonly platformsList: { id: JobPlatform; name: string; icon: string; url: string; badgeClass: string; dotColor: string }[] = [
    { id: 'linkedin', name: 'LinkedIn', icon: 'work', url: 'https://www.linkedin.com/jobs', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80', dotColor: 'bg-[#0a66c2]' },
    { id: 'computrabajo', name: 'Computrabajo', icon: 'domain', url: 'https://co.computrabajo.com/', badgeClass: 'bg-amber-50 text-amber-750 border-amber-200/80', dotColor: 'bg-[#e65100]' },
    { id: 'elempleo', name: 'El Empleo', icon: 'business_center', url: 'https://www.elempleo.com/', badgeClass: 'bg-emerald-50 text-emerald-750 border-emerald-200/80', dotColor: 'bg-[#00897b]' },
  ];

  readonly selectedPlatforms = signal<JobPlatform[]>([
    'linkedin',
    'computrabajo',
    'elempleo',
  ]);

  // Only the platforms that the user selected when searching
  readonly activeFilterPlatforms = computed(() => {
    const active = this.jobService.activeSearchPlatforms();
    return this.platformsList.filter((p) => active.includes(p.id));
  });

  // Form for extraction parameters - Worldwide support
  readonly searchForm = new FormGroup({
    keywords: new FormControl('Desarrollador Software', { nonNullable: true }),
    location: new FormControl('Remoto', { nonNullable: true }),
    sortBy: new FormControl<'DD' | 'R'>('DD', { nonNullable: true }),
    timeFilter: new FormControl('r2592000', { nonNullable: true }), // Default: Último mes
  });

  // Autocomplete suggestions (worldwide)
  readonly keywordSuggestions = signal<string[]>(TECH_ROLES_KEYWORDS.slice(0, 7));
  readonly locationSuggestions = signal<string[]>(WORLDWIDE_LOCATIONS.slice(0, 7));
  readonly showKeywordDropdown = signal<boolean>(false);
  readonly showLocationDropdown = signal<boolean>(false);

  // Client search filter form control
  readonly clientSearchControl = new FormControl('', { nonNullable: true });

  constructor() {
    // Listen to client search filter changes and update JobService signal
    this.clientSearchControl.valueChanges.subscribe((value) => {
      this.jobService.filterQuery.set(value);
    });

    // Autocomplete listeners
    this.searchForm.controls.keywords.valueChanges.subscribe((val) => {
      this.keywordSuggestions.set(searchAutocomplete(TECH_ROLES_KEYWORDS, val));
    });

    this.searchForm.controls.location.valueChanges.subscribe((val) => {
      this.locationSuggestions.set(searchAutocomplete(WORLDWIDE_LOCATIONS, val));
    });
  }

  togglePlatform(platform: JobPlatform) {
    this.selectedPlatforms.update((current) => {
      if (current.includes(platform)) {
        if (current.length === 1) {
          this.jobService.showToast('Debes seleccionar al menos una plataforma', 'info');
          return current;
        }
        return current.filter((p) => p !== platform);
      } else {
        return [...current, platform];
      }
    });
  }

  onExtractSubmit() {
    this.showKeywordDropdown.set(false);
    this.showLocationDropdown.set(false);

    const values = this.searchForm.getRawValue();
    this.jobService.extractJobs({
      keywords: values.keywords,
      location: values.location,
      sortBy: values.sortBy,
      timeFilter: values.timeFilter,
      limit: 100,
      platforms: this.selectedPlatforms(),
    });

    // Automatically collapse extraction panel to focus on results
    this.isSearchPanelCollapsed.set(true);
  }

  toggleSearchPanel() {
    this.isSearchPanelCollapsed.update((v) => !v);
  }

  switchTab(tab: 'all' | 'saved' | 'stats') {
    this.jobService.activeTab.set(tab);
    if (tab === 'saved' || tab === 'stats') {
      this.isSearchPanelCollapsed.set(true);
    }
  }

  selectKeywordSuggestion(val: string) {
    this.searchForm.controls.keywords.setValue(val);
    this.showKeywordDropdown.set(false);
  }

  selectLocationSuggestion(val: string) {
    this.searchForm.controls.location.setValue(val);
    this.showLocationDropdown.set(false);
  }

  onKeywordFocus() {
    this.keywordSuggestions.set(
      searchAutocomplete(TECH_ROLES_KEYWORDS, this.searchForm.controls.keywords.value)
    );
    this.showKeywordDropdown.set(true);
    this.showLocationDropdown.set(false);
  }

  onLocationFocus() {
    this.locationSuggestions.set(
      searchAutocomplete(WORLDWIDE_LOCATIONS, this.searchForm.controls.location.value)
    );
    this.showLocationDropdown.set(true);
    this.showKeywordDropdown.set(false);
  }

  closeDropdownsWithDelay() {
    setTimeout(() => {
      this.showKeywordDropdown.set(false);
      this.showLocationDropdown.set(false);
    }, 200);
  }

  setSort(option: ClientSortOption) {
    this.jobService.sortOption.set(option);
    const labels: Record<ClientSortOption, string> = {
      'date-desc': 'Orden: Más reciente',
      'date-asc': 'Orden: Más antiguo',
      'title-asc': 'Orden: Título (A-Z)',
      'company-asc': 'Orden: Empresa (A-Z)',
    };
    this.jobService.showToast(labels[option], 'info');
  }

  setPlatformFilter(platform: JobPlatform | 'all') {
    this.jobService.selectedPlatformFilter.set(platform);
  }

  clearClientSearch() {
    this.clientSearchControl.setValue('');
    this.jobService.filterQuery.set('');
  }

  getTimeFilterLabel(code: string): string {
    switch (code) {
      case 'r3600':
        return 'Última hora';
      case 'r43200':
        return 'Últimas 12 horas';
      case 'r86400':
        return 'Últimas 24 horas';
      case 'r604800':
        return 'Última semana';
      case 'r2592000':
        return 'Último mes';
      default:
        return 'Último mes';
    }
  }

  getPlatformDotClass(source?: string): string {
    switch (source) {
      case 'computrabajo':
        return 'bg-[#e65100]';
      case 'elempleo':
        return 'bg-[#00897b]';
      case 'linkedin':
      default:
        return 'bg-[#0a66c2]';
    }
  }

  getPlatformBadgeClasses(source?: string): string {
    switch (source) {
      case 'computrabajo':
        return 'bg-amber-50 text-amber-800 border-amber-200/60';
      case 'elempleo':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
      case 'linkedin':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200/60';
    }
  }


  getPlatformLabel(source?: string): string {
    switch (source) {
      case 'computrabajo':
        return 'Computrabajo';
      case 'elempleo':
        return 'El Empleo';
      case 'linkedin':
      default:
        return 'LinkedIn';
    }
  }
}
