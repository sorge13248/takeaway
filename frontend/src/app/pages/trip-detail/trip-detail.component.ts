import { Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  CatalogCategory,
  CatalogItem,
  ITEM_STATUS_OPTIONS,
  ItemState,
  ItemStatus,
  TripDetail,
} from '../../core/models';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './trip-detail.component.html',
  styleUrl: './trip-detail.component.scss',
})
export class TripDetailComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private routeSub?: Subscription;

  readonly statusOptions = ITEM_STATUS_OPTIONS;

  // Data signals
  readonly tripId = signal<string | null>(null);
  readonly catalog = signal<CatalogCategory[]>([]);
  readonly activeTrip = signal<TripDetail | null>(null);
  readonly itemStates = signal<Record<string, ItemState>>({});

  // Loading states
  readonly loadingCatalog = signal<boolean>(true);
  readonly loadingTrip = signal<boolean>(true);
  readonly savingItemId = signal<string | null>(null);
  readonly tripNotFound = signal<boolean>(false);

  // Frontend-only filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('all');
  readonly tagFilter = signal<string>('all');
  readonly categoryFilter = signal<string>('all');
  readonly collapsedCategories = signal<Record<string, boolean>>({});

  // Modals & UI
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
      (s) =>
        (s.status === 'packed' || s.status === 'worn' || s.status === 'car') &&
        (s.quantity !== null && s.quantity !== undefined && s.quantity > 0),
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

  // Computed: list of items with errors
  readonly errorItems = computed(() => {
    const states = this.itemStates();
    const catalogCats = this.catalog();

    const allItems: CatalogItem[] = [];
    for (const cat of catalogCats) {
      allItems.push(...cat.items);
    }
    const itemMap = new Map(allItems.map((i) => [i.id, i]));

    const result: { item: CatalogItem | undefined; itemId: string; error: string }[] = [];
    for (const itemId of Object.keys(states)) {
      const err = this.getItemError(itemId);
      if (err) {
        result.push({
          itemId,
          item: itemMap.get(itemId),
          error: err,
        });
      }
    }
    return result;
  });

  readonly errorCount = computed(() => this.errorItems().length);

  // Computed: counts for each status option in filter dropdown
  readonly statusCounts = computed(() => {
    const categories = this.catalog();
    const states = this.itemStates();

    let all = 0;
    let valorized = 0;
    let unvalorized = 0;
    let packed = 0;
    let worn = 0;
    let car = 0;
    let to_pack_last = 0;

    for (const cat of categories) {
      for (const item of cat.items) {
        all++;
        const state = states[item.id];
        const isValorized =
          state &&
          ((state.status && state.status !== 'none') ||
            (state.quantity !== null && state.quantity !== undefined && state.quantity > 0) ||
            (state.note && state.note.trim().length > 0));

        if (isValorized) {
          valorized++;
        } else {
          unvalorized++;
        }

        if (state) {
          if (state.status === 'packed') packed++;
          else if (state.status === 'worn') worn++;
          else if (state.status === 'car') car++;
          else if (state.status === 'to_pack_last') to_pack_last++;
        }
      }
    }

    return {
      all,
      valorized,
      unvalorized,
      error: this.errorCount(),
      packed,
      worn,
      car,
      to_pack_last,
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

            if (statusF === 'error') {
              const err = this.getItemError(item.id);
              if (!err) return false;
            } else if (statusF === 'valorized') {
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
    this.loadCatalog();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.tripId.set(id);
        this.loadTrip(id);
      } else {
        this.tripNotFound.set(true);
        this.loadingTrip.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    Object.values(this.noteTimeouts).forEach(clearTimeout);
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

  loadTrip(id: string) {
    this.loadingTrip.set(true);
    this.tripNotFound.set(false);

    this.api.getTrip(id).subscribe({
      next: (detail) => {
        this.activeTrip.set(detail);
        this.itemStates.set(detail.itemStates || {});
        this.loadingTrip.set(false);
      },
      error: (err) => {
        console.error('Errore nel caricamento del viaggio:', err);
        this.loadingTrip.set(false);
        this.tripNotFound.set(true);
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
      quantity: 0,
      status: 'none',
      note: null,
    };
  }

  getItemError(itemId: string): string | null {
    const state = this.getItemState(itemId);
    const qty = state.quantity ?? 0;
    const status = state.status || 'none';

    // 1. Select su valore diverso da "non selezionato" e quantità ancora su 0
    if (status !== 'none' && qty === 0) {
      return 'Quantità a 0: imposta una quantità maggiore di 0 oppure seleziona "Non selezionato" per rimuovere.';
    }

    // 2. Viceversa: select su "non selezionato" e quantità diversa da 0 (> 0)
    if (status === 'none' && qty > 0) {
      return 'Stato non selezionato: scegli uno stato (es. In valigia) oppure imposta la quantità a 0.';
    }

    return null;
  }

  onQuantityChange(item: CatalogItem, delta: number) {
    const current = this.getItemState(item.id);
    const currQty = current.quantity ?? 0;
    const nextQty = Math.max(0, currQty + delta);
    if (nextQty === 0 && (!current.status || current.status === 'none') && !current.note) {
      this.resetItem(item);
      return;
    }
    this.updateItemState(item.id, { quantity: nextQty });
  }

  onQuantityInput(item: CatalogItem, event: Event) {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    const qty = isNaN(val) ? 0 : Math.max(0, val);
    const current = this.getItemState(item.id);
    if (qty === 0 && (!current.status || current.status === 'none') && !current.note) {
      this.resetItem(item);
      return;
    }
    this.updateItemState(item.id, { quantity: qty });
  }

  onStatusChange(item: CatalogItem, nextStatus: ItemStatus) {
    if (nextStatus === 'none') {
      this.resetItem(item);
    } else {
      this.updateItemState(item.id, { status: nextStatus });
    }
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
    if (this.noteTimeouts[item.id]) {
      clearTimeout(this.noteTimeouts[item.id]);
      delete this.noteTimeouts[item.id];
    }

    this.itemStates.update((states) => {
      const next = { ...states };
      delete next[item.id];
      return next;
    });

    const tripId = this.tripId();
    if (!tripId) return;

    this.api
      .saveItemState(tripId, item.id, {
        quantity: 0,
        status: 'none',
        note: '',
      })
      .subscribe({
        error: (err) => {
          console.error(`Errore nel reset dell'item ${item.id}:`, err);
        },
      });
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
    const tripId = this.tripId();
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

  filterByErrors() {
    this.statusFilter.set('error');
    this.expandAll();
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
      this.showEditModal.set(false);
      this.showResetModal.set(false);
      this.showDeleteModal.set(false);
      this.lightboxImage.set(null);
      this.isModalClosing.set(false);
    }, 210);
  }

  // Modals & Trip CRUD
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
    const tripId = this.tripId();
    if (!tripId || !this.tripForm.title.trim()) return;

    this.api
      .updateTrip(tripId, {
        title: this.tripForm.title.trim(),
        destination: this.tripForm.destination?.trim() || null,
        startDate: this.tripForm.startDate || null,
        endDate: this.tripForm.endDate || null,
        notes: this.tripForm.notes?.trim() || null,
      })
      .subscribe({
        next: (updated) => {
          this.closeAllModals();
          this.activeTrip.update((prev) => (prev ? { ...prev, ...updated } : null));
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
    const tripId = this.tripId();
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
    const tripId = this.tripId();
    if (!tripId) return;

    this.api.deleteTrip(tripId).subscribe({
      next: () => {
        this.closeAllModals();
        this.router.navigate(['/']);
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

