import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { Trip } from './trip.entity.js';
import type { Item } from './item.entity.js';

@Entity({ name: 'trip_item_states' })
@Unique(['tripId', 'itemId'])
@Index(['tripId'])
@Index(['itemId'])
export class TripItemState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  tripId!: string;

  @Column({ type: 'varchar' })
  itemId!: string;

  @Column({ type: 'integer', nullable: true })
  quantity!: number | null;

  @Column({ type: 'varchar', default: 'none' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @ManyToOne('Trip', 'itemStates', { onDelete: 'CASCADE' })
  trip!: Trip;

  @ManyToOne('Item', { onDelete: 'CASCADE' })
  item!: Item;

  @UpdateDateColumn()
  updatedAt!: Date;
}

