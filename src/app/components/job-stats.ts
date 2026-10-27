import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { JobService } from '../services/job.service';

@Component({
  selector: 'app-job-stats',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
      <!-- Top Hiring Companies -->
      <div class="bg-white p-5 rounded-xl border border-zinc-200/90 shadow-2xs">
        <div class="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2">
          <h3 class="text-xs font-semibold text-zinc-900">
            Empresas con mayor volumen
          </h3>
          <span class="text-[11px] text-zinc-400 font-mono">Ofertas</span>
        </div>

        <div class="space-y-1.5">
          @for (company of jobService.stats().topCompanies; track company.name) {
            <button
              type="button"
              (click)="filterBy(company.name)"
              class="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 transition-colors text-left group cursor-pointer"
              title="Filtrar por esta empresa"
            >
              <span class="text-xs font-medium text-zinc-700 group-hover:text-zinc-950 truncate pr-2">
                {{ company.name }}
              </span>
              <span class="font-mono text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded tabular-nums">
                {{ company.count }}
              </span>
            </button>
          } @empty {
            <p class="text-xs text-zinc-400 italic py-2">Sin datos disponibles en este lote</p>
          }
        </div>
      </div>

      <!-- Top Locations -->
      <div class="bg-white p-5 rounded-xl border border-zinc-200/90 shadow-2xs">
        <div class="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2">
          <h3 class="text-xs font-semibold text-zinc-900">
            Ubicaciones principales
          </h3>
          <span class="text-[11px] text-zinc-400 font-mono">Ofertas</span>
        </div>

        <div class="space-y-1.5">
          @for (loc of jobService.stats().topLocations; track loc.name) {
            <button
              type="button"
              (click)="filterBy(loc.name)"
              class="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 transition-colors text-left group cursor-pointer"
              title="Filtrar por esta ubicación"
            >
              <span class="text-xs font-medium text-zinc-700 group-hover:text-zinc-950 truncate pr-2">
                {{ loc.name }}
              </span>
              <span class="font-mono text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded tabular-nums">
                {{ loc.count }}
              </span>
            </button>
          } @empty {
            <p class="text-xs text-zinc-400 italic py-2">Sin datos de ubicación</p>
          }
        </div>
      </div>

      <!-- Distribution & Summary -->
      <div class="bg-white p-5 rounded-xl border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2">
            <h3 class="text-xs font-semibold text-zinc-900">
              Antigüedad y estado
            </h3>
            <span class="text-[11px] text-zinc-400 font-mono">7 días</span>
          </div>

          <div class="space-y-3 mt-3">
            <div>
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="text-zinc-600">Última semana:</span>
                <span class="font-mono font-semibold text-zinc-900 tabular-nums">
                  {{ jobService.stats().recentCount }} de {{ jobService.totalExtracted() }}
                </span>
              </div>
              <div class="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                <div
                  class="bg-zinc-900 h-1.5 rounded-full transition-all duration-300"
                  [style.width.%]="jobService.stats().percentageRecent || 0"
                ></div>
              </div>
            </div>

            <div class="p-3 bg-zinc-50 rounded-lg text-xs text-zinc-600 border border-zinc-100 space-y-1">
              <div class="text-zinc-900 font-medium">
                Cobertura multiplataforma
              </div>
              <p class="text-[11px] text-zinc-500 leading-relaxed">
                Extracción simultánea de LinkedIn, Computrabajo y El Empleo con normalización de fechas y enlaces directos.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
          <span class="text-zinc-500">Ofertas guardadas:</span>
          <span class="font-mono font-semibold text-zinc-900 tabular-nums">
            {{ jobService.totalSaved() }}
          </span>
        </div>
      </div>
    </div>
  `,
})
export class JobStatsComponent {
  readonly jobService = inject(JobService);

  filterBy(text: string) {
    this.jobService.filterQuery.set(text);
    this.jobService.activeTab.set('all');
    this.jobService.showToast(`Filtrando resultados por "${text}"`, 'info');
  }
}
