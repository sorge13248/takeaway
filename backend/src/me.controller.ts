import { Controller, Get, UseGuards } from '@nestjs/common';
import { BearerJwtGuard } from './common/auth/bearer-jwt.guard.js';
import { CurrentUser } from './common/auth/current-user.decorator.js';
import type { AuthUser } from './common/auth/auth.types.js';

@Controller('me')
@UseGuards(BearerJwtGuard)
export class MeController {
  @Get()
  getProfile(@CurrentUser() user: AuthUser) {
    return user;
  }
}

