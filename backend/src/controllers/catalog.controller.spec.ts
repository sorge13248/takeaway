import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from '../services/catalog.service.js';
import { BadRequestException } from '@nestjs/common';

describe('CatalogController', () => {
  let controller: CatalogController;
  let catalogService: Partial<CatalogService>;

  beforeEach(() => {
    catalogService = {
      getCatalog: vi.fn().mockResolvedValue([]),
      getCategoriesWithCounts: vi.fn().mockResolvedValue([]),
      getCategoryById: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Cat 1' }),
      createCategory: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Cat 1' }),
      updateCategory: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Cat 1 Updated' }),
      deleteCategory: vi.fn().mockResolvedValue({ deleted: true, id: 'cat-1' }),
      getAllItemsDetailed: vi.fn().mockResolvedValue([]),
      getItemById: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Item 1' }),
      createItem: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Item 1' }),
      updateItem: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Item 1 Updated' }),
      deleteItem: vi.fn().mockResolvedValue({ deleted: true, id: 'item-1' }),
      exportCatalog: vi.fn().mockResolvedValue({ version: 1, categories: [], items: [] }),
      importCatalog: vi.fn().mockResolvedValue({ success: true, importedCategories: 0, importedItems: 0 }),
    };

    controller = new CatalogController(catalogService as CatalogService);
  });

  it('getCatalog should delegate to service', async () => {
    await controller.getCatalog();
    expect(catalogService.getCatalog).toHaveBeenCalled();
  });

  it('getCategories should delegate to service', async () => {
    await controller.getCategories();
    expect(catalogService.getCategoriesWithCounts).toHaveBeenCalled();
  });

  it('createCategory should delegate to service', async () => {
    await controller.createCategory({ name: 'New Cat' });
    expect(catalogService.createCategory).toHaveBeenCalledWith({ name: 'New Cat' });
  });

  it('updateCategory should delegate to service', async () => {
    await controller.updateCategory('cat-1', { name: 'Updated' });
    expect(catalogService.updateCategory).toHaveBeenCalledWith('cat-1', { name: 'Updated' });
  });

  it('deleteCategory should delegate to service', async () => {
    await controller.deleteCategory('cat-1');
    expect(catalogService.deleteCategory).toHaveBeenCalledWith('cat-1');
  });

  it('getItems should delegate to service', async () => {
    await controller.getItems();
    expect(catalogService.getAllItemsDetailed).toHaveBeenCalled();
  });

  it('createItem should delegate to service', async () => {
    await controller.createItem({ name: 'New Item' });
    expect(catalogService.createItem).toHaveBeenCalledWith({ name: 'New Item' });
  });

  it('uploadImage should throw if no file provided', () => {
    expect(() => controller.uploadImage(undefined)).toThrow(BadRequestException);
  });

  it('uploadImage should return url and filename if file provided', () => {
    const file = {
      fieldname: 'file',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      destination: '/uploads',
      filename: 'item-test-123.png',
      path: '/uploads/item-test-123.png',
    };
    const res = controller.uploadImage(file);
    expect(res).toEqual({
      url: '/api/uploads/item-test-123.png',
      filename: 'item-test-123.png',
      originalName: 'test.png',
      size: 1024,
    });
  });

  it('exportCatalog should delegate to service', async () => {
    await controller.exportCatalog();
    expect(catalogService.exportCatalog).toHaveBeenCalled();
  });

  it('importCatalog should delegate to service', async () => {
    const payload = { categories: [], items: [] };
    await controller.importCatalog(payload);
    expect(catalogService.importCatalog).toHaveBeenCalledWith(payload);
  });
});

