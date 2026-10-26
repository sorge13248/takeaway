import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Trip } from '../entities/trip.entity.js';
import { TripItemState } from '../entities/trip-item-state.entity.js';
import { Item } from '../entities/item.entity.js';

export class CreateTripDto {
  title!: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

export class UpdateTripDto {
  title?: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  isArchived?: boolean;
}

export class ItemStateDto {
  quantity?: number | null;
  status?: string;
  note?: string | null;
}

@Injectable()
export class TripsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findUserTrips(userId: string) {
    const trips = await this.dataSource.getRepository(Trip).find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: { itemStates: true },
    });

    return trips.map((trip) => {
      const states = trip.itemStates || [];
      const valorizedCount = states.length;
      const packedCount = states.filter((s) => s.status === 'packed' || s.status === 'worn' || s.status === 'car').length;

      return {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        notes: trip.notes,
        isArchived: trip.isArchived,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
        valorizedCount,
        packedCount,
      };
    });
  }

  async createTrip(userId: string, dto: CreateTripDto): Promise<Trip> {
    const repo = this.dataSource.getRepository(Trip);
    const trip = repo.create({
      userId,
      title: dto.title.trim() || 'Nuovo Viaggio',
      destination: dto.destination?.trim() || null,
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
      notes: dto.notes?.trim() || null,
    });
    return repo.save(trip);
  }

  async getTripById(userId: string, tripId: string) {
    const trip = await this.dataSource.getRepository(Trip).findOne({
      where: { id: tripId },
      relations: { itemStates: true },
    });

    if (!trip) {
      throw new NotFoundException(`Viaggio con ID ${tripId} non trovato`);
    }

    if (trip.userId !== userId) {
      throw new ForbiddenException('Accesso negato al viaggio specificato');
    }

    const itemStatesMap: Record<string, { quantity: number | null; status: string; note: string | null; updatedAt: Date }> = {};
    for (const state of trip.itemStates || []) {
      itemStatesMap[state.itemId] = {
        quantity: state.quantity,
        status: state.status,
        note: state.note,
        updatedAt: state.updatedAt,
      };
    }

    return {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      notes: trip.notes,
      isArchived: trip.isArchived,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      itemStates: itemStatesMap,
    };
  }

  async updateTrip(userId: string, tripId: string, dto: UpdateTripDto) {
    const repo = this.dataSource.getRepository(Trip);
    const trip = await repo.findOne({ where: { id: tripId } });

    if (!trip) {
      throw new NotFoundException(`Viaggio con ID ${tripId} non trovato`);
    }

    if (trip.userId !== userId) {
      throw new ForbiddenException('Accesso negato al viaggio specificato');
    }

    if (dto.title !== undefined) trip.title = dto.title.trim();
    if (dto.destination !== undefined) trip.destination = dto.destination?.trim() || null;
    if (dto.startDate !== undefined) trip.startDate = dto.startDate || null;
    if (dto.endDate !== undefined) trip.endDate = dto.endDate || null;
    if (dto.notes !== undefined) trip.notes = dto.notes?.trim() || null;
    if (dto.isArchived !== undefined) trip.isArchived = dto.isArchived;

    return repo.save(trip);
  }

  async deleteTrip(userId: string, tripId: string) {
    const repo = this.dataSource.getRepository(Trip);
    const trip = await repo.findOne({ where: { id: tripId } });

    if (!trip) {
      throw new NotFoundException(`Viaggio con ID ${tripId} non trovato`);
    }

    if (trip.userId !== userId) {
      throw new ForbiddenException('Accesso negato al viaggio specificato');
    }

    await repo.remove(trip);
    return { deleted: true, id: tripId };
  }

  async saveItemState(userId: string, tripId: string, itemId: string, dto: ItemStateDto) {
    const trip = await this.dataSource.getRepository(Trip).findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException(`Viaggio con ID ${tripId} non trovato`);
    }
    if (trip.userId !== userId) {
      throw new ForbiddenException('Accesso negato al viaggio specificato');
    }

    const item = await this.dataSource.getRepository(Item).findOne({ where: { id: itemId, userId } });
    if (!item) {
      throw new NotFoundException(`Oggetto con ID ${itemId} non trovato`);
    }

    const stateRepo = this.dataSource.getRepository(TripItemState);

    const hasStatus = dto.status && dto.status !== 'none';
    const hasQuantity = dto.quantity !== null && dto.quantity !== undefined && dto.quantity > 0;
    const hasNote = typeof dto.note === 'string' && dto.note.trim().length > 0;
    const isValorized = Boolean(hasStatus || hasQuantity || hasNote);

    if (!isValorized) {
      await stateRepo.delete({ tripId, itemId });
      return {
        valorized: false,
        itemId,
        state: null,
      };
    }

    let state = await stateRepo.findOne({ where: { tripId, itemId } });
    if (!state) {
      state = stateRepo.create({
        tripId,
        itemId,
        status: dto.status ?? 'none',
        quantity: dto.quantity !== undefined && dto.quantity !== null ? dto.quantity : 0,
        note: dto.note?.trim() || null,
      });
    } else {
      if (dto.status !== undefined) state.status = dto.status;
      if (dto.quantity !== undefined) state.quantity = dto.quantity;
      if (dto.note !== undefined) state.note = dto.note?.trim() || null;
    }

    const saved = await stateRepo.save(state);
    return {
      valorized: true,
      itemId,
      state: {
        quantity: saved.quantity,
        status: saved.status,
        note: saved.note,
        updatedAt: saved.updatedAt,
      },
    };
  }

  async resetTrip(userId: string, tripId: string) {
    const trip = await this.dataSource.getRepository(Trip).findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException(`Viaggio con ID ${tripId} non trovato`);
    }
    if (trip.userId !== userId) {
      throw new ForbiddenException('Accesso negato al viaggio specificato');
    }

    await this.dataSource.getRepository(TripItemState).delete({ tripId });
    return { reset: true, tripId };
  }
}

