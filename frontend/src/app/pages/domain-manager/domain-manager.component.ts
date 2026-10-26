import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { ApiService } from '../../core/api.service';
import {
  CatalogCategory,
  CatalogItem,
  CreateCategoryDto,
  CreateItemDto,
} from '../../core/models';
import {
  ConfirmModalComponent,
  ConfirmModalData,
} from '../../shared/components/confirm-modal/confirm-modal.component';

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
  { key: 'estate', label: 'Estate/caldo', emoji: '☀️', class: 'tag-summer' },
  { key: 'inverno', label: 'Inverno/freddo', emoji: '❄️', class: 'tag-winter' },
  { key: 'sera', label: 'Sera/notte', emoji: '🌙', class: 'tag-night' },
  { key: 'aereo', label: 'Aereo', emoji: '✈️', class: 'tag-flight' },
  { key: 'treno', label: 'Treno', emoji: '🚆', class: 'tag-train' },
  { key: 'traghetto', label: 'Traghetto', emoji: '🚢', class: 'tag-ferry' },
];

@Component({
  selector: 'app-domain-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule],
  templateUrl: './domain-manager.component.html',
  styleUrl: './domain-manager.component.scss',
})
export class DomainManagerComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(Dialog);

  // Data signals
  readonly catalog = signal<CatalogCategory[]>([]);
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Collapsed state: all sections collapsed by default in domain manager
  readonly collapsedCategories = signal<Record<string, boolean>>({});

  // Fast Filters (matching trip-detail)
  readonly searchQuery = signal<string>('');
  readonly categoryFilter = signal<string>('all');
  readonly tagFilter = signal<string>('all');
  readonly attributeFilter = signal<string>('all');

  // Modals visibility
  readonly showCategoryModal = signal<boolean>(false);
  readonly isEditingCategory = signal<boolean>(false);
  readonly showItemModal = signal<boolean>(false);
  readonly isEditingItem = signal<boolean>(false);
  readonly showImportModal = signal<boolean>(false);
  readonly isModalClosing = signal<boolean>(false);

  // Lightbox Preview
  readonly lightboxImage = signal<{ url: string; title: string } | null>(null);

  // Presets
  readonly iconPresets = ICON_PRESETS;
  readonly tagOptions = TAG_OPTIONS;

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
    icon: 'sparkles',
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

  // --------------------------------------------------------------------------
  // Computed Signals
  // --------------------------------------------------------------------------
  readonly totalCategoriesCount = computed(() => this.catalog().length);

  readonly totalItemsCount = computed(() =>
    this.catalog().reduce((acc, cat) => acc + (cat.items?.length || 0), 0),
  );

  readonly isFiltered = computed(() => {
    return (
      this.searchQuery().trim() !== '' ||
      this.categoryFilter() !== 'all' ||
      this.tagFilter() !== 'all' ||
      this.attributeFilter() !== 'all'
    );
  });

  readonly connectedDropLists = computed(() =>
    this.catalog().map((cat) => 'items-list-' + cat.id),
  );

  readonly filteredCatalog = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const catF = this.categoryFilter();
    const tagF = this.tagFilter();
    const attrF = this.attributeFilter();

    return this.catalog()
      .filter((cat) => catF === 'all' || cat.slug === catF)
      .map((cat) => {
        const filteredItems = (cat.items || []).filter((item) => {
          if (query) {
            const nameMatch = item.name.toLowerCase().includes(query);
            const descMatch = item.description?.toLowerCase().includes(query);
            const tagMatch = item.tags.some((t) => t.toLowerCase().includes(query));
            const catMatch = cat.name.toLowerCase().includes(query);
            if (!nameMatch && !descMatch && !tagMatch && !catMatch) return false;
          }

          if (tagF !== 'all' && !item.tags.includes(tagF)) {
            return false;
          }

          if (attrF === 'preparation' && !item.isPreparation) {
            return false;
          }
          if (attrF === 'toBuy' && !item.toBuy) {
            return false;
          }
          if (attrF === 'withPhoto' && !item.imageUrl) {
            return false;
          }

          return true;
        });

        return {
          ...cat,
          filteredItems,
        };
      })
      .filter(
        (cat) =>
          cat.filteredItems.length > 0 ||
          (query === '' && tagF === 'all' && attrF === 'all'),
      );
  });

  readonly parentGroups = computed(() => {
    const set = new Set<string>();
    for (const c of this.catalog()) {
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
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api.getCatalog().subscribe({
      next: (data) => {
        this.catalog.set(data);

        // Sections must be collapsed by default in domain manager
        const currentCollapsed = { ...this.collapsedCategories() };
        const newCollapsed: Record<string, boolean> = {};
        for (const cat of data) {
          newCollapsed[cat.slug] = currentCollapsed[cat.slug] ?? true;
        }
        this.collapsedCategories.set(newCollapsed);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossibile caricare il catalogo');
        this.loading.set(false);
      },
    });
  }

  // --------------------------------------------------------------------------
  // Collapse / Expand Controls
  // --------------------------------------------------------------------------
  isCategoryCollapsed(slug: string): boolean {
    if (this.searchQuery().trim()) {
      return false; // auto-expand to show search results
    }
    return this.collapsedCategories()[slug] ?? true;
  }

  toggleCategory(slug: string): void {
    const current = this.isCategoryCollapsed(slug);
    this.collapsedCategories.update((prev) => ({
      ...prev,
      [slug]: !current,
    }));
  }

  expandAll(): void {
    const map: Record<string, boolean> = {};
    for (const cat of this.catalog()) {
      map[cat.slug] = false;
    }
    this.collapsedCategories.set(map);
  }

  collapseAll(): void {
    const map: Record<string, boolean> = {};
    for (const cat of this.catalog()) {
      map[cat.slug] = true;
    }
    this.collapsedCategories.set(map);
  }

  // --------------------------------------------------------------------------
  // Drag & Drop
  // --------------------------------------------------------------------------
  onCategoryDrop(event: CdkDragDrop<CatalogCategory[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const list = [...this.catalog()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.catalog.set(list);

    const categoryIds = list.map((c) => c.id).filter((id) => id !== 'uncategorized');
    this.api.reorderCategories(categoryIds).subscribe({
      next: () => {
        this.showToast('Ordine delle sezioni aggiornato!');
      },
      error: () => {
        this.errorMessage.set('Errore nel salvataggio dell\'ordine delle sezioni');
        this.loadCatalog();
      },
    });
  }

  onItemDrop(event: CdkDragDrop<CatalogItem[]>, targetCategory: CatalogCategory): void {
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;

      const items = [...targetCategory.items];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      targetCategory.items = items;
      this.catalog.set([...this.catalog()]);

      const itemIds = items.map((i) => i.id);
      this.api.reorderCategoryItems(targetCategory.id, itemIds).subscribe({
        next: () => {
          this.showToast('Ordine oggetti aggiornato!');
        },
        error: () => {
          this.errorMessage.set('Errore nel salvataggio dell\'ordine degli oggetti');
          this.loadCatalog();
        },
      });
    } else {
      const sourceCategoryId = event.item?.data?.categoryId;
      const movedItem =
        event.item?.data?.item || event.previousContainer?.data?.[event.previousIndex];

      if (event.previousContainer?.data && event.container?.data) {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      }

      if (movedItem) {
        const currentCatIds = movedItem.categoryIds || [];
        const updatedCatIds = currentCatIds.filter((id: string) => id !== sourceCategoryId);
        if (!updatedCatIds.includes(targetCategory.id)) {
          updatedCatIds.push(targetCategory.id);
        }
        movedItem.categoryIds = updatedCatIds;
        if (event.item?.data) {
          event.item.data.categoryId = targetCategory.id;
        }
      }

      this.catalog.set([...this.catalog()]);

      const targetItemIds = event.container?.data?.map((i) => i.id) || [];
      this.api
        .reorderCategoryItems(
          targetCategory.id,
          targetItemIds,
          sourceCategoryId,
        )
        .subscribe({
          next: () => {
            this.showToast(
              `"${movedItem.name}" spostato in "${targetCategory.name}"`,
            );
          },
          error: () => {
            this.errorMessage.set('Errore nello spostamento dell\'oggetto');
            this.loadCatalog();
          },
        });
    }
  }

  // --------------------------------------------------------------------------
  // Category Actions
  // --------------------------------------------------------------------------
  openCreateCategoryModal(): void {
    const nextOrder =
      (this.catalog().reduce((max, c) => Math.max(max, c.sortOrder), 0) || 0) + 1;
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

  openEditCategoryModal(cat: CatalogCategory): void {
    this.categoryForm = {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentGroup: cat.parentGroup || '',
      icon: cat.icon || 'sparkles',
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
      const catId = this.categoryForm.id;
      this.api.updateCategory(catId, dto).subscribe({
        next: (updatedCat) => {
          this.saving.set(false);
          this.closeModals();
          this.showToast('Sezione aggiornata con successo!');

          this.catalog.update((cats) =>
            cats.map((c) => {
              if (c.id === catId) {
                return {
                  ...c,
                  name: updatedCat?.name ?? dto.name,
                  slug: updatedCat?.slug ?? dto.slug ?? c.slug,
                  parentGroup: updatedCat?.parentGroup ?? dto.parentGroup ?? null,
                  icon: updatedCat?.icon ?? dto.icon ?? c.icon,
                  sortOrder: updatedCat?.sortOrder ?? dto.sortOrder ?? c.sortOrder,
                };
              }
              return c;
            }),
          );
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            err?.error?.message || 'Errore nel salvataggio della sezione',
          );
        },
      });
    } else {
      this.api.createCategory(dto).subscribe({
        next: (newCat) => {
          this.saving.set(false);
          this.closeModals();
          this.showToast('Nuova sezione creata con successo!');

          const catToAdd: CatalogCategory = {
            id: newCat.id,
            slug: newCat.slug,
            name: newCat.name,
            parentGroup: newCat.parentGroup,
            icon: newCat.icon,
            sortOrder: newCat.sortOrder,
            items: [],
          };

          this.catalog.update((cats) => [...cats, catToAdd]);
          this.collapsedCategories.update((prev) => ({
            ...prev,
            [newCat.slug]: true,
          }));
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            err?.error?.message || 'Errore nella creazione della sezione',
          );
        },
      });
    }
  }

  confirmDeleteCategory(cat: CatalogCategory): void {
    const itemsCount = cat.items?.length || 0;
    const warning =
      itemsCount > 0
        ? `Attenzione: questa sezione contiene ${itemsCount} oggetti associati.`
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
            this.catalog.update((cats) => cats.filter((c) => c.id !== cat.id));
          },
          error: () => {
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
    const preselectedCatId =
      this.categoryFilter() !== 'all'
        ? this.catalog().find((c) => c.slug === this.categoryFilter())?.id
        : this.catalog()[0]?.id;

    this.itemForm = {
      name: '',
      description: '',
      tags: [],
      defaultQuantity: 1,
      isPreparation: false,
      minDays: null,
      toBuy: false,
      imageUrl: '',
      sortOrder: 0,
      categoryIds: preselectedCatId ? [preselectedCatId] : [],
    };
    this.uploadError.set(null);
    this.isEditingItem.set(false);
    this.isModalClosing.set(false);
    this.showItemModal.set(true);
  }

  openCreateItemModalForCategory(category: CatalogCategory): void {
    this.itemForm = {
      name: '',
      description: '',
      tags: [],
      defaultQuantity: 1,
      isPreparation: false,
      minDays: null,
      toBuy: false,
      imageUrl: '',
      sortOrder: (category.items?.length || 0) + 1,
      categoryIds: [category.id],
    };
    this.uploadError.set(null);
    this.isEditingItem.set(false);
    this.isModalClosing.set(false);
    this.showItemModal.set(true);
  }

  openEditItemModal(item: CatalogItem): void {
    // If categoryIds is missing or empty, find which categories contain this item
    let catIds = item.categoryIds || [];
    if (catIds.length === 0) {
      catIds = this.catalog()
        .filter((c) => c.items?.some((i) => i.id === item.id))
        .map((c) => c.id);
    }

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
      categoryIds: [...catIds],
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
        this.uploadError.set(
          err?.error?.message || 'Errore nel caricamento dell\'immagine',
        );
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
      minDays:
        this.itemForm.minDays && this.itemForm.minDays > 0
          ? Number(this.itemForm.minDays)
          : null,
      toBuy: this.itemForm.toBuy,
      imageUrl: this.itemForm.imageUrl.trim() || null,
      sortOrder: Number(this.itemForm.sortOrder) || 0,
      categoryIds: this.itemForm.categoryIds,
    };

    if (this.isEditingItem() && this.itemForm.id) {
      const itemId = this.itemForm.id;
      this.api.updateItem(itemId, dto).subscribe({
        next: (updatedItem) => {
          this.saving.set(false);
          this.closeModals();
          this.showToast('Oggetto aggiornato con successo!');

          const targetCategoryIds =
            updatedItem?.categoryIds || dto.categoryIds || [];

          this.catalog.update((cats) =>
            cats.map((cat) => {
              const shouldBeInCat = targetCategoryIds.includes(cat.id);
              const isCurrentlyInCat = (cat.items || []).some((i) => i.id === itemId);

              if (shouldBeInCat && isCurrentlyInCat) {
                return {
                  ...cat,
                  items: cat.items.map((i) =>
                    i.id === itemId
                      ? {
                          ...i,
                          name: updatedItem?.name ?? dto.name,
                          description:
                            updatedItem?.description !== undefined
                              ? updatedItem.description
                              : (dto.description ?? null),
                          tags: Array.isArray(updatedItem?.tags)
                            ? updatedItem.tags
                            : (Array.isArray(dto.tags) ? dto.tags : i.tags),
                          defaultQuantity:
                            updatedItem?.defaultQuantity ?? dto.defaultQuantity ?? 1,
                          isPreparation:
                            updatedItem?.isPreparation ?? Boolean(dto.isPreparation),
                          minDays:
                            updatedItem?.minDays !== undefined
                              ? updatedItem.minDays
                              : (dto.minDays ?? null),
                          toBuy: updatedItem?.toBuy ?? Boolean(dto.toBuy),
                          imageUrl:
                            updatedItem?.imageUrl !== undefined
                              ? updatedItem.imageUrl
                              : (dto.imageUrl ?? null),
                          sortOrder:
                            updatedItem?.sortOrder ?? dto.sortOrder ?? i.sortOrder,
                          categoryIds: targetCategoryIds,
                        }
                      : i,
                  ),
                };
              } else if (shouldBeInCat && !isCurrentlyInCat) {
                const itemToAdd: CatalogItem = {
                  id: itemId,
                  name: updatedItem?.name ?? dto.name,
                  description: updatedItem?.description ?? dto.description ?? null,
                  tags: Array.isArray(updatedItem?.tags)
                    ? updatedItem.tags
                    : (Array.isArray(dto.tags) ? dto.tags : []),
                  defaultQuantity:
                    updatedItem?.defaultQuantity ?? dto.defaultQuantity ?? 1,
                  isPreparation:
                    updatedItem?.isPreparation ?? Boolean(dto.isPreparation),
                  minDays: updatedItem?.minDays ?? dto.minDays ?? null,
                  toBuy: updatedItem?.toBuy ?? Boolean(dto.toBuy),
                  imageUrl: updatedItem?.imageUrl ?? dto.imageUrl ?? null,
                  sortOrder:
                    updatedItem?.sortOrder ?? dto.sortOrder ?? (cat.items?.length || 0) + 1,
                  categoryIds: targetCategoryIds,
                };
                return {
                  ...cat,
                  items: [...(cat.items || []), itemToAdd],
                };
              } else if (!shouldBeInCat && isCurrentlyInCat) {
                return {
                  ...cat,
                  items: (cat.items || []).filter((i) => i.id !== itemId),
                };
              }
              return cat;
            }),
          );
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            err?.error?.message || 'Errore nel salvataggio dell\'oggetto',
          );
        },
      });
    } else {
      this.api.createItem(dto).subscribe({
        next: (createdItem) => {
          this.saving.set(false);
          this.closeModals();
          this.showToast('Nuovo oggetto creato con successo!');

          const targetCategoryIds =
            createdItem?.categoryIds || dto.categoryIds || [];

          const itemToAdd: CatalogItem = {
            id: createdItem?.id || 'item-' + Date.now(),
            name: createdItem?.name ?? dto.name,
            description: createdItem?.description ?? dto.description ?? null,
            tags: Array.isArray(createdItem?.tags)
              ? createdItem.tags
              : (Array.isArray(dto.tags) ? dto.tags : []),
            defaultQuantity:
              createdItem?.defaultQuantity ?? dto.defaultQuantity ?? 1,
            isPreparation:
              createdItem?.isPreparation ?? Boolean(dto.isPreparation),
            minDays: createdItem?.minDays ?? dto.minDays ?? null,
            toBuy: createdItem?.toBuy ?? Boolean(dto.toBuy),
            imageUrl: createdItem?.imageUrl ?? dto.imageUrl ?? null,
            sortOrder: createdItem?.sortOrder ?? dto.sortOrder ?? 0,
            categoryIds: targetCategoryIds,
          };

          this.catalog.update((cats) =>
            cats.map((cat) => {
              if (targetCategoryIds.includes(cat.id)) {
                return {
                  ...cat,
                  items: [...(cat.items || []), itemToAdd],
                };
              }
              return cat;
            }),
          );
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            err?.error?.message || 'Errore nella creazione dell\'oggetto',
          );
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
            this.catalog.update((cats) =>
              cats.map((cat) => ({
                ...cat,
                items: (cat.items || []).filter((i) => i.id !== item.id),
              })),
            );
          },
          error: () => {
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

  openImportModal(): void {
    this.importFile = null;
    this.importPreview = null;
    this.importError.set(null);
    this.importMode = 'merge';
    this.isModalClosing.set(false);
    this.showImportModal.set(true);
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
        if (
          !json ||
          !Array.isArray(json.categories) ||
          !Array.isArray(json.items)
        ) {
          this.importError.set(
            'File JSON non valido. Deve contenere array "categories" e "items".',
          );
          this.importFile = null;
          return;
        }
        this.importPreview = {
          categoriesCount: json.categories.length,
          itemsCount: json.items.length,
        };
      } catch {
        this.importError.set(
          'Impossibile interpretare il file JSON. Assicurati che sia formattato correttamente.',
        );
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
              this.showImportModal.set(false);
              this.showToast(
                `Importazione completata con successo! (${res.importedCategories} sezioni, ${res.importedItems} oggetti)`,
              );
              this.loadCatalog();
            },
            error: (err) => {
              this.importing.set(false);
              this.importError.set(
                err?.error?.message || 'Errore durante l\'importazione',
              );
            },
          });
      } catch {
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
      this.showImportModal.set(false);
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
