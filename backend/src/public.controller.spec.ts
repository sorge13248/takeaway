import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublicController } from './public.controller.js';
import { ServiceUnavailableException } from '@nestjs/common';

describe('PublicController', () => {
  let controller: PublicController;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    controller = new PublicController();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('oidcConfig', () => {
    it('should return configured values', () => {
      process.env.AUTH_MOCK_ENABLED = 'false';
      process.env.OIDC_ISSUER_URL = 'https://auth.example.com';
      process.env.OIDC_CLIENT_ID = 'test-client-id';
      process.env.OIDC_REDIRECT_URI = 'http://localhost:4200/api/auth/callback';

      const config = controller.oidcConfig();
      expect(config).toEqual({
        oidcEnabled: true,
        issuerUrl: 'https://auth.example.com',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:4200/api/auth/callback',
      });
    });

    it('should return empty strings when not configured', () => {
      delete process.env.OIDC_ISSUER_URL;
      delete process.env.OIDC_CLIENT_ID;
      delete process.env.OIDC_REDIRECT_URI;

      const config = controller.oidcConfig();
      expect(config).toEqual({
        oidcEnabled: false,
        issuerUrl: '',
        clientId: '',
        redirectUri: '',
      });
    });
  });

  describe('oidcMetadata', () => {
    it('should throw ServiceUnavailableException if OIDC_ISSUER_URL is empty', async () => {
      delete process.env.OIDC_ISSUER_URL;
      await expect(controller.oidcMetadata()).rejects.toThrow(ServiceUnavailableException);
    });

    it('should fetch and return metadata from openid-configuration', async () => {
      process.env.OIDC_ISSUER_URL = 'https://auth.example.com';
      const mockMeta = {
        authorization_endpoint: 'https://auth.example.com/oauth/authorize',
        token_endpoint: 'https://auth.example.com/oauth/token',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMeta,
      });
      vi.stubGlobal('fetch', fetchMock);

      const meta = await controller.oidcMetadata();
      expect(meta).toEqual(mockMeta);
      expect(fetchMock).toHaveBeenCalledWith('https://auth.example.com/.well-known/openid-configuration');
    });
  });
});

