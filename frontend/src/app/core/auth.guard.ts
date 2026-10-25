import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();

  if (!auth.currentUser()) {
    const returnUrl = state.url && state.url !== '/' ? state.url : undefined;
    return router.createUrlTree(['/login'], {
      queryParams: returnUrl ? { returnUrl } : undefined,
    });
  }

  return true;
};

export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();

  if (auth.currentUser()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
