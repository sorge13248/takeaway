import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  NgZone,
  signal,
  untracked,
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ApiService } from './api.service';
import { OidcConfig, OidcMetadata, User } from './models';
import { ConfirmModalComponent } from '../shared/components/confirm-modal/confirm-modal.component';

export interface AuthConfig {
  oidcEnabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly dialog = inject(Dialog);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly oidcConfig = signal<OidcConfig | null>(null);
  readonly oidcMetadata = signal<OidcMetadata | null>(null);
  readonly currentUser = signal<User | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  private metadataRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionPingTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionExpiredModalOpen = false;
  private initPromise: Promise<User | null> | null = null;

  sessionPingIntervalMs = 30_000;

  readonly isAuthenticated = computed(() => Boolean(this.currentUser()));
  readonly oidcEnabled = computed(() => Boolean(this.oidcConfig()?.issuerUrl));
  readonly displayName = computed(() => this.currentUser()?.displayName ?? 'Ospite');
  readonly email = computed(() => this.currentUser()?.email ?? null);
  readonly pictureUrl = computed(() => this.currentUser()?.pictureUrl ?? null);
  readonly initials = computed(() => {
    const source = this.displayName().trim();
    return (
      source
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'T'
    );
  });
  readonly loginMode = computed(() => (this.oidcMetadata() ? 'OIDC' : 'OIDC non pronto'));

  constructor() {
    effect(() => {
      const authenticated = this.isAuthenticated();
      untracked(() => {
        if (authenticated) {
          this.startSessionPing();
        } else {
          this.stopSessionPing();
        }
      });
    });

    this.destroyRef.onDestroy(() => {
      this.stopSessionPing();
      this.clearMetadataRetry();
    });

    void this.ensureInitialized();
  }

  ensureInitialized(): Promise<User | null> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    return this.initPromise;
  }

  initAuth(): void {
    void this.ensureInitialized();
  }

  async initialize(): Promise<User | null> {
    this.loading.set(true);
    try {
      await this.loadOidcConfig();
      const user = await this.loadProfile();
      this.scheduleMetadataRetryIfNeeded();
      return user;
    } finally {
      this.loading.set(false);
    }
  }

  async waitUntilInitialized(timeoutMs = 5000): Promise<void> {
    if (!this.loading()) {
      return;
    }

    await new Promise<void>((resolve) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (!this.loading() || Date.now() - startedAt >= timeoutMs) {
          clearInterval(timer);
          resolve();
        }
      }, 25);
    });
  }

  async loadOidcConfig(): Promise<void> {
    this.clearMetadataRetry();
    const config = await firstValueFrom(this.api.getOidcConfig().pipe(catchError(() => of(null))));
    if (!config || !config.issuerUrl) {
      this.oidcConfig.set(null);
      this.oidcMetadata.set(null);
      this.error.set(null);
      return;
    }

    this.oidcConfig.set(config);
    this.error.set(null);

    if (!config.issuerUrl || !config.clientId || !config.redirectUri) {
      this.oidcMetadata.set(null);
      this.error.set('Configurazione OIDC incompleta');
      this.scheduleMetadataRetryIfNeeded();
      return;
    }

    const metadata = await firstValueFrom(this.api.getOidcMetadata().pipe(catchError(() => of(null))));
    this.oidcMetadata.set(metadata);

    if (!metadata) {
      this.error.set('Metadata OIDC non disponibili');
      this.scheduleMetadataRetryIfNeeded();
      return;
    }

    this.error.set(null);
  }

  login(returnUrl?: string): void {
    if (returnUrl) {
      window.location.href = `/api/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    } else {
      window.location.href = '/api/auth/login';
    }
  }

  logout(): void {
    this.stopSessionPing();
    this.http
      .post('/api/auth/logout', {})
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: () => {
          this.currentUser.set(null);
          if (this.oidcEnabled()) {
            window.location.href = '/login';
          } else {
            this.reloadPage();
          }
        },
        error: () => {
          this.currentUser.set(null);
          if (this.oidcEnabled()) {
            window.location.href = '/login';
          } else {
            this.reloadPage();
          }
        },
      });
  }

  startSessionPing(): void {
    this.stopSessionPing();

    if (!this.isAuthenticated() || this.sessionExpiredModalOpen) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.sessionPingTimer = setTimeout(async () => {
        this.sessionPingTimer = null;
        await this.checkSession();
        if (this.isAuthenticated() && !this.sessionExpiredModalOpen) {
          this.startSessionPing();
        }
      }, this.sessionPingIntervalMs);
    });
  }

  stopSessionPing(): void {
    if (this.sessionPingTimer) {
      clearTimeout(this.sessionPingTimer);
      this.sessionPingTimer = null;
    }
  }

  async checkSession(): Promise<boolean> {
    if (!this.isAuthenticated() || this.sessionExpiredModalOpen) {
      return false;
    }

    try {
      const user = await firstValueFrom(this.http.get<User>('/api/me'));
      if (!this.isAuthenticated() || this.sessionExpiredModalOpen) {
        return false;
      }

      if (user) {
        this.ngZone.run(() => {
          this.currentUser.set(user);
        });
        return true;
      }

      this.handleSessionExpired();
      return false;
    } catch (err: unknown) {
      if (!this.isAuthenticated() || this.sessionExpiredModalOpen) {
        return false;
      }

      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.handleSessionExpired();
        return false;
      }

      return true;
    }
  }

  handleSessionExpired(): void {
    this.stopSessionPing();

    this.ngZone.run(() => {
      this.currentUser.set(null);

      if (this.sessionExpiredModalOpen) {
        return;
      }
      this.sessionExpiredModalOpen = true;

      const dialogRef = this.dialog.open<boolean>(ConfirmModalComponent, {
        disableClose: true,
        data: {
          title: 'Sessione scaduta',
          message:
            'La sessione di autenticazione è scaduta. Ricarica la pagina per rinnovare la sessione e continuare a usare TakeAway.',
          confirmLabel: 'Ricarica pagina',
          showCancel: false,
          confirmVariant: 'primary',
        },
      });

      dialogRef.closed.subscribe(() => {
        this.sessionExpiredModalOpen = false;
        this.reloadPage();
      });
    });
  }

  reloadPage(): void {
    if (typeof window !== 'undefined' && window.location) {
      try {
        window.location.reload();
      } catch {
        // Ignored in non-browser or test environments
      }
    }
  }

  private async loadProfile(): Promise<User | null> {
    try {
      const user = await firstValueFrom(this.api.getMe().pipe(catchError(() => of(null))));
      if (user) {
        this.currentUser.set(user);
        return user;
      }
    } catch {
      // Keep anonymous profile when backend session is missing.
    }

    this.currentUser.set(null);
    return null;
  }

  private scheduleMetadataRetryIfNeeded(): void {
    if (this.oidcMetadata() || this.metadataRetryTimer || !this.oidcConfig()?.issuerUrl) {
      return;
    }

    this.metadataRetryTimer = setTimeout(() => {
      this.metadataRetryTimer = null;
      void this.loadOidcConfig();
    }, 2000);
  }

  private clearMetadataRetry(): void {
    if (!this.metadataRetryTimer) {
      return;
    }

    clearTimeout(this.metadataRetryTimer);
    this.metadataRetryTimer = null;
  }
}
