import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CategoryItem } from './category-item.entity.js';
import type { User } from './user.entity.js';

@Entity({ name: 'items' })
@Index(['userId'])
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', default: '[]' })
  tags!: string;

  @Column({ type: 'integer', default: 1 })
  defaultQuantity!: number;

  @Column({ type: 'boolean', default: false })
  isPreparation!: boolean;

  @Column({ type: 'integer', nullable: true })
  minDays!: number | null;

  @Column({ type: 'boolean', default: false })
  toBuy!: boolean;

  @Column({ type: 'varchar', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user?: User;

  @OneToMany('CategoryItem', 'item')
  categoryItems!: CategoryItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
