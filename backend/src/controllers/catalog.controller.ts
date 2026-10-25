import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import {
  CatalogService,
  CreateCategoryDto,
  CreateItemDto,
  ImportCatalogDto,
  UpdateCategoryDto,
  UpdateItemDto,
} from '../services/catalog.service.js';
import { BearerJwtGuard } from '../common/auth/bearer-jwt.guard.js';

export interface UploadedFilePayload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

export function getUploadsDir(): string {
  const dir =
    process.env.UPLOADS_DIR ||
    (process.env.DB_PATH
      ? path.join(path.dirname(process.env.DB_PATH), 'uploads')
      : path.join(process.cwd(), 'uploads'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const multerStorage = diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, getUploadsDir());
  },
  filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const unique = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    cb(null, `item-${cleanBase}-${unique}${ext}`);
  },
});

const imageFileFilter = (
  _req: any,
  file: any,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/avif',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Formato immagine non supportato. Usa JPG, PNG, WEBP, SVG o GIF.'), false);
  }
};

@Controller('catalog')
@UseGuards(BearerJwtGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // --------------------------------------------------------------------------
  // Catalog View
  // --------------------------------------------------------------------------
  @Get()
  async getCatalog() {
    return this.catalogService.getCatalog();
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  @Get('categories')
  async getCategories() {
    return this.catalogService.getCategoriesWithCounts();
  }

  @Get('categories/:id')
  async getCategory(@Param('id') id: string) {
    return this.catalogService.getCategoryById(id);
  }

  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(id);
  }

  // --------------------------------------------------------------------------
  // Items
  // --------------------------------------------------------------------------
  @Get('items')
  async getItems() {
    return this.catalogService.getAllItemsDetailed();
  }

  @Get('items/:id')
  async getItem(@Param('id') id: string) {
    return this.catalogService.getItemById(id);
  }

  @Post('items')
  async createItem(@Body() dto: CreateItemDto) {
    return this.catalogService.createItem(dto);
  }

  @Patch('items/:id')
  async updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.catalogService.updateItem(id, dto);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    return this.catalogService.deleteItem(id);
  }

  // --------------------------------------------------------------------------
  // Image Upload
  // --------------------------------------------------------------------------
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: imageFileFilter,
    }),
  )
  uploadImage(@UploadedFile() file?: UploadedFilePayload) {
    if (!file) {
      throw new BadRequestException('Nessun file caricato o file non valido');
    }
    return {
      url: `/api/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  // --------------------------------------------------------------------------
  // Import / Export
  // --------------------------------------------------------------------------
  @Get('export')
  async exportCatalog() {
    return this.catalogService.exportCatalog();
  }

  @Post('import')
  async importCatalog(@Body() dto: ImportCatalogDto) {
    return this.catalogService.importCatalog(dto);
  }
}
