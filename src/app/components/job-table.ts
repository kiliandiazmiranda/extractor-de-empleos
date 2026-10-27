import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { JobService } from '../services/job.service';

@Component({
  selector: 'app-job-table',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto border border-zinc-200/90 rounded-xl bg-white shadow-2xs">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium tracking-wider">
            <th class="py-3 px-3 w-10 text-center"></th>
            <th class="py-3 px-3 w-28">Portal</th>
            <th class="py-3 px-4 min-w-[240px]">Puesto y Empresa</th>
            <th class="py-3 px-4 min-w-[150px]">Ubicación</th>
            <th class="py-3 px-4 min-w-[130px]">
              <button
                type="button"
                class="inline-flex items-center gap-1 cursor-pointer select-none text-xs font-medium text-zinc-500 hover:text-zinc-900"
                (click)="toggleDateSort()"
              >
                <span>Publicado</span>
                <mat-icon class="text-xs! w-3! h-3!">
                  {{ jobService.sortOption() === 'date-desc' ? 'arrow_downward' : 'arrow_upward' }}
                </mat-icon>
              </button>
            </th>
            <th class="py-3 px-4 min-w-[120px]">Salario / Info</th>
            <th class="py-3 px-4 min-w-[170px] text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100 font-normal">
          @for (job of jobService.displayJobs(); track job.id) {
            <tr class="hover:bg-zinc-50/80 transition-colors group">
              <!-- Bookmark column -->
              <td class="py-2.5 px-3 text-center">
                <button
                  type="button"
                  (click)="jobService.toggleSaveJob(job)"
                  class="text-zinc-300 hover:text-amber-500 transition-colors p-1 cursor-pointer"
                  [title]="job.isSaved ? 'Quitar de guardadas' : 'Guardar oferta'"
                >
                  <mat-icon class="text-base! w-4! h-4!" [class.text-amber-500]="job.isSaved">
                    {{ job.isSaved ? 'bookmark' : 'bookmark_border' }}
                  </mat-icon>
                </button>
              </td>

              <!-- Portal Badge -->
              <td class="py-2.5 px-3 whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                  <span class="w-1.5 h-1.5 rounded-full" [class]="getDotColor(job.source)"></span>
                  {{ getPlatformName(job.source) }}
                </span>
              </td>

              <!-- Title & Company -->
              <td class="py-2.5 px-4">
                <div class="flex items-center gap-2.5">
                  @if (job.companyLogo) {
                    <img
                      [src]="job.companyLogo"
                      [alt]="job.company"
                      class="w-7 h-7 rounded-md object-contain bg-white border border-zinc-200 shrink-0"
                      referrerpolicy="no-referrer"
                    />
                  } @else {
                    <div class="w-7 h-7 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-bold text-xs shrink-0">
                      {{ job.company.charAt(0) || 'E' }}
                    </div>
                  }
                  <div class="min-w-0">
                    <button
                      type="button"
                      (click)="jobService.selectJob(job)"
                      class="text-zinc-900 font-semibold hover:text-blue-600 hover:underline text-left block truncate max-w-sm sm:max-w-md cursor-pointer"
                      title="Ver descripción"
                    >
                      {{ job.title }}
                    </button>
                    <div class="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                      @if (job.companyUrl) {
                        <a
                          [href]="job.companyUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="hover:text-zinc-900 hover:underline truncate"
                        >
                          {{ job.company }}
                        </a>
                      } @else {
                        <span class="truncate">{{ job.company }}</span>
                      }
                    </div>
                  </div>
                </div>
              </td>

              <!-- Location -->
              <td class="py-2.5 px-4 text-zinc-600 text-xs">
                <span class="truncate max-w-[160px] block" [title]="job.location">{{ job.location }}</span>
              </td>

              <!-- Date -->
              <td class="py-2.5 px-4 text-xs whitespace-nowrap">
                <div class="font-mono tabular-nums text-zinc-800">
                  {{ job.postedDate || 'Reciente' }}
                </div>
                <div class="text-[11px] text-zinc-400">
                  {{ job.postedRelative }}
                </div>
              </td>

              <!-- Tags / Benefits -->
              <td class="py-2.5 px-4 text-xs text-zinc-600">
                @if (job.salary) {
                  <span class="text-zinc-800 font-medium bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">{{ job.salary }}</span>
                } @else if (job.benefits) {
                  <span class="text-zinc-500 truncate block max-w-[120px]" [title]="job.benefits">
                    {{ job.benefits }}
                  </span>
                } @else {
                  <span class="text-zinc-300">—</span>
                }
              </td>

              <!-- Actions -->
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    (click)="jobService.copyLink(job.linkedinUrl)"
                    class="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                    title="Copiar enlace"
                  >
                    <mat-icon class="text-sm! w-4! h-4!">content_copy</mat-icon>
                  </button>

                  <button
                    type="button"
                    (click)="jobService.selectJob(job)"
                    class="px-2 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
                  >
                    Detalles
                  </button>

                  <a
                    [href]="job.linkedinUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-900 hover:bg-black text-white transition-colors shadow-2xs"
                    [title]="'Abrir en ' + getPlatformName(job.source)"
                  >
                    <span>Ver</span>
                    <mat-icon class="text-xs! w-3! h-3!">open_in_new</mat-icon>
                  </a>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class JobTableComponent {
  readonly jobService = inject(JobService);

  toggleDateSort() {
    const current = this.jobService.sortOption();
    if (current === 'date-desc') {
      this.jobService.sortOption.set('date-asc');
      this.jobService.showToast('Orden: Más antiguas primero', 'info');
    } else {
      this.jobService.sortOption.set('date-desc');
      this.jobService.showToast('Orden: Más recientes primero', 'info');
    }
  }

  getPlatformName(source?: string): string {
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

  getDotColor(source?: string): string {
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
}
