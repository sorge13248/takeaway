import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DomainManagerComponent } from './domain-manager.component';
import { ApiService } from '../../core/api.service';
import { CatalogCategory, CatalogItem } from '../../core/models';
import { Dialog } from '@angular/cdk/dialog';

describe('DomainManagerComponent', () => {
  let fixture: ComponentFixture<DomainManagerComponent>;
  let component: DomainManagerComponent;
  let mockCatalog: CatalogCategory[];

  const mockItems: CatalogItem[] = [
    {
      id: 'item-1',
      name: 'Passaporto',
      description: 'Verificare scadenza',
      tags: ['aereo'],
      defaultQuantity: 1,
      isPreparation: true,
      minDays: null,
      toBuy: false,
      imageUrl: null,
      sortOrder: 1,
      categoryIds: ['cat-1'],
      categories: [{ id: 'cat-1', slug: 'documenti', name: 'Documenti di viaggio', icon: 'file-text' }],
    },
    {
      id: 'item-2',
      name: 'T-Shirt cotone',
      description: null,
      tags: ['estate'],
      defaultQuantity: 3,
      isPreparation: false,
      minDays: null,
      toBuy: false,
      imageUrl: 'http://localhost/test.jpg',
      sortOrder: 2,
      categoryIds: ['cat-2'],
      categories: [{ id: 'cat-2', slug: 'abbigliamento-busto', name: 'Abbigliamento - Busto', icon: 'shirt' }],
    },
  ];

  const getMockCatalog = (): CatalogCategory[] => [
    {
      id: 'cat-1',
      slug: 'documenti',
      name: 'Documenti di viaggio',
      parentGroup: null,
      icon: 'file-text',
      sortOrder: 1,
      items: [
        {
          id: 'item-1',
          name: 'Passaporto',
          description: 'Verificare scadenza',
          tags: ['aereo'],
          defaultQuantity: 1,
          isPreparation: true,
          minDays: null,
          toBuy: false,
          imageUrl: null,
          sortOrder: 1,
          categoryIds: ['cat-1'],
          categories: [{ id: 'cat-1', slug: 'documenti', name: 'Documenti di viaggio', icon: 'file-text' }],
        },
      ],
    },
    {
      id: 'cat-2',
      slug: 'abbigliamento-busto',
      name: 'Abbigliamento - Busto',
      parentGroup: 'Abbigliamento',
      icon: 'shirt',
      sortOrder: 2,
      items: [
        {
          id: 'item-2',
          name: 'T-Shirt cotone',
          description: null,
          tags: ['estate'],
          defaultQuantity: 3,
          isPreparation: false,
          minDays: null,
          toBuy: false,
          imageUrl: 'http://localhost/test.jpg',
          sortOrder: 2,
          categoryIds: ['cat-2'],
          categories: [{ id: 'cat-2', slug: 'abbigliamento-busto', name: 'Abbigliamento - Busto', icon: 'shirt' }],
        },
      ],
    },
  ];

  const mockApiService = {
    getCatalog: () => of(getMockCatalog()),
    getCategories: () => of([]),
    getItems: () => of(mockItems),
    createCategory: (dto: any) => of({ id: 'cat-new', ...dto, items: [] }),
    updateCategory: (id: string, dto: any) => of({ id, ...dto }),
    deleteCategory: (id: string) => of({ deleted: true, id }),
    createItem: (dto: any) => of({ id: 'item-new', ...dto, tags: dto.tags || [] }),
    updateItem: (id: string, dto: any) => of({ id, ...dto, tags: dto.tags || [], categoryIds: dto.categoryIds || [] }),
    deleteItem: (id: string) => of({ deleted: true, id }),
    reorderCategories: () => of({ success: true }),
    reorderCategoryItems: () => of({ success: true }),
    uploadItemImage: () => of({ url: '/api/uploads/item-test.png', filename: 'item-test.png' }),
    exportCatalog: () => of({ version: 1, exportedAt: '2026-10-25', categories: getMockCatalog(), items: mockItems }),
    importCatalog: () => of({ success: true, importedCategories: 2, importedItems: 2, mode: 'merge' }),
  };

  const mockDialog = {
    open: () => ({
      closed: of(true),
    }),
  };

  beforeEach(async () => {
    mockCatalog = getMockCatalog();
    await TestBed.configureTestingModule({
      imports: [DomainManagerComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
        { provide: Dialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DomainManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create DomainManagerComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should load catalog on init and calculate total items and categories', () => {
    expect(component.catalog().length).toBe(2);
    expect(component.totalCategoriesCount()).toBe(2);
    expect(component.totalItemsCount()).toBe(2);
  });

  it('should have all categories collapsed by default on init (only in domain manager)', () => {
    expect(component.isCategoryCollapsed('documenti')).toBe(true);
    expect(component.isCategoryCollapsed('abbigliamento-busto')).toBe(true);
  });

  it('should toggle category collapse state', () => {
    expect(component.isCategoryCollapsed('documenti')).toBe(true);
    component.toggleCategory('documenti');
    expect(component.isCategoryCollapsed('documenti')).toBe(false);
    component.toggleCategory('documenti');
    expect(component.isCategoryCollapsed('documenti')).toBe(true);
  });

  it('should expand and collapse all categories', () => {
    component.expandAll();
    expect(component.isCategoryCollapsed('documenti')).toBe(false);
    expect(component.isCategoryCollapsed('abbigliamento-busto')).toBe(false);

    component.collapseAll();
    expect(component.isCategoryCollapsed('documenti')).toBe(true);
    expect(component.isCategoryCollapsed('abbigliamento-busto')).toBe(true);
  });

  it('should filter categories and items by search query', () => {
    component.searchQuery.set('Passaporto');
    expect(component.filteredCatalog().length).toBe(1);
    expect(component.filteredCatalog()[0].id).toBe('cat-1');
    expect(component.filteredCatalog()[0].filteredItems.length).toBe(1);

    component.searchQuery.set('inesistente');
    expect(component.filteredCatalog().length).toBe(0);
  });

  it('should filter items by category dropdown', () => {
    component.categoryFilter.set('abbigliamento-busto');
    expect(component.filteredCatalog().length).toBe(1);
    expect(component.filteredCatalog()[0].id).toBe('cat-2');
  });

  it('should filter items by tag and attribute', () => {
    component.tagFilter.set('estate');
    expect(component.filteredCatalog()[0].filteredItems.length).toBe(1);
    expect(component.filteredCatalog()[0].filteredItems[0].id).toBe('item-2');

    component.tagFilter.set('all');
    component.attributeFilter.set('preparation');
    expect(component.filteredCatalog()[0].filteredItems.length).toBe(1);
    expect(component.filteredCatalog()[0].filteredItems[0].id).toBe('item-1');
  });

  it('should open and close category modal', () => {
    expect(component.showCategoryModal()).toBe(false);
    component.openCreateCategoryModal();
    expect(component.showCategoryModal()).toBe(true);
    expect(component.isEditingCategory()).toBe(false);

    component.openEditCategoryModal(mockCatalog[0]);
    expect(component.showCategoryModal()).toBe(true);
    expect(component.isEditingCategory()).toBe(true);
    expect(component.categoryForm.name).toBe('Documenti di viaggio');

    component.closeModals();
  });

  it('should open and close item modal', () => {
    expect(component.showItemModal()).toBe(false);
    component.openCreateItemModal();
    expect(component.showItemModal()).toBe(true);
    expect(component.isEditingItem()).toBe(false);

    component.openEditItemModal(mockItems[0]);
    expect(component.showItemModal()).toBe(true);
    expect(component.isEditingItem()).toBe(true);
    expect(component.itemForm.name).toBe('Passaporto');

    component.closeModals();
  });

  it('should toggle item tags and categories in item form', () => {
    component.itemForm.tags = [];
    component.toggleTag('estate');
    expect(component.itemForm.tags).toContain('estate');
    component.toggleTag('estate');
    expect(component.itemForm.tags).not.toContain('estate');

    component.itemForm.categoryIds = [];
    component.toggleCategoryLink('cat-1');
    expect(component.itemForm.categoryIds).toContain('cat-1');
    component.toggleCategoryLink('cat-1');
    expect(component.itemForm.categoryIds).not.toContain('cat-1');
  });

  it('should open and close import modal', () => {
    expect(component.showImportModal()).toBe(false);
    component.openImportModal();
    expect(component.showImportModal()).toBe(true);
    component.closeModals();
  });

  it('should handle category drag and drop reordering', () => {
    const event = {
      previousIndex: 0,
      currentIndex: 1,
    } as any;
    component.onCategoryDrop(event);
    expect(component.catalog()[0].id).toBe('cat-2');
  });

  it('should handle item drag and drop reordering within the same category', () => {
    const cat = { ...mockCatalog[0], items: [...mockItems] };
    const event = {
      item: { data: { item: cat.items[0], categoryId: cat.id } },
      previousContainer: { data: cat.items },
      container: { data: cat.items },
      previousIndex: 0,
      currentIndex: 1,
    } as any;
    component.onItemDrop(event, cat);
    expect(cat.items[0].id).toBe('item-2');
  });

  it('should handle item drag and drop moving to another category', () => {
    const sourceCat = { ...mockCatalog[0], items: [mockItems[0]] };
    const targetCat = { ...mockCatalog[1], items: [mockItems[1]] };
    const event = {
      item: { data: { item: sourceCat.items[0], categoryId: sourceCat.id } },
      previousContainer: { data: sourceCat.items },
      container: { data: targetCat.items },
      previousIndex: 0,
      currentIndex: 1,
    } as any;
    component.onItemDrop(event, targetCat);
    expect(targetCat.items.length).toBe(2);
    expect(targetCat.items[1].id).toBe('item-1');
  });

  it('should delete category when confirmed and update list in place without reload', () => {
    const cat = mockCatalog[0];
    component.confirmDeleteCategory(cat);
    expect(component.catalog().some((c) => c.id === cat.id)).toBe(false);
  });

  it('should delete item when confirmed and update list in place without reload', () => {
    const item = mockItems[0];
    component.confirmDeleteItem(item);
    const hasItem = component.catalog().some((c) => c.items.some((i) => i.id === item.id));
    expect(hasItem).toBe(false);
  });

  it('should update category in place without reloading entire catalog', () => {
    component.openEditCategoryModal(mockCatalog[0]);
    component.categoryForm.name = 'Documenti Modificati';
    component.saveCategory();

    const updated = component.catalog().find((c) => c.id === mockCatalog[0].id);
    expect(updated?.name).toBe('Documenti Modificati');
  });

  it('should update item in place without reloading entire catalog', () => {
    const itemToEdit = component.catalog()[0].items[0];
    component.openEditItemModal(itemToEdit);
    component.itemForm.name = 'Passaporto Rinnovato';
    component.saveItem();

    const updatedCat = component.catalog().find((c) => c.id === 'cat-1');
    const updatedItem = updatedCat?.items.find((i) => i.id === 'item-1');
    expect(updatedItem?.name).toBe('Passaporto Rinnovato');
  });
});
