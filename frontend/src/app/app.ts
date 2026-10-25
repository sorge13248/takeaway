import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './core/api.service';
import { AuthService } from './core/auth.service';
import {
  CatalogCategory,
  CatalogItem,
  ITEM_STATUS_OPTIONS,
  ItemState,
  ItemStatus,
  TripDetail,
  TripSummary,
} from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);

  readonly statusOptions = ITEM_STATUS_OPTIONS;

  // Data signals
  readonly catalog = signal<CatalogCategory[]>([]);
  readonly trips = signal<TripSummary[]>([]);
  readonly activeTripId = signal<string | null>(null);
  readonly activeTrip = signal<TripDetail | null>(null);
  readonly itemStates = signal<Record<string, ItemState>>({});

  // Loading states
  readonly loadingCatalog = signal<boolean>(true);
  readonly loadingTrips = signal<boolean>(true);
  readonly loadingTrip = signal<boolean>(false);
  readonly savingItemId = signal<string | null>(null);

  // Frontend-only filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('all');
  readonly tagFilter = signal<string>('all');
  readonly categoryFilter = signal<string>('all');
  readonly collapsedCategories = signal<Record<string, boolean>>({});

  // Modals & UI
  readonly isDarkMode = signal<boolean>(false);
  readonly showCreateModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly showResetModal = signal<boolean>(false);
  readonly showDeleteModal = signal<boolean>(false);
  readonly isModalClosing = signal<boolean>(false);
  readonly lightboxImage = signal<{ url: string; title: string } | null>(null);

  // Forms
  tripForm = {
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    notes: '',
  };

  // Debounce helper for notes
  private noteTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

  // Computed: stats for active trip
  readonly tripStats = computed(() => {
    const states = this.itemStates();
    const stateEntries = Object.values(states);

    const valorizedItems = stateEntries.filter(
      (s) =>
        (s.status && s.status !== 'none') ||
        (s.quantity !== null && s.quantity !== undefined && s.quantity > 0) ||
        (s.note && s.note.trim().length > 0),
    );

    const packedItems = valorizedItems.filter(
      (s) => s.status === 'packed' || s.status === 'worn' || s.status === 'car',
    );

    const totalValorized = valorizedItems.length;
    const totalPacked = packedItems.length;
    const percent = totalValorized > 0 ? Math.round((totalPacked / totalValorized) * 100) : 0;

    return {
      totalValorized,
      totalPacked,
      percent,
    };
  });

  // Computed: filtered catalog based strictly on frontend criteria
  readonly filteredCatalog = computed(() => {
    const categories = this.catalog();
    const query = this.searchQuery().trim().toLowerCase();
    const statusF = this.statusFilter();
    const tagF = this.tagFilter();
    const catF = this.categoryFilter();
    const states = this.itemStates();

    return categories
      .filter((cat) => (catF === 'all' ? true : cat.slug === catF))
      .map((cat) => {
        const filteredItems = cat.items.filter((item) => {
          // 1. Text Search
          if (query) {
            const matchName = item.name.toLowerCase().includes(query);
            const matchDesc = item.description?.toLowerCase().includes(query) ?? false;
            if (!matchName && !matchDesc) return false;
          }

          // 2. Tag Filter
          if (tagF !== 'all') {
            if (!item.tags || !item.tags.includes(tagF)) return false;
          }

          // 3. Status Filter
          if (statusF !== 'all') {
            const state = states[item.id];
            const isValorized =
              state &&
              ((state.status && state.status !== 'none') ||
                (state.quantity !== null && state.quantity !== undefined && state.quantity > 0) ||
                (state.note && state.note.trim().length > 0));

            if (statusF === 'valorized') {
              if (!isValorized) return false;
            } else if (statusF === 'unvalorized') {
              if (isValorized) return false;
            } else {
              // Specific status
              if (state?.status !== statusF) return false;
            }
          }

          return true;
        });

        // Compute items count in this category
        const catValorizedCount = cat.items.filter((item) => {
          const s = states[item.id];
          return (
            s &&
            ((s.status && s.status !== 'none') ||
              (s.quantity !== null && s.quantity !== undefined && s.quantity > 0) ||
              (s.note && s.note.trim().length > 0))
          );
        }).length;

        const catPackedCount = cat.items.filter((item) => {
          const s = states[item.id];
          return s && (s.status === 'packed' || s.status === 'worn' || s.status === 'car');
        }).length;

        return {
          ...cat,
          filteredItems,
          totalCount: cat.items.length,
          valorizedCount: catValorizedCount,
          packedCount: catPackedCount,
        };
      })
      .filter((cat) => cat.filteredItems.length > 0 || (query === '' && statusF === 'all' && tagF === 'all'));
  });

  ngOnInit() {
    this.auth.initAuth();
    this.loadCatalog();
    this.loadTrips();

    // Check saved theme
    const savedTheme = localStorage.getItem('takeaway_theme');
    if (savedTheme === 'dark') {
      this.isDarkMode.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  toggleTheme() {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('takeaway_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('takeaway_theme', 'light');
    }
  }

  loadCatalog() {
    this.loadingCatalog.set(true);
    this.api.getCatalog().subscribe({
      next: (data) => {
        this.catalog.set(data);
        this.loadingCatalog.set(false);
      },
      error: (err) => {
        console.error('Errore nel caricamento del catalogo:', err);
        this.loadingCatalog.set(false);
      },
    });
  }

  loadTrips() {
    this.loadingTrips.set(true);
    this.api.getTrips().subscribe({
      next: (trips) => {
        this.trips.set(trips);
        this.loadingTrips.set(false);

        // Auto-select first trip or keep current if valid
        const currentId = this.activeTripId();
        if (currentId && trips.some((t) => t.id === currentId)) {
          this.selectTrip(currentId);
        } else if (trips.length > 0) {
          this.selectTrip(trips[0].id);
        } else {
          this.activeTripId.set(null);
          this.activeTrip.set(null);
          this.itemStates.set({});
        }
      },
      error: (err) => {
        console.error('Errore nel caricamento dei viaggi:', err);
        this.loadingTrips.set(false);
      },
    });
  }

  selectTrip(tripId: string) {
    this.activeTripId.set(tripId);
    this.loadingTrip.set(true);

    this.api.getTrip(tripId).subscribe({
      next: (detail) => {
        this.activeTrip.set(detail);
        this.itemStates.set(detail.itemStates || {});
        this.loadingTrip.set(false);
      },
      error: (err) => {
        console.error('Errore nel caricamento del viaggio:', err);
        this.loadingTrip.set(false);
      },
    });
  }

  // Reactive state management per item
  getItemState(itemId: string): ItemState {
    const states = this.itemStates();
    if (states[itemId]) {
      return states[itemId];
    }
    return {
      quantity: 1,
      status: 'none',
      note: null,
    };
  }

  onQuantityChange(item: CatalogItem, delta: number) {
    const current = this.getItemState(item.id);
    const currQty = current.quantity ?? item.defaultQuantity ?? 1;
    const nextQty = Math.max(0, currQty + delta);
    this.updateItemState(item.id, { quantity: nextQty });
  }

  onQuantityInput(item: CatalogItem, event: Event) {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    const qty = isNaN(val) ? 0 : Math.max(0, val);
    this.updateItemState(item.id, { quantity: qty });
  }

  onStatusChange(item: CatalogItem, event: Event) {
    const select = event.target as HTMLSelectElement;
    const nextStatus = select.value as ItemStatus;
    this.updateItemState(item.id, { status: nextStatus });
  }

  onNoteInput(item: CatalogItem, event: Event) {
    const input = event.target as HTMLInputElement;
    const noteVal = input.value;

    // Local update immediately
    const current = this.getItemState(item.id);
    this.itemStates.update((states) => ({
      ...states,
      [item.id]: {
        ...current,
        note: noteVal,
      },
    }));

    // Debounce backend save
    if (this.noteTimeouts[item.id]) {
      clearTimeout(this.noteTimeouts[item.id]);
    }
    this.noteTimeouts[item.id] = setTimeout(() => {
      this.saveToBackend(item.id, {
        quantity: current.quantity,
        status: current.status,
        note: noteVal,
      });
    }, 400);
  }

  resetItem(item: CatalogItem) {
    this.itemStates.update((states) => {
      const next = { ...states };
      delete next[item.id];
      return next;
    });

    const tripId = this.activeTripId();
    if (!tripId) return;

    this.api
      .saveItemState(tripId, item.id, {
        quantity: 0,
        status: 'none',
        note: '',
      })
      .subscribe();
  }

  private updateItemState(itemId: string, patch: Partial<ItemState>) {
    const current = this.getItemState(itemId);
    const updated: ItemState = {
      ...current,
      ...patch,
    };

    // Update local reactive signal
    this.itemStates.update((states) => ({
      ...states,
      [itemId]: updated,
    }));

    this.saveToBackend(itemId, updated);
  }

  private saveToBackend(itemId: string, state: Partial<ItemState>) {
    const tripId = this.activeTripId();
    if (!tripId) return;

    this.savingItemId.set(itemId);
    this.api
      .saveItemState(tripId, itemId, {
        quantity: state.quantity,
        status: state.status,
        note: state.note,
      })
      .subscribe({
        next: (res) => {
          this.savingItemId.set(null);
          if (!res.valorized) {
            // Cleaned from backend DB, remove from state dictionary
            this.itemStates.update((states) => {
              const copy = { ...states };
              delete copy[itemId];
              return copy;
            });
          }
        },
        error: (err) => {
          this.savingItemId.set(null);
          console.error(`Errore nel salvataggio dell'item ${itemId}:`, err);
        },
      });
  }

  // Category collapse / expand
  toggleCategory(slug: string) {
    this.collapsedCategories.update((map) => ({
      ...map,
      [slug]: !map[slug],
    }));
  }

  expandAll() {
    this.collapsedCategories.set({});
  }

  collapseAll() {
    const allCollapsed: Record<string, boolean> = {};
    for (const cat of this.catalog()) {
      allCollapsed[cat.slug] = true;
    }
    this.collapsedCategories.set(allCollapsed);
  }

  @HostListener('window:keydown.escape')
  handleEscape() {
    if (
      this.showCreateModal() ||
      this.showEditModal() ||
      this.showResetModal() ||
      this.showDeleteModal() ||
      this.lightboxImage()
    ) {
      this.closeAllModals();
    }
  }

  closeAllModals() {
    if (this.isModalClosing()) return;
    this.isModalClosing.set(true);
    setTimeout(() => {
      this.showCreateModal.set(false);
      this.showEditModal.set(false);
      this.showResetModal.set(false);
      this.showDeleteModal.set(false);
      this.lightboxImage.set(null);
      this.isModalClosing.set(false);
    }, 210);
  }

  // Modals & Trip CRUD
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

  submitCreateTrip() {
    if (!this.tripForm.title.trim()) return;

    this.api
      .createTrip({
        title: this.tripForm.title,
        destination: this.tripForm.destination || null,
        startDate: this.tripForm.startDate || null,
        endDate: this.tripForm.endDate || null,
        notes: this.tripForm.notes || null,
      })
      .subscribe({
        next: (newTrip) => {
          this.closeAllModals();
          this.trips.update((list) => [newTrip, ...list]);
          this.selectTrip(newTrip.id);
        },
        error: (err) => {
          console.error('Errore nella creazione del viaggio:', err);
        },
      });
  }

  openEditModal() {
    const trip = this.activeTrip();
    if (!trip) return;
    this.isModalClosing.set(false);
    this.tripForm = {
      title: trip.title,
      destination: trip.destination || '',
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      notes: trip.notes || '',
    };
    this.showEditModal.set(true);
  }

  submitEditTrip() {
    const tripId = this.activeTripId();
    if (!tripId || !this.tripForm.title.trim()) return;

    this.api
      .updateTrip(tripId, {
        title: this.tripForm.title,
        destination: this.tripForm.destination || null,
        startDate: this.tripForm.startDate || null,
        endDate: this.tripForm.endDate || null,
        notes: this.tripForm.notes || null,
      })
      .subscribe({
        next: (updated) => {
          this.closeAllModals();
          this.trips.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
          this.selectTrip(updated.id);
        },
        error: (err) => {
          console.error('Errore nella modifica del viaggio:', err);
        },
      });
  }

  openResetModal() {
    this.isModalClosing.set(false);
    this.showResetModal.set(true);
  }

  confirmResetTrip() {
    const tripId = this.activeTripId();
    if (!tripId) return;

    this.api.resetTrip(tripId).subscribe({
      next: () => {
        this.closeAllModals();
        this.itemStates.set({});
      },
      error: (err) => {
        console.error('Errore nell\'azzeramento del viaggio:', err);
      },
    });
  }

  openDeleteModal() {
    this.isModalClosing.set(false);
    this.showDeleteModal.set(true);
  }

  confirmDeleteTrip() {
    const tripId = this.activeTripId();
    if (!tripId) return;

    this.api.deleteTrip(tripId).subscribe({
      next: () => {
        this.closeAllModals();
        this.trips.update((list) => list.filter((t) => t.id !== tripId));
        const remaining = this.trips();
        if (remaining.length > 0) {
          this.selectTrip(remaining[0].id);
        } else {
          this.activeTripId.set(null);
          this.activeTrip.set(null);
          this.itemStates.set({});
        }
      },
      error: (err) => {
        console.error('Errore nell\'eliminazione del viaggio:', err);
      },
    });
  }

  openLightbox(url: string, title: string) {
    this.isModalClosing.set(false);
    this.lightboxImage.set({ url, title });
  }

  closeLightbox() {
    this.closeAllModals();
  }

  // Tag helper
  getTagInfo(tag: string) {
    switch (tag) {
      case 'estate':
        return { label: 'Estate / caldo', emoji: '☀️', class: 'tag-summer' };
      case 'inverno':
        return { label: 'Inverno / freddo', emoji: '❄️', class: 'tag-winter' };
      case 'sera':
        return { label: 'Sera / notte', emoji: '🌙', class: 'tag-night' };
      case 'aereo':
        return { label: 'Aereo', emoji: '✈️', class: 'tag-flight' };
      case 'treno':
        return { label: 'Treno', emoji: '🚆', class: 'tag-train' };
      case 'traghetto':
        return { label: 'Traghetto', emoji: '🚢', class: 'tag-ferry' };
      default:
        return { label: tag, emoji: '🏷️', class: 'tag-default' };
    }
  }
}
