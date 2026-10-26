import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import type { AuthUser } from '../common/auth/auth.types.js';

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
  async getCatalog(@CurrentUser() user: AuthUser) {
    return this.catalogService.getCatalog(user.id);
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  @Get('categories')
  async getCategories(@CurrentUser() user: AuthUser) {
    return this.catalogService.getCategoriesWithCounts(user.id);
  }

  @Get('categories/:id')
  async getCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogService.getCategoryById(user.id, id);
  }

  @Post('categories')
  async createCategory(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(user.id, dto);
  }

  @Patch('categories/:id')
  async updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(user.id, id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogService.deleteCategory(user.id, id);
  }

  @Put('categories/reorder')
  async reorderCategories(
    @CurrentUser() user: AuthUser,
    @Body() body: { categoryIds: string[] },
  ) {
    return this.catalogService.reorderCategories(user.id, body.categoryIds);
  }

  @Put('categories/:categoryId/items/reorder')
  async reorderCategoryItems(
    @CurrentUser() user: AuthUser,
    @Param('categoryId') categoryId: string,
    @Body() body: { itemIds: string[]; sourceCategoryId?: string },
  ) {
    return this.catalogService.reorderCategoryItems(
      user.id,
      categoryId,
      body.itemIds,
      body.sourceCategoryId,
    );
  }

  // --------------------------------------------------------------------------
  // Items
  // --------------------------------------------------------------------------
  @Get('items')
  async getItems(@CurrentUser() user: AuthUser) {
    return this.catalogService.getAllItemsDetailed(user.id);
  }

  @Get('items/:id')
  async getItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogService.getItemById(user.id, id);
  }

  @Post('items')
  async createItem(@CurrentUser() user: AuthUser, @Body() dto: CreateItemDto) {
    return this.catalogService.createItem(user.id, dto);
  }

  @Patch('items/:id')
  async updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.catalogService.updateItem(user.id, id, dto);
  }

  @Delete('items/:id')
  async deleteItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogService.deleteItem(user.id, id);
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
  uploadImage(@CurrentUser() _user: AuthUser, @UploadedFile() file?: UploadedFilePayload) {
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
  async exportCatalog(@CurrentUser() user: AuthUser) {
    return this.catalogService.exportCatalog(user.id);
  }

  @Post('import')
  async importCatalog(@CurrentUser() user: AuthUser, @Body() dto: ImportCatalogDto) {
    return this.catalogService.importCatalog(user.id, dto);
  }
}
