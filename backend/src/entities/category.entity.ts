import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { CategoryItem } from './category-item.entity.js';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  slug!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  parentGroup!: string | null;

  @Column({ type: 'varchar', default: 'list' })
  icon!: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  @OneToMany('CategoryItem', 'category')
  categoryItems!: CategoryItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

