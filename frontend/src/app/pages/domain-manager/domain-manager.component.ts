import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { ApiService } from '../../core/api.service';
import {
  CatalogCategory,
  CatalogExportData,
  CatalogItem,
  CategoryWithCount,
  CreateCategoryDto,
  CreateItemDto,
} from '../../core/models';
import { ConfirmModalComponent, ConfirmModalData } from '../../shared/components/confirm-modal/confirm-modal.component';

export type DomainTab = 'categories' | 'items' | 'backup';

export interface IconPreset {
  key: string;
  emoji: string;
  label: string;
}

export const ICON_PRESETS: IconPreset[] = [
  { key: 'sparkles', emoji: '✨', label: 'Preparazione' },
  { key: 'file-text', emoji: '📄', label: 'Documenti' },
  { key: 'award', emoji: '🎖️', label: 'Tessere' },
  { key: 'hat', emoji: '🧢', label: 'Accessori' },
  { key: 'shirt', emoji: '👕', label: 'Abbigliamento' },
  { key: 'scissors', emoji: '👖', label: 'Pantaloni' },
  { key: 'heart', emoji: '🧦', label: 'Intimo' },
  { key: 'gem', emoji: '💍', label: 'Gioielli' },
  { key: 'smile', emoji: '🪥', label: 'Cura personale' },
  { key: 'utensils', emoji: '🥪', label: 'Cibo & Snack' },
  { key: 'cross', emoji: '💊', label: 'Medicine' },
  { key: 'cpu', emoji: '🔌', label: 'Tecnologia' },
  { key: 'mountain', emoji: '🏔️', label: 'Montagna' },
  { key: 'umbrella', emoji: '🏖️', label: 'Mare & Spiaggia' },
  { key: 'dice', emoji: '🎲', label: 'Svago & Giochi' },
  { key: 'briefcase', emoji: '💼', label: 'Lavoro' },
  { key: 'car', emoji: '🚗', label: 'Auto' },
  { key: 'plane', emoji: '✈️', label: 'Aereo' },
  { key: 'train', emoji: '🚆', label: 'Treno' },
  { key: 'ship', emoji: '🚢', label: 'Traghetto' },
  { key: 'camera', emoji: '📷', label: 'Foto' },
  { key: 'box', emoji: '📦', label: 'Altro' },
];

export const TAG_OPTIONS = [
  { key: 'estate', label: 'Estate', emoji: '☀️', class: 'tag-summer' },
  { key: 'inverno', label: 'Inverno', emoji: '❄️', class: 'tag-winter' },
  { key: 'sera', label: 'Sera', emoji: '🌙', class: 'tag-night' },
  { key: 'aereo', label: 'Aereo', emoji: '✈️', class: 'tag-flight' },
  { key: 'treno', label: 'Treno', emoji: '🚆', class: 'tag-train' },
  { key: 'traghetto', label: 'Traghetto', emoji: '🚢', class: 'tag-ferry' },
];

@Component({
  selector: 'app-domain-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './domain-manager.component.html',
  styleUrl: './domain-manager.component.scss',
})
export class DomainManagerComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(Dialog);

  // Active Tab
  readonly activeTab = signal<DomainTab>('categories');

  // Data Signals
  readonly categories = signal<CategoryWithCount[]>([]);
  readonly items = signal<CatalogItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filters: Categories Tab
  readonly categorySearch = signal<string>('');

  // Filters: Items Tab
  readonly itemSearch = signal<string>('');
  readonly itemCategoryFilter = signal<string>('all');
  readonly itemTagFilter = signal<string>('all');

  // Modals visibility
  readonly showCategoryModal = signal<boolean>(false);
  readonly isEditingCategory = signal<boolean>(false);
  readonly showItemModal = signal<boolean>(false);
  readonly isEditingItem = signal<boolean>(false);
  readonly isModalClosing = signal<boolean>(false);

  // Category Form
  categoryForm: {
    id?: string;
    name: string;
    slug: string;
    parentGroup: string;
    icon: string;
    sortOrder: number;
  } = {
    name: '',
    slug: '',
    parentGroup: '',
    icon: 'list',
    sortOrder: 0,
  };
  slugManuallyEdited = false;

  // Item Form
  itemForm: {
    id?: string;
    name: string;
    description: string;
    tags: string[];
    defaultQuantity: number;
    isPreparation: boolean;
    minDays: number | null;
    toBuy: boolean;
    imageUrl: string;
    sortOrder: number;
    categoryIds: string[];
  } = {
    name: '',
    description: '',
    tags: [],
    defaultQuantity: 1,
    isPreparation: false,
    minDays: null,
    toBuy: false,
    imageUrl: '',
    sortOrder: 0,
    categoryIds: [],
  };

  // Image Upload State
  readonly uploadingImage = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);

  // Backup / Import State
  importFile: File | null = null;
  importMode: 'merge' | 'replace' = 'merge';
  importPreview: { categoriesCount: number; itemsCount: number } | null = null;
  readonly importing = signal<boolean>(false);
  readonly importError = signal<string | null>(null);

  // Lightbox Preview
  readonly lightboxImage = signal<{ url: string; title: string } | null>(null);

  // Presets
  readonly iconPresets = ICON_PRESETS;
  readonly tagOptions = TAG_OPTIONS;

  // --------------------------------------------------------------------------
  // Computed Signals
  // --------------------------------------------------------------------------
  readonly filteredCategories = computed(() => {
    const search = this.categorySearch().trim().toLowerCase();
    const list = this.categories();
    if (!search) return list;

    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.slug.toLowerCase().includes(search) ||
        (c.parentGroup && c.parentGroup.toLowerCase().includes(search)),
    );
  });

  readonly filteredItems = computed(() => {
    const search = this.itemSearch().trim().toLowerCase();
    const catFilter = this.itemCategoryFilter();
    const tagFilter = this.itemTagFilter();
    const list = this.items();

    return list.filter((item) => {
      // Search text
      if (search) {
        const nameMatch = item.name.toLowerCase().includes(search);
        const descMatch = item.description?.toLowerCase().includes(search);
        if (!nameMatch && !descMatch) return false;
      }

      // Category filter
      if (catFilter !== 'all') {
        const inCat = item.categoryIds?.includes(catFilter);
        if (!inCat) return false;
      }

      // Tag filter
      if (tagFilter !== 'all') {
        const hasTag = item.tags.includes(tagFilter);
        if (!hasTag) return false;
      }

      return true;
    });
  });

  readonly parentGroups = computed(() => {
    const set = new Set<string>();
    for (const c of this.categories()) {
      if (c.parentGroup?.trim()) {
        set.add(c.parentGroup.trim());
      }
    }
    return Array.from(set).sort();
  });

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------
  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.api.getItems().subscribe({
          next: (items) => {
            this.items.set(items);
            this.loading.set(false);
          },
          error: (err) => {
            this.errorMessage.set('Impossibile caricare gli oggetti del catalogo');
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        this.errorMessage.set('Impossibile caricare le sezioni del catalogo');
        this.loading.set(false);
      },
    });
  }

  // --------------------------------------------------------------------------
  // Category Actions
  // --------------------------------------------------------------------------
  openCreateCategoryModal(): void {
    const nextOrder = (this.categories().reduce((max, c) => Math.max(max, c.sortOrder), 0) || 0) + 1;
    this.categoryForm = {
      name: '',
      slug: '',
      parentGroup: '',
      icon: 'sparkles',
      sortOrder: nextOrder,
    };
    this.slugManuallyEdited = false;
    this.isEditingCategory.set(false);
    this.isModalClosing.set(false);
    this.showCategoryModal.set(true);
  }

  openEditCategoryModal(cat: CategoryWithCount): void {
    this.categoryForm = {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentGroup: cat.parentGroup || '',
      icon: cat.icon || 'list',
      sortOrder: cat.sortOrder,
    };
    this.slugManuallyEdited = true;
    this.isEditingCategory.set(true);
    this.isModalClosing.set(false);
    this.showCategoryModal.set(true);
  }

  onCategoryNameChange(name: string): void {
    if (!this.slugManuallyEdited && !this.isEditingCategory()) {
      this.categoryForm.slug = this.slugify(name);
    }
  }

  saveCategory(): void {
    const name = this.categoryForm.name.trim();
    if (!name) return;

    this.saving.set(true);
    const dto: CreateCategoryDto = {
      name,
      slug: this.categoryForm.slug.trim() || undefined,
      parentGroup: this.categoryForm.parentGroup.trim() || null,
      icon: this.categoryForm.icon.trim() || 'list',
      sortOrder: Number(this.categoryForm.sortOrder) || 0,
    };

    if (this.isEditingCategory() && this.categoryForm.id) {
      this.api.updateCategory(this.categoryForm.id, dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModals();
          this.showToast('Sezione aggiornata con successo!');
          this.loadAll();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Errore nel salvataggio della sezione');
        },
      });
    } else {
      this.api.createCategory(dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModals();
          this.showToast('Nuova sezione creata con successo!');
          this.loadAll();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Errore nella creazione della sezione');
        },
      });
    }
  }

  confirmDeleteCategory(cat: CategoryWithCount): void {
    const warning = cat.itemsCount > 0
      ? `Attenzione: questa sezione contiene ${cat.itemsCount} oggetti associati. L'eliminazione rimuoverà l'associazione.`
      : '';

    const dialogRef = this.dialog.open<boolean>(ConfirmModalComponent, {
      data: {
        title: `Elimina sezione "${cat.name}"?`,
        message: `Sei sicuro di voler eliminare la sezione "${cat.name}"? ${warning}`,
        confirmLabel: 'Elimina sezione',
        cancelLabel: 'Annulla',
        confirmVariant: 'danger',
      } satisfies ConfirmModalData,
    });

    dialogRef.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.api.deleteCategory(cat.id).subscribe({
          next: () => {
            this.showToast(`Sezione "${cat.name}" eliminata`);
            this.loadAll();
          },
          error: (err) => {
            this.errorMessage.set('Errore durante l\'eliminazione della sezione');
          },
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // Item Actions
  // --------------------------------------------------------------------------
  openCreateItemModal(): void {
    const nextOrder = (this.items().reduce((max, i) => Math.max(max, i.sortOrder), 0) || 0) + 1;
    this.itemForm = {
      name: '',
      description: '',
      tags: [],
      defaultQuantity: 1,
      isPreparation: false,
      minDays: null,
      toBuy: false,
      imageUrl: '',
      sortOrder: nextOrder,
      categoryIds: this.itemCategoryFilter() !== 'all' ? [this.itemCategoryFilter()] : [],
    };
    this.uploadError.set(null);
    this.isEditingItem.set(false);
    this.isModalClosing.set(false);
    this.showItemModal.set(true);
  }

  openEditItemModal(item: CatalogItem): void {
    this.itemForm = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      tags: [...item.tags],
      defaultQuantity: item.defaultQuantity || 1,
      isPreparation: item.isPreparation,
      minDays: item.minDays,
      toBuy: item.toBuy,
      imageUrl: item.imageUrl || '',
      sortOrder: item.sortOrder,
      categoryIds: [...(item.categoryIds || [])],
    };
    this.uploadError.set(null);
    this.isEditingItem.set(true);
    this.isModalClosing.set(false);
    this.showItemModal.set(true);
  }

  toggleTag(tagKey: string): void {
    const index = this.itemForm.tags.indexOf(tagKey);
    if (index >= 0) {
      this.itemForm.tags.splice(index, 1);
    } else {
      this.itemForm.tags.push(tagKey);
    }
  }

  toggleCategoryLink(catId: string): void {
    const index = this.itemForm.categoryIds.indexOf(catId);
    if (index >= 0) {
      this.itemForm.categoryIds.splice(index, 1);
    } else {
      this.itemForm.categoryIds.push(catId);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadingImage.set(true);
    this.uploadError.set(null);

    this.api.uploadItemImage(file).subscribe({
      next: (res) => {
        this.itemForm.imageUrl = res.url;
        this.uploadingImage.set(false);
        this.showToast('Immagine caricata con successo!');
      },
      error: (err) => {
        this.uploadingImage.set(false);
        this.uploadError.set(err?.error?.message || 'Errore nel caricamento dell\'immagine');
      },
    });
  }

  removeImage(): void {
    this.itemForm.imageUrl = '';
    this.uploadError.set(null);
  }

  saveItem(): void {
    const name = this.itemForm.name.trim();
    if (!name) return;

    this.saving.set(true);
    const dto: CreateItemDto = {
      name,
      description: this.itemForm.description.trim() || null,
      tags: this.itemForm.tags,
      defaultQuantity: Number(this.itemForm.defaultQuantity) || 1,
      isPreparation: this.itemForm.isPreparation,
      minDays: this.itemForm.minDays && this.itemForm.minDays > 0 ? Number(this.itemForm.minDays) : null,
      toBuy: this.itemForm.toBuy,
      imageUrl: this.itemForm.imageUrl.trim() || null,
      sortOrder: Number(this.itemForm.sortOrder) || 0,
      categoryIds: this.itemForm.categoryIds,
    };

    if (this.isEditingItem() && this.itemForm.id) {
      this.api.updateItem(this.itemForm.id, dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModals();
          this.showToast('Oggetto aggiornato con successo!');
          this.loadAll();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Errore nel salvataggio dell\'oggetto');
        },
      });
    } else {
      this.api.createItem(dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModals();
          this.showToast('Nuovo oggetto creato con successo!');
          this.loadAll();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Errore nella creazione dell\'oggetto');
        },
      });
    }
  }

  confirmDeleteItem(item: CatalogItem): void {
    const dialogRef = this.dialog.open<boolean>(ConfirmModalComponent, {
      data: {
        title: `Elimina oggetto "${item.name}"?`,
        message: `Sei sicuro di voler eliminare "${item.name}" dal catalogo? Questa azione non può essere annullata.`,
        confirmLabel: 'Elimina oggetto',
        cancelLabel: 'Annulla',
        confirmVariant: 'danger',
      } satisfies ConfirmModalData,
    });

    dialogRef.closed.subscribe((confirmed) => {
      if (confirmed) {
        this.api.deleteItem(item.id).subscribe({
          next: () => {
            this.showToast(`Oggetto "${item.name}" eliminato`);
            this.loadAll();
          },
          error: (err) => {
            this.errorMessage.set('Errore durante l\'eliminazione dell\'oggetto');
          },
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // Backup / Import Actions
  // --------------------------------------------------------------------------
  exportJson(): void {
    this.api.exportCatalog().subscribe({
      next: (data) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `takeaway-catalogo-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Download del catalogo avviato!');
      },
      error: () => {
        this.errorMessage.set('Errore durante l\'esportazione del catalogo');
      },
    });
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.importFile = input.files[0];
    this.importError.set(null);
    this.importPreview = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json || !Array.isArray(json.categories) || !Array.isArray(json.items)) {
          this.importError.set('File JSON non valido. Deve contenere array "categories" e "items".');
          this.importFile = null;
          return;
        }
        this.importPreview = {
          categoriesCount: json.categories.length,
          itemsCount: json.items.length,
        };
      } catch (err) {
        this.importError.set('Impossibile interpretare il file JSON. Assicurati che sia formattato correttamente.');
        this.importFile = null;
      }
    };
    reader.readAsText(this.importFile);
  }

  runImport(): void {
    if (!this.importFile) return;

    this.importing.set(true);
    this.importError.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        this.api
          .importCatalog({
            mode: this.importMode,
            categories: json.categories,
            items: json.items,
          })
          .subscribe({
            next: (res) => {
              this.importing.set(false);
              this.importFile = null;
              this.importPreview = null;
              this.showToast(
                `Importazione completata con successo! (${res.importedCategories} sezioni, ${res.importedItems} oggetti)`,
              );
              this.loadAll();
            },
            error: (err) => {
              this.importing.set(false);
              this.importError.set(err?.error?.message || 'Errore durante l\'importazione');
            },
          });
      } catch (err) {
        this.importing.set(false);
        this.importError.set('Errore di lettura del file');
      }
    };
    reader.readAsText(this.importFile);
  }

  // --------------------------------------------------------------------------
  // Lightbox & Modal Helpers
  // --------------------------------------------------------------------------
  openLightbox(url: string, title: string): void {
    this.lightboxImage.set({ url, title });
  }

  closeLightbox(): void {
    this.lightboxImage.set(null);
  }

  closeModals(): void {
    this.isModalClosing.set(true);
    setTimeout(() => {
      this.showCategoryModal.set(false);
      this.showItemModal.set(false);
      this.isModalClosing.set(false);
    }, 180);
  }

  showToast(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      if (this.successMessage() === msg) {
        this.successMessage.set(null);
      }
    }, 4000);
  }

  getCategoryEmoji(iconKey: string): string {
    const found = ICON_PRESETS.find((p) => p.key === iconKey);
    return found ? found.emoji : '📁';
  }

  getTagInfo(tag: string): { label: string; emoji: string; class: string } {
    const found = TAG_OPTIONS.find((t) => t.key === tag);
    if (found) return found;
    return { label: tag, emoji: '🏷️', class: 'tag-default' };
  }

  private slugify(text: string): string {
    return (
      text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'nuova-sezione'
    );
  }
}

