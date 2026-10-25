import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { BearerJwtGuard } from '../common/auth/bearer-jwt.guard.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import type { AuthUser } from '../common/auth/auth.types.js';
import { CreateTripDto, ItemStateDto, TripsService, UpdateTripDto } from '../services/trips.service.js';

@Controller('trips')
@UseGuards(BearerJwtGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  async findUserTrips(@CurrentUser() user: AuthUser) {
    return this.tripsService.findUserTrips(user.id);
  }

  @Post()
  async createTrip(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(user.id, dto);
  }

  @Get(':id')
  async getTripById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tripsService.getTripById(user.id, id);
  }

  @Patch(':id')
  async updateTrip(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.tripsService.updateTrip(user.id, id, dto);
  }

  @Delete(':id')
  async deleteTrip(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tripsService.deleteTrip(user.id, id);
  }

  @Put(':id/items/:itemId')
  async saveItemState(
    @CurrentUser() user: AuthUser,
    @Param('id') tripId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ItemStateDto,
  ) {
    return this.tripsService.saveItemState(user.id, tripId, itemId, dto);
  }

  @Post(':id/reset')
  async resetTrip(@CurrentUser() user: AuthUser, @Param('id') tripId: string) {
    return this.tripsService.resetTrip(user.id, tripId);
  }
}

