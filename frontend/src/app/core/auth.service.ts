import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { User } from './models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<User | null>(null);
  readonly loading = signal<boolean>(true);

  initAuth() {
    this.api
      .getMe()
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
          this.loading.set(false);
        }),
        catchError(() => {
          this.currentUser.set(null);
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }

  login() {
    window.location.href = '/api/auth/login';
  }

  logout() {
    this.http.post('/api/auth/logout', {}).subscribe({
      next: () => {
        this.currentUser.set(null);
        window.location.reload();
      },
      error: () => {
        this.currentUser.set(null);
        window.location.reload();
      },
    });
  }
}

