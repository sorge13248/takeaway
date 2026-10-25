import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { AuthUser } from '../common/auth/auth.types.js';
import { User } from '../entities/user.entity.js';

const FALLBACK_DISPLAY_NAME = 'TakeAway user';

@Injectable()
export class UsersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async ensureUser(user: AuthUser): Promise<User> {
    const repository = this.dataSource.getRepository(User);
    const normalizedDisplayName = user.displayName?.trim() || FALLBACK_DISPLAY_NAME;
    let persisted = await repository.findOne({ where: [{ subject: user.subject }, { email: user.email ?? undefined }] });

    if (!persisted) {
      persisted = repository.create({
        subject: user.subject,
        email: user.email,
        displayName: normalizedDisplayName,
        pictureUrl: user.pictureUrl,
      });
      return repository.save(persisted);
    }

    const shouldKeepPersistedName =
      normalizedDisplayName === FALLBACK_DISPLAY_NAME && persisted.displayName !== FALLBACK_DISPLAY_NAME;
    const nextDisplayName = shouldKeepPersistedName ? persisted.displayName : normalizedDisplayName;
    const needsUpdate =
      persisted.displayName !== nextDisplayName ||
      persisted.email !== user.email ||
      persisted.pictureUrl !== user.pictureUrl;

    if (needsUpdate) {
      persisted.displayName = nextDisplayName;
      persisted.email = user.email;
      persisted.pictureUrl = user.pictureUrl;
      persisted = await repository.save(persisted);
    }

    return persisted;
  }
}

