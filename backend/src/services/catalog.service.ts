import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Category } from '../entities/category.entity.js';
import { Item } from '../entities/item.entity.js';

@Injectable()
export class CatalogService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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

  async getAllItems(): Promise<Item[]> {
    return this.dataSource.getRepository(Item).find({
      order: { sortOrder: 'ASC' },
    });
  }

  private parseTags(tags: string): string[] {
    try {
      return JSON.parse(tags) as string[];
    } catch {
      return [];
    }
  }
}

