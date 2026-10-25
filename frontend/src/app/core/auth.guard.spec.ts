import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard, loginGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('Auth Guards', () => {
  let mockAuthService: {
    ensureInitialized: ReturnType<typeof vi.fn>;
    oidcEnabled: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    mockAuthService = {
      ensureInitialized: vi.fn().mockResolvedValue(null),
      oidcEnabled: vi.fn().mockReturnValue(false),
      currentUser: vi.fn().mockReturnValue(null),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('should allow access if OIDC is disabled', async () => {
      mockAuthService.oidcEnabled.mockReturnValue(false);
      mockAuthService.currentUser.mockReturnValue(null);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard({} as any, { url: '/' } as any),
      );

      expect(result).toBe(true);
    });

    it('should allow access if OIDC is enabled and user is logged in', async () => {
      mockAuthService.oidcEnabled.mockReturnValue(true);
      mockAuthService.currentUser.mockReturnValue({ id: '1', displayName: 'Mario' } as any);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard({} as any, { url: '/trips/123' } as any),
      );

      expect(result).toBe(true);
    });

    it('should redirect to /login if OIDC is enabled and user is NOT logged in', async () => {
      mockAuthService.oidcEnabled.mockReturnValue(true);
      mockAuthService.currentUser.mockReturnValue(null);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard({} as any, { url: '/trips/123' } as any),
      );

      expect(result instanceof UrlTree).toBe(true);
      const urlTree = result as UrlTree;
      expect(router.serializeUrl(urlTree)).toBe('/login?returnUrl=%2Ftrips%2F123');
    });

    it('should redirect to /login without returnUrl if accessing root', async () => {
      mockAuthService.oidcEnabled.mockReturnValue(true);
      mockAuthService.currentUser.mockReturnValue(null);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard({} as any, { url: '/' } as any),
      );

      expect(result instanceof UrlTree).toBe(true);
      const urlTree = result as UrlTree;
      expect(router.serializeUrl(urlTree)).toBe('/login');
    });
  });

  describe('loginGuard', () => {
    it('should allow access to /login if OIDC is enabled and user is not logged in', async () => {
      mockAuthService.oidcEnabled.mockReturnValue(true);
      mockAuthService.currentUser.mockReturnValue(null);

      const result = await TestBed.runInInjectionContext(() =>
        loginGuard({} as any, { url: '/login' } as any),
      );

      expect(result).toBe(true);
    });

    it('should redirect to / if OIDC is disabled', async () => {
      mockAuthService.oidcEnabled.mockReturnValue(false);
      mockAuthService.currentUser.mockReturnValue(null);

      const result = await TestBed.runInInjectionContext(() =>
        loginGuard({} as any, { url: '/login' } as any),
      );

      expect(result instanceof UrlTree).toBe(true);
      const urlTree = result as UrlTree;
      expect(router.serializeUrl(urlTree)).toBe('/');
    });

    it('should redirect to / if user is already logged in', async () => {
      mockAuthService.oidcEnabled.mockReturnValue(true);
      mockAuthService.currentUser.mockReturnValue({ id: '1', displayName: 'Mario' } as any);

      const result = await TestBed.runInInjectionContext(() =>
        loginGuard({} as any, { url: '/login' } as any),
      );

      expect(result instanceof UrlTree).toBe(true);
      const urlTree = result as UrlTree;
      expect(router.serializeUrl(urlTree)).toBe('/');
    });
  });
});

