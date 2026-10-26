import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Category } from './category.entity.js';
import type { Item } from './item.entity.js';
import type { User } from './user.entity.js';

@Entity({ name: 'category_items' })
@Unique(['categoryId', 'itemId'])
@Index(['userId'])
@Index(['categoryId'])
@Index(['itemId'])
export class CategoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  categoryId!: string;

  @Column({ type: 'varchar' })
  itemId!: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user?: User;

  @ManyToOne('Category', 'categoryItems', { onDelete: 'CASCADE' })
  category!: Category;

  @ManyToOne('Item', 'categoryItems', { onDelete: 'CASCADE' })
  item!: Item;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
