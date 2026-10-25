import { Controller, Get, UseGuards } from '@nestjs/common';
import { CatalogService } from '../services/catalog.service.js';
import { BearerJwtGuard } from '../common/auth/bearer-jwt.guard.js';

@Controller('catalog')
@UseGuards(BearerJwtGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getCatalog() {
    return this.catalogService.getCatalog();
  }

  @Get('items')
  async getAllItems() {
    return this.catalogService.getAllItems();
  }
}

