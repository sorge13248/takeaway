import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { TripItemState } from './trip-item-state.entity.js';

@Entity({ name: 'trips' })
@Index(['userId'])
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar', nullable: true })
  destination!: string | null;

  @Column({ type: 'varchar', nullable: true })
  startDate!: string | null;

  @Column({ type: 'varchar', nullable: true })
  endDate!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'boolean', default: false })
  isArchived!: boolean;

  @OneToMany('TripItemState', 'trip', { cascade: true })
  itemStates!: TripItemState[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

