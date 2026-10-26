import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from '../services/catalog.service.js';
import { BadRequestException } from '@nestjs/common';
import type { AuthUser } from '../common/auth/auth.types.js';

describe('CatalogController', () => {
  let controller: CatalogController;
  let catalogService: Partial<CatalogService>;

  const mockUser: AuthUser = {
    id: 'user-123',
    subject: 'sub-123',
    email: 'user@example.com',
    displayName: 'Test User',
    pictureUrl: null,
  };

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
      reorderCategories: vi.fn().mockResolvedValue({ success: true }),
      reorderCategoryItems: vi.fn().mockResolvedValue({ success: true }),
    };

    controller = new CatalogController(catalogService as CatalogService);
  });

  it('getCatalog should delegate to service with user id', async () => {
    await controller.getCatalog(mockUser);
    expect(catalogService.getCatalog).toHaveBeenCalledWith(mockUser.id);
  });

  it('getCategories should delegate to service with user id', async () => {
    await controller.getCategories(mockUser);
    expect(catalogService.getCategoriesWithCounts).toHaveBeenCalledWith(mockUser.id);
  });

  it('createCategory should delegate to service with user id and dto', async () => {
    await controller.createCategory(mockUser, { name: 'New Cat' });
    expect(catalogService.createCategory).toHaveBeenCalledWith(mockUser.id, { name: 'New Cat' });
  });

  it('updateCategory should delegate to service with user id, cat id and dto', async () => {
    await controller.updateCategory(mockUser, 'cat-1', { name: 'Updated' });
    expect(catalogService.updateCategory).toHaveBeenCalledWith(mockUser.id, 'cat-1', { name: 'Updated' });
  });

  it('deleteCategory should delegate to service with user id and cat id', async () => {
    await controller.deleteCategory(mockUser, 'cat-1');
    expect(catalogService.deleteCategory).toHaveBeenCalledWith(mockUser.id, 'cat-1');
  });

  it('getItems should delegate to service with user id', async () => {
    await controller.getItems(mockUser);
    expect(catalogService.getAllItemsDetailed).toHaveBeenCalledWith(mockUser.id);
  });

  it('createItem should delegate to service with user id and dto', async () => {
    await controller.createItem(mockUser, { name: 'New Item' });
    expect(catalogService.createItem).toHaveBeenCalledWith(mockUser.id, { name: 'New Item' });
  });

  it('uploadImage should throw if no file provided', () => {
    expect(() => controller.uploadImage(mockUser, undefined)).toThrow(BadRequestException);
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
    const res = controller.uploadImage(mockUser, file);
    expect(res).toEqual({
      url: '/api/uploads/item-test-123.png',
      filename: 'item-test-123.png',
      originalName: 'test.png',
      size: 1024,
    });
  });

  it('exportCatalog should delegate to service with user id', async () => {
    await controller.exportCatalog(mockUser);
    expect(catalogService.exportCatalog).toHaveBeenCalledWith(mockUser.id);
  });

  it('importCatalog should delegate to service with user id and payload', async () => {
    const payload = { categories: [], items: [] };
    await controller.importCatalog(mockUser, payload);
    expect(catalogService.importCatalog).toHaveBeenCalledWith(mockUser.id, payload);
  });

  it('reorderCategories should delegate to service with user id and categoryIds', async () => {
    const categoryIds = ['cat-1', 'cat-2'];
    await controller.reorderCategories(mockUser, { categoryIds });
    expect(catalogService.reorderCategories).toHaveBeenCalledWith(mockUser.id, categoryIds);
  });

  it('reorderCategoryItems should delegate to service with user id, categoryId, itemIds, and sourceCategoryId', async () => {
    const itemIds = ['item-1', 'item-2'];
    await controller.reorderCategoryItems(mockUser, 'cat-1', { itemIds, sourceCategoryId: 'cat-2' });
    expect(catalogService.reorderCategoryItems).toHaveBeenCalledWith(
      mockUser.id,
      'cat-1',
      itemIds,
      'cat-2',
    );
  });
});
