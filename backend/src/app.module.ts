import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import './load-env.js';

import { User } from './entities/user.entity.js';
import { Category } from './entities/category.entity.js';
import { Item } from './entities/item.entity.js';
import { CategoryItem } from './entities/category-item.entity.js';
import { Trip } from './entities/trip.entity.js';
import { TripItemState } from './entities/trip-item-state.entity.js';

import { AuthController } from './auth.controller.js';
import { HealthController } from './health.controller.js';
import { MeController } from './me.controller.js';
import { PublicController } from './public.controller.js';
import { CatalogController } from './controllers/catalog.controller.js';
import { TripsController } from './controllers/trips.controller.js';

import { BearerJwtGuard } from './common/auth/bearer-jwt.guard.js';
import { UsersService } from './services/users.service.js';
import { CatalogService } from './services/catalog.service.js';
import { TripsService } from './services/trips.service.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? '../takeaway.sqlite',
      entities: [User, Category, Item, CategoryItem, Trip, TripItemState],
      autoLoadEntities: process.env.DB_AUTO_LOAD_ENTITIES !== 'false',
      synchronize: process.env.DB_SYNCHRONIZE !== 'false',
      logging: process.env.DB_LOGGING === 'true',
    }),
  ],
  controllers: [
    AuthController,
    HealthController,
    PublicController,
    MeController,
    CatalogController,
    TripsController,
  ],
  providers: [
    BearerJwtGuard,
    UsersService,
    CatalogService,
    TripsService,
  ],
})
export class AppModule {}
