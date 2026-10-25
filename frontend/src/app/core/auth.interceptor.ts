import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api')) {
    return next(request);
  }

  const injector = inject(Injector);
  const cloned = request.clone({ withCredentials: true });

  return next(cloned).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 401 || error.status === 403) &&
        !request.url.startsWith('/api/auth/login') &&
        !request.url.startsWith('/api/auth/logout')
      ) {
        try {
          const authService = injector.get(AuthService);
          if (authService.isAuthenticated()) {
            authService.handleSessionExpired();
          }
        } catch {
          // ignore DI lookup errors if during app initialization
        }
      }
      return throwError(() => error);
    }),
  );
};
