import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { CategoryItem } from './category-item.entity.js';
import type { User } from './user.entity.js';

@Entity({ name: 'categories' })
@Unique(['userId', 'slug'])
@Index(['userId'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  slug!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  parentGroup!: string | null;

  @Column({ type: 'varchar', default: 'list' })
  icon!: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user?: User;

  @OneToMany('CategoryItem', 'category')
  categoryItems!: CategoryItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
