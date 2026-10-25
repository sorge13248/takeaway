import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TripSummary } from '../../core/models';

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './trip-list.component.html',
  styleUrl: './trip-list.component.scss',
})
export class TripListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly pageSize = 20;

  // Data signals
  readonly trips = signal<TripSummary[]>([]);
  readonly loadingTrips = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly currentPage = signal<number>(1);

  // Modal
  readonly showCreateModal = signal<boolean>(false);
  readonly isModalClosing = signal<boolean>(false);

  tripForm = {
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    notes: '',
  };

  // Sorted list: from most recent to least recent (createdAt DESC)
  readonly sortedTrips = computed(() => {
    const list = [...this.trips()];
    const query = this.searchQuery().trim().toLowerCase();

    const filtered = query
      ? list.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            (t.destination && t.destination.toLowerCase().includes(query)) ||
            (t.notes && t.notes.toLowerCase().includes(query)),
        )
      : list;

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  // Total pages
  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.sortedTrips().length / this.pageSize));
  });

  // Paginated 20 items per page
  readonly paginatedTrips = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return this.sortedTrips().slice(start, start + this.pageSize);
  });

  // Page numbers helper
  readonly pageList = computed(() => {
    const total = this.totalPages();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit() {
    this.loadTrips();
  }

  loadTrips() {
    this.loadingTrips.set(true);
    this.api.getTrips().subscribe({
      next: (trips) => {
        this.trips.set(trips);
        this.loadingTrips.set(false);
      },
      error: (err) => {
        console.error('Errore nel caricamento dei viaggi:', err);
        this.loadingTrips.set(false);
      },
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          // fallback if scrollTo is not fully supported in test runner
        }
      }
    }
  }

  getTripPercent(trip: TripSummary): number {
    if (!trip.valorizedCount || trip.valorizedCount <= 0) return 0;
    return Math.round((trip.packedCount / trip.valorizedCount) * 100);
  }

  formatTripDates(trip: TripSummary): string {
    if (trip.startDate && trip.endDate) {
      return `${this.formatDate(trip.startDate)} → ${this.formatDate(trip.endDate)}`;
    } else if (trip.startDate) {
      return `Dal ${this.formatDate(trip.startDate)}`;
    } else if (trip.endDate) {
      return `Fino al ${this.formatDate(trip.endDate)}`;
    }
    return '';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }

  formatCreatedAt(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  openCreateModal() {
    this.isModalClosing.set(false);
    this.tripForm = {
      title: '',
      destination: '',
      startDate: '',
      endDate: '',
      notes: '',
    };
    this.showCreateModal.set(true);
  }

  closeModal() {
    if (this.isModalClosing()) return;
    this.isModalClosing.set(true);
    setTimeout(() => {
      this.showCreateModal.set(false);
      this.isModalClosing.set(false);
    }, 210);
  }

  @HostListener('window:keydown.escape')
  handleEscape() {
    if (this.showCreateModal()) {
      this.closeModal();
    }
  }

  submitCreateTrip() {
    if (!this.tripForm.title.trim()) return;

    this.api
      .createTrip({
        title: this.tripForm.title.trim(),
        destination: this.tripForm.destination?.trim() || null,
        startDate: this.tripForm.startDate || null,
        endDate: this.tripForm.endDate || null,
        notes: this.tripForm.notes?.trim() || null,
      })
      .subscribe({
        next: (newTrip) => {
          this.closeModal();
          this.router.navigate(['/trips', newTrip.id]);
        },
        error: (err) => {
          console.error('Errore nella creazione del viaggio:', err);
        },
      });
  }
}
