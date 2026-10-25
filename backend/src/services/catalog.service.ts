import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Category } from '../entities/category.entity.js';
import { Item } from '../entities/item.entity.js';
import { CategoryItem } from '../entities/category-item.entity.js';

export class CreateCategoryDto {
  name!: string;
  slug?: string;
  parentGroup?: string | null;
  icon?: string;
  sortOrder?: number;
}

export class UpdateCategoryDto {
  name?: string;
  slug?: string;
  parentGroup?: string | null;
  icon?: string;
  sortOrder?: number;
}

export class CreateItemDto {
  name!: string;
  description?: string | null;
  tags?: string[] | string;
  defaultQuantity?: number;
  isPreparation?: boolean;
  minDays?: number | null;
  toBuy?: boolean;
  imageUrl?: string | null;
  sortOrder?: number;
  categoryIds?: string[];
}

export class UpdateItemDto {
  name?: string;
  description?: string | null;
  tags?: string[] | string;
  defaultQuantity?: number;
  isPreparation?: boolean;
  minDays?: number | null;
  toBuy?: boolean;
  imageUrl?: string | null;
  sortOrder?: number;
  categoryIds?: string[];
}

export class ImportCatalogCategoryDto {
  id?: string;
  slug?: string;
  name!: string;
  parentGroup?: string | null;
  icon?: string;
  sortOrder?: number;
}

export class ImportCatalogItemDto {
  id?: string;
  name!: string;
  description?: string | null;
  tags?: string[] | string;
  defaultQuantity?: number;
  isPreparation?: boolean;
  minDays?: number | null;
  toBuy?: boolean;
  imageUrl?: string | null;
  sortOrder?: number;
  categoryIds?: string[];
  categorySlugs?: string[];
}

export class ImportCatalogDto {
  mode?: 'merge' | 'replace';
  categories!: ImportCatalogCategoryDto[];
  items!: ImportCatalogItemDto[];
}

function slugify(text: string): string {
  return (
    text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'categoria'
  );
}

@Injectable()
export class CatalogService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // --------------------------------------------------------------------------
  // Catalog View (Categories + Sorted Items)
  // --------------------------------------------------------------------------
  async getCatalog() {
    const categories = await this.dataSource.getRepository(Category).find({
      order: { sortOrder: 'ASC' },
      relations: {
        categoryItems: {
          item: true,
        },
      },
    });

    return categories.map((cat) => {
      const sortedItems = [...(cat.categoryItems || [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .filter((ci) => ci.item != null)
        .map((ci) => ci.item);

      return {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        parentGroup: cat.parentGroup,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        items: sortedItems.map((item) => ({
          ...item,
          tags: this.parseTags(item.tags),
        })),
      };
    });
  }

  // --------------------------------------------------------------------------
  // Categories CRUD
  // --------------------------------------------------------------------------
  async getCategoriesWithCounts() {
    const categories = await this.dataSource.getRepository(Category).find({
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: {
        categoryItems: true,
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      parentGroup: cat.parentGroup,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      itemsCount: cat.categoryItems?.length ?? 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));
  }

  async getCategoryById(id: string): Promise<Category> {
    const category = await this.dataSource.getRepository(Category).findOne({
      where: { id },
      relations: { categoryItems: { item: true } },
    });
    if (!category) {
      throw new NotFoundException(`Categoria con ID ${id} non trovata`);
    }
    return category;
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const categoryRepo = this.dataSource.getRepository(Category);

    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Il nome della categoria è obbligatorio');
    }

    let slug = dto.slug ? slugify(dto.slug) : slugify(name);
    // Ensure slug uniqueness
    let counter = 1;
    let baseSlug = slug;
    while (await categoryRepo.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const maxOrder = await categoryRepo
        .createQueryBuilder('cat')
        .select('MAX(cat.sortOrder)', 'max')
        .getRawOne();
      sortOrder = (maxOrder?.max ?? 0) + 1;
    }

    const category = categoryRepo.create({
      name,
      slug,
      parentGroup: dto.parentGroup?.trim() || null,
      icon: dto.icon?.trim() || 'list',
      sortOrder,
    });

    return categoryRepo.save(category);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const categoryRepo = this.dataSource.getRepository(Category);
    const category = await categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoria con ID ${id} non trovata`);
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Il nome della categoria non può essere vuoto');
      }
      category.name = name;
    }

    if (dto.slug !== undefined && dto.slug.trim()) {
      const newSlug = slugify(dto.slug);
      if (newSlug !== category.slug) {
        const existing = await categoryRepo.findOne({ where: { slug: newSlug } });
        if (existing && existing.id !== id) {
          throw new BadRequestException(`Lo slug "${newSlug}" è già utilizzato da un'altra categoria`);
        }
        category.slug = newSlug;
      }
    }

    if (dto.parentGroup !== undefined) {
      category.parentGroup = dto.parentGroup?.trim() || null;
    }

    if (dto.icon !== undefined) {
      category.icon = dto.icon.trim() || 'list';
    }

    if (dto.sortOrder !== undefined) {
      category.sortOrder = Number(dto.sortOrder) || 0;
    }

    return categoryRepo.save(category);
  }

  async deleteCategory(id: string): Promise<{ deleted: boolean; id: string }> {
    const categoryRepo = this.dataSource.getRepository(Category);
    const category = await categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoria con ID ${id} non trovata`);
    }

    await categoryRepo.remove(category);
    return { deleted: true, id };
  }

  // --------------------------------------------------------------------------
  // Items CRUD
  // --------------------------------------------------------------------------
  async getAllItemsDetailed() {
    const itemRepo = this.dataSource.getRepository(Item);
    const items = await itemRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: {
        categoryItems: {
          category: true,
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      tags: this.parseTags(item.tags),
      defaultQuantity: item.defaultQuantity,
      isPreparation: item.isPreparation,
      minDays: item.minDays,
      toBuy: item.toBuy,
      imageUrl: item.imageUrl,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      categories: (item.categoryItems || [])
        .map((ci) => ci.category)
        .filter(Boolean)
        .map((c) => ({ id: c.id, slug: c.slug, name: c.name, icon: c.icon })),
      categoryIds: (item.categoryItems || []).map((ci) => ci.categoryId),
    }));
  }

  async getAllItems(): Promise<Item[]> {
    return this.dataSource.getRepository(Item).find({
      order: { sortOrder: 'ASC' },
    });
  }

  async getItemById(id: string) {
    const item = await this.dataSource.getRepository(Item).findOne({
      where: { id },
      relations: {
        categoryItems: {
          category: true,
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Oggetto con ID ${id} non trovato`);
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      tags: this.parseTags(item.tags),
      defaultQuantity: item.defaultQuantity,
      isPreparation: item.isPreparation,
      minDays: item.minDays,
      toBuy: item.toBuy,
      imageUrl: item.imageUrl,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      categories: (item.categoryItems || [])
        .map((ci) => ci.category)
        .filter(Boolean)
        .map((c) => ({ id: c.id, slug: c.slug, name: c.name, icon: c.icon })),
      categoryIds: (item.categoryItems || []).map((ci) => ci.categoryId),
    };
  }

  async createItem(dto: CreateItemDto) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException("Il nome dell'oggetto è obbligatorio");
    }

    const itemRepo = this.dataSource.getRepository(Item);
    const catItemRepo = this.dataSource.getRepository(CategoryItem);

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const maxOrder = await itemRepo
        .createQueryBuilder('it')
        .select('MAX(it.sortOrder)', 'max')
        .getRawOne();
      sortOrder = (maxOrder?.max ?? 0) + 1;
    }

    const tagsString = Array.isArray(dto.tags)
      ? JSON.stringify(dto.tags.map((t) => t.trim()).filter(Boolean))
      : typeof dto.tags === 'string'
        ? dto.tags
        : '[]';

    const item = itemRepo.create({
      name,
      description: dto.description?.trim() || null,
      tags: tagsString,
      defaultQuantity: dto.defaultQuantity && dto.defaultQuantity > 0 ? dto.defaultQuantity : 1,
      isPreparation: Boolean(dto.isPreparation),
      minDays: dto.minDays !== undefined && dto.minDays !== null && dto.minDays > 0 ? Number(dto.minDays) : null,
      toBuy: Boolean(dto.toBuy),
      imageUrl: dto.imageUrl?.trim() || null,
      sortOrder,
    });

    const savedItem = await itemRepo.save(item);

    // Save category associations if provided
    if (Array.isArray(dto.categoryIds) && dto.categoryIds.length > 0) {
      const validCategoryIds = await this.validateCategoryIds(dto.categoryIds);
      const junctions = validCategoryIds.map((catId, idx) =>
        catItemRepo.create({
          categoryId: catId,
          itemId: savedItem.id,
          sortOrder: idx + 1,
        }),
      );
      if (junctions.length > 0) {
        await catItemRepo.save(junctions);
      }
    }

    return this.getItemById(savedItem.id);
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const itemRepo = this.dataSource.getRepository(Item);
    const catItemRepo = this.dataSource.getRepository(CategoryItem);

    const item = await itemRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Oggetto con ID ${id} non trovato`);
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException("Il nome dell'oggetto non può essere vuoto");
      }
      item.name = name;
    }

    if (dto.description !== undefined) {
      item.description = dto.description?.trim() || null;
    }

    if (dto.tags !== undefined) {
      item.tags = Array.isArray(dto.tags)
        ? JSON.stringify(dto.tags.map((t) => t.trim()).filter(Boolean))
        : typeof dto.tags === 'string'
          ? dto.tags
          : '[]';
    }

    if (dto.defaultQuantity !== undefined) {
      item.defaultQuantity = dto.defaultQuantity > 0 ? Number(dto.defaultQuantity) : 1;
    }

    if (dto.isPreparation !== undefined) {
      item.isPreparation = Boolean(dto.isPreparation);
    }

    if (dto.minDays !== undefined) {
      item.minDays = dto.minDays !== null && dto.minDays > 0 ? Number(dto.minDays) : null;
    }

    if (dto.toBuy !== undefined) {
      item.toBuy = Boolean(dto.toBuy);
    }

    if (dto.imageUrl !== undefined) {
      item.imageUrl = dto.imageUrl?.trim() || null;
    }

    if (dto.sortOrder !== undefined) {
      item.sortOrder = Number(dto.sortOrder) || 0;
    }

    await itemRepo.save(item);

    // Update categories if specified
    if (dto.categoryIds !== undefined) {
      await catItemRepo.delete({ itemId: id });

      if (Array.isArray(dto.categoryIds) && dto.categoryIds.length > 0) {
        const validCategoryIds = await this.validateCategoryIds(dto.categoryIds);
        const junctions = validCategoryIds.map((catId, idx) =>
          catItemRepo.create({
            categoryId: catId,
            itemId: id,
            sortOrder: idx + 1,
          }),
        );
        if (junctions.length > 0) {
          await catItemRepo.save(junctions);
        }
      }
    }

    return this.getItemById(id);
  }

  async deleteItem(id: string): Promise<{ deleted: boolean; id: string }> {
    const itemRepo = this.dataSource.getRepository(Item);
    const item = await itemRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Oggetto con ID ${id} non trovato`);
    }

    await itemRepo.remove(item);
    return { deleted: true, id };
  }

  // --------------------------------------------------------------------------
  // Export & Import Catalog
  // --------------------------------------------------------------------------
  async exportCatalog() {
    const categories = await this.dataSource.getRepository(Category).find({
      order: { sortOrder: 'ASC' },
    });

    const items = await this.getAllItemsDetailed();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        parentGroup: c.parentGroup,
        icon: c.icon,
        sortOrder: c.sortOrder,
      })),
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        tags: i.tags,
        defaultQuantity: i.defaultQuantity,
        isPreparation: i.isPreparation,
        minDays: i.minDays,
        toBuy: i.toBuy,
        imageUrl: i.imageUrl,
        sortOrder: i.sortOrder,
        categoryIds: i.categoryIds,
        categorySlugs: i.categories.map((c) => c.slug),
      })),
    };
  }

  async importCatalog(payload: ImportCatalogDto) {
    if (!payload || !Array.isArray(payload.categories) || !Array.isArray(payload.items)) {
      throw new BadRequestException('Formato file non valido. Devono essere presenti "categories" e "items".');
    }

    const mode = payload.mode || 'merge';

    return await this.dataSource.transaction(async (manager) => {
      const categoryRepo = manager.getRepository(Category);
      const itemRepo = manager.getRepository(Item);
      const catItemRepo = manager.getRepository(CategoryItem);

      if (mode === 'replace') {
        await manager.clear(CategoryItem);
        await manager.clear(Item);
        await manager.clear(Category);
      }

      // Map from incoming slug/id to actual category entity
      const categoryMap = new Map<string, Category>();

      // 1. Upsert categories
      for (const catData of payload.categories) {
        if (!catData.name?.trim()) continue;

        let slug = catData.slug ? slugify(catData.slug) : slugify(catData.name);
        let existing = await categoryRepo.findOne({ where: { slug } });

        if (!existing) {
          existing = categoryRepo.create({
            slug,
            name: catData.name.trim(),
            parentGroup: catData.parentGroup?.trim() || null,
            icon: catData.icon?.trim() || 'list',
            sortOrder: catData.sortOrder !== undefined ? Number(catData.sortOrder) : 0,
          });
        } else {
          existing.name = catData.name.trim();
          existing.parentGroup = catData.parentGroup?.trim() || null;
          existing.icon = catData.icon?.trim() || existing.icon;
          if (catData.sortOrder !== undefined) {
            existing.sortOrder = Number(catData.sortOrder);
          }
        }

        const savedCat = await categoryRepo.save(existing);
        categoryMap.set(savedCat.slug, savedCat);
        if (catData.id) {
          categoryMap.set(catData.id, savedCat);
        }
      }

      // 2. Upsert items
      let importedItemsCount = 0;
      for (const itemData of payload.items) {
        if (!itemData.name?.trim()) continue;

        const tagsString = Array.isArray(itemData.tags)
          ? JSON.stringify(itemData.tags.map((t) => t.trim()).filter(Boolean))
          : typeof itemData.tags === 'string'
            ? itemData.tags
            : '[]';

        const item = itemRepo.create({
          name: itemData.name.trim(),
          description: itemData.description?.trim() || null,
          tags: tagsString,
          defaultQuantity: itemData.defaultQuantity && itemData.defaultQuantity > 0 ? Number(itemData.defaultQuantity) : 1,
          isPreparation: Boolean(itemData.isPreparation),
          minDays: itemData.minDays && itemData.minDays > 0 ? Number(itemData.minDays) : null,
          toBuy: Boolean(itemData.toBuy),
          imageUrl: itemData.imageUrl?.trim() || null,
          sortOrder: itemData.sortOrder !== undefined ? Number(itemData.sortOrder) : 0,
        });

        const savedItem = await itemRepo.save(item);
        importedItemsCount++;

        // Determine category links
        const targetCategoryIds = new Set<string>();
        if (Array.isArray(itemData.categorySlugs)) {
          for (const s of itemData.categorySlugs) {
            const cat = categoryMap.get(s);
            if (cat) targetCategoryIds.add(cat.id);
          }
        }
        if (Array.isArray(itemData.categoryIds)) {
          for (const id of itemData.categoryIds) {
            const cat = categoryMap.get(id);
            if (cat) targetCategoryIds.add(cat.id);
          }
        }

        let linkOrder = 1;
        for (const catId of targetCategoryIds) {
          await catItemRepo.save(
            catItemRepo.create({
              categoryId: catId,
              itemId: savedItem.id,
              sortOrder: linkOrder++,
            }),
          );
        }
      }

      return {
        success: true,
        importedCategories: payload.categories.length,
        importedItems: importedItemsCount,
        mode,
      };
    });
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  private async validateCategoryIds(categoryIds: string[]): Promise<string[]> {
    if (!categoryIds || categoryIds.length === 0) return [];
    const validCategories = await this.dataSource.getRepository(Category).find({
      where: { id: In(categoryIds) },
      select: { id: true },
    });
    return validCategories.map((c) => c.id);
  }

  private parseTags(tags: string): string[] {
    try {
      return JSON.parse(tags) as string[];
    } catch {
      return [];
    }
  }
}
