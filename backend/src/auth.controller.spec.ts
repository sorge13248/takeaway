import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  it('should return oidcEnabled = false when AUTH_MOCK_ENABLED=true', () => {
    const originalMock = process.env.AUTH_MOCK_ENABLED;
    const originalIssuer = process.env.OIDC_ISSUER_URL;

    process.env.AUTH_MOCK_ENABLED = 'true';
    process.env.OIDC_ISSUER_URL = 'https://auth.example.com';

    const controller = new AuthController();
    const config = controller.getConfig();

    expect(config.oidcEnabled).toBe(false);

    process.env.AUTH_MOCK_ENABLED = originalMock;
    process.env.OIDC_ISSUER_URL = originalIssuer;
  });

  it('should return oidcEnabled = true when AUTH_MOCK_ENABLED=false and OIDC_ISSUER_URL is set', () => {
    const originalMock = process.env.AUTH_MOCK_ENABLED;
    const originalIssuer = process.env.OIDC_ISSUER_URL;

    process.env.AUTH_MOCK_ENABLED = 'false';
    process.env.OIDC_ISSUER_URL = 'https://auth.example.com';

    const controller = new AuthController();
    const config = controller.getConfig();

    expect(config.oidcEnabled).toBe(true);

    process.env.AUTH_MOCK_ENABLED = originalMock;
    process.env.OIDC_ISSUER_URL = originalIssuer;
  });

  it('should return oidcEnabled = false when OIDC_ISSUER_URL is missing', () => {
    const originalMock = process.env.AUTH_MOCK_ENABLED;
    const originalIssuer = process.env.OIDC_ISSUER_URL;

    process.env.AUTH_MOCK_ENABLED = 'false';
    delete process.env.OIDC_ISSUER_URL;

    const controller = new AuthController();
    const config = controller.getConfig();

    expect(config.oidcEnabled).toBe(false);

    process.env.AUTH_MOCK_ENABLED = originalMock;
    process.env.OIDC_ISSUER_URL = originalIssuer;
  });
});

