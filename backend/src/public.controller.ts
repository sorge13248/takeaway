import { Controller, Get, NotFoundException, Param, Res, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { getUploadsDir } from './controllers/catalog.controller.js';

export interface OidcMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  userinfo_endpoint?: string;
}

@Controller()
export class PublicController {
  @Get('oidc/config')
  oidcConfig() {
    const mockEnabled = process.env.AUTH_MOCK_ENABLED === 'true' || !process.env.OIDC_ISSUER_URL;
    return {
      oidcEnabled: !mockEnabled,
      issuerUrl: !mockEnabled ? (process.env.OIDC_ISSUER_URL ?? '').trim() : '',
      clientId: !mockEnabled ? (process.env.OIDC_CLIENT_ID ?? '').trim() : '',
      redirectUri: !mockEnabled ? (process.env.OIDC_REDIRECT_URI ?? '').trim() : '',
    };
  }

  @Get('oidc/metadata')
  async oidcMetadata() {
    const issuer = (process.env.OIDC_ISSUER_URL ?? '').trim();
    if (!issuer) {
      throw new ServiceUnavailableException('OIDC_ISSUER_URL non configurato');
    }

    const endpoint = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new ServiceUnavailableException(`Impossibile leggere metadata OIDC (${response.status})`);
    }

    return (await response.json()) as OidcMetadata;
  }

  @Get('uploads/:filename')
  serveUpload(@Param('filename') filename: string, @Res() res: Response) {
    const safeFilename = path.basename(filename);
    const filePath = path.join(getUploadsDir(), safeFilename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Immagine non trovata');
    }
    return res.sendFile(filePath);
  }
}
