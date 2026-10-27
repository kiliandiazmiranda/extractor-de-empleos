import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { JobService } from '../services/job.service';

@Component({
  selector: 'app-job-drawer',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (jobService.selectedJob(); as job) {
      <div
        class="fixed inset-0 z-50 overflow-hidden flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-drawer-title"
        tabindex="-1"
        (keydown.escape)="jobService.closeDetails()"
      >
        <!-- Accessible Backdrop button -->
        <button
          type="button"
          class="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs w-full h-full cursor-default border-none p-0"
          (click)="jobService.closeDetails()"
          aria-label="Cerrar panel de detalles"
        ></button>

        <!-- Drawer Content -->
        <div
          class="relative z-10 w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 overflow-hidden"
        >
          <!-- Drawer Header -->
          <div class="p-6 border-b border-zinc-200 flex items-start justify-between gap-4 bg-zinc-50/60">
            <div class="flex items-start gap-4 min-w-0">
              @if (job.companyLogo) {
                <img
                  [src]="job.companyLogo"
                  [alt]="job.company"
                  class="w-12 h-12 rounded-lg object-contain bg-white border border-zinc-200 p-1 shrink-0"
                  referrerpolicy="no-referrer"
                />
              } @else {
                <div class="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0 font-bold text-base">
                  {{ job.company.charAt(0) || 'E' }}
                </div>
              }

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    <span class="w-1.5 h-1.5 rounded-full" [class]="getDotColor(job.source)"></span>
                    {{ getPlatformName(job.source) }}
                  </span>
                </div>

                <h2 id="job-drawer-title" class="text-lg sm:text-xl font-bold text-zinc-950 tracking-tight leading-snug break-words">
                  {{ job.title }}
                </h2>
                
                <div class="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-600">
                  @if (job.companyUrl) {
                    <a
                      [href]="job.companyUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-medium text-zinc-900 hover:text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {{ job.company }}
                      <mat-icon class="text-xs! w-3! h-3! leading-none">open_in_new</mat-icon>
                    </a>
                  } @else {
                    <span class="font-medium text-zinc-900">{{ job.company }}</span>
                  }
                  <span class="text-zinc-300">·</span>
                  <span>{{ job.location }}</span>
                  <span class="text-zinc-300">·</span>
                  <span class="font-mono text-zinc-500 tabular-nums">{{ job.postedDate || job.postedRelative }}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              (click)="jobService.closeDetails()"
              class="text-zinc-400 hover:text-zinc-800 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors shrink-0 cursor-pointer"
              title="Cerrar detalles"
              aria-label="Cerrar detalles"
            >
              <mat-icon class="text-lg! w-5! h-5!">close</mat-icon>
            </button>
          </div>

          <!-- Quick Action Bar -->
          <div class="px-6 py-3 bg-white border-b border-zinc-200 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <a
                [href]="job.linkedinUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                <span>Ver en {{ getPlatformName(job.source) }}</span>
                <mat-icon class="text-xs! w-3.5! h-3.5! leading-none">open_in_new</mat-icon>
              </a>

              <button
                type="button"
                (click)="jobService.copyLink(job.linkedinUrl)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Copiar enlace verificado"
              >
                <mat-icon class="text-xs! w-3.5! h-3.5! leading-none">content_copy</mat-icon>
                <span>Copiar enlace</span>
              </button>

              <button
                type="button"
                (click)="jobService.toggleSaveJob(job)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border"
                [class]="job.isSaved ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'"
              >
                <mat-icon class="text-xs! w-3.5! h-3.5! leading-none">
                  {{ job.isSaved ? 'bookmark' : 'bookmark_border' }}
                </mat-icon>
                <span>{{ job.isSaved ? 'Guardada' : 'Guardar' }}</span>
              </button>
            </div>
          </div>

          <!-- Drawer Body Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            @if (jobService.isLoadingDetails()) {
              <div class="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <div class="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                <div class="text-xs text-zinc-600 font-medium">
                  Cargando información oficial desde {{ getPlatformName(job.source) }}...
                </div>
              </div>
            } @else {
              <!-- Criteria Summary Strip -->
              @if (jobService.jobDetails(); as details) {
                @if (details.criteria && details.criteria.length > 0) {
                  <div class="grid grid-cols-2 gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                    @for (crit of details.criteria; track crit.label) {
                      <div>
                        <div class="text-[11px] text-zinc-500 font-medium">{{ crit.label }}</div>
                        <div class="text-xs font-semibold text-zinc-900 mt-0.5">{{ crit.value }}</div>
                      </div>
                    }
                  </div>
                }

                @if (details.applicants) {
                  <div class="flex items-center gap-2 text-xs text-zinc-700 bg-zinc-100/70 px-3 py-2 rounded-lg border border-zinc-200/60">
                    <mat-icon class="text-sm! w-4! h-4! text-zinc-500">group</mat-icon>
                    <span><strong>{{ details.applicants }}</strong> candidatos en LinkedIn</span>
                  </div>
                }
              }

              <!-- Section: Job Description -->
              <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Descripción del puesto
                  </h3>
                </div>

                @if (jobService.jobDetails()?.descriptionHtml; as descHtml) {
                  <div
                    class="text-xs sm:text-sm text-zinc-700 leading-relaxed space-y-3 font-normal overflow-hidden break-words"
                    [innerHTML]="descHtml"
                  ></div>
                } @else if (jobService.jobDetails()?.descriptionText; as descText) {
                  <div class="text-xs sm:text-sm text-zinc-700 whitespace-pre-line leading-relaxed font-normal">
                    {{ descText }}
                  </div>
                } @else if (job.benefits) {
                  <div class="p-4 bg-zinc-50 rounded-lg text-xs text-zinc-700 border border-zinc-200/60">
                    {{ job.benefits }}
                  </div>
                } @else {
                  <div class="text-center py-8 text-zinc-500 text-xs space-y-2">
                    <p>Consulta el detalle completo y postulación en la plataforma:</p>
                    <a
                      [href]="job.linkedinUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-zinc-900 font-semibold hover:underline"
                    >
                      Abrir oferta en {{ getPlatformName(job.source) }}
                      <mat-icon class="text-xs! w-3! h-3!">open_in_new</mat-icon>
                    </a>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Drawer Footer -->
          <div class="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500">
            <span class="font-mono text-[11px]">ID: {{ job.id }}</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="jobService.closeDetails()"
                class="px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-white transition-colors font-medium cursor-pointer"
              >
                Cerrar
              </button>
              <a
                [href]="job.linkedinUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg font-semibold transition-colors shadow-2xs"
              >
                Abrir oferta
              </a>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class JobDrawerComponent {
  readonly jobService = inject(JobService);

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
