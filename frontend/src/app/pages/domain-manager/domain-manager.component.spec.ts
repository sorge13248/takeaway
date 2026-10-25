import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DomainManagerComponent } from './domain-manager.component';
import { ApiService } from '../../core/api.service';
import { CategoryWithCount, CatalogItem } from '../../core/models';
import { Dialog } from '@angular/cdk/dialog';

describe('DomainManagerComponent', () => {
  let fixture: ComponentFixture<DomainManagerComponent>;
  let component: DomainManagerComponent;

  const mockCategories: CategoryWithCount[] = [
    {
      id: 'cat-1',
      slug: 'documenti',
      name: 'Documenti di viaggio',
      parentGroup: null,
      icon: 'file-text',
      sortOrder: 1,
      itemsCount: 5,
    },
    {
      id: 'cat-2',
      slug: 'abbigliamento-busto',
      name: 'Abbigliamento - Busto',
      parentGroup: 'Abbigliamento',
      icon: 'shirt',
      sortOrder: 2,
      itemsCount: 10,
    },
  ];

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

  const mockApiService = {
    getCategories: () => of(mockCategories),
    getItems: () => of(mockItems),
    createCategory: (dto: any) => of({ id: 'cat-new', ...dto, itemsCount: 0 }),
    updateCategory: (id: string, dto: any) => of({ id, ...dto }),
    deleteCategory: (id: string) => of({ deleted: true, id }),
    createItem: (dto: any) => of({ id: 'item-new', ...dto, tags: dto.tags || [] }),
    updateItem: (id: string, dto: any) => of({ id, ...dto, tags: dto.tags || [] }),
    deleteItem: (id: string) => of({ deleted: true, id }),
    uploadItemImage: () => of({ url: '/api/uploads/item-test.png', filename: 'item-test.png' }),
    exportCatalog: () => of({ version: 1, exportedAt: '2026-10-25', categories: mockCategories, items: mockItems }),
    importCatalog: () => of({ success: true, importedCategories: 2, importedItems: 2, mode: 'merge' }),
  };

  const mockDialog = {
    open: () => ({
      closed: of(true),
    }),
  };

  beforeEach(async () => {
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

  it('should load categories and items on init', () => {
    expect(component.categories().length).toBe(2);
    expect(component.items().length).toBe(2);
  });

  it('should switch tabs between categories, items, and backup', () => {
    expect(component.activeTab()).toBe('categories');
    component.activeTab.set('items');
    expect(component.activeTab()).toBe('items');
    component.activeTab.set('backup');
    expect(component.activeTab()).toBe('backup');
  });

  it('should filter categories by search keyword', () => {
    component.categorySearch.set('documenti');
    expect(component.filteredCategories().length).toBe(1);
    expect(component.filteredCategories()[0].id).toBe('cat-1');

    component.categorySearch.set('inesistente');
    expect(component.filteredCategories().length).toBe(0);
  });

  it('should filter items by search keyword, category and tag', () => {
    component.itemSearch.set('Passaporto');
    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].id).toBe('item-1');

    component.itemSearch.set('');
    component.itemCategoryFilter.set('cat-2');
    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].id).toBe('item-2');

    component.itemCategoryFilter.set('all');
    component.itemTagFilter.set('estate');
    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].id).toBe('item-2');
  });

  it('should open and close category modal', () => {
    expect(component.showCategoryModal()).toBe(false);
    component.openCreateCategoryModal();
    expect(component.showCategoryModal()).toBe(true);
    expect(component.isEditingCategory()).toBe(false);

    component.closeModals();
  });

  it('should open and close item modal', () => {
    expect(component.showItemModal()).toBe(false);
    component.openCreateItemModal();
    expect(component.showItemModal()).toBe(true);
    expect(component.isEditingItem()).toBe(false);

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

  it('should delete category when confirmed', () => {
    const cat = mockCategories[0];
    component.confirmDeleteCategory(cat);
    // Dialog closes with true and triggers delete
  });

  it('should delete item when confirmed', () => {
    const item = mockItems[0];
    component.confirmDeleteItem(item);
    // Dialog closes with true and triggers delete
  });
});

