import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [loginGuard],
  },
  {
    path: '',
    loadComponent: () => import('./pages/trip-list/trip-list.component').then((m) => m.TripListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'trips/:id',
    loadComponent: () => import('./pages/trip-detail/trip-detail.component').then((m) => m.TripDetailComponent),
    canActivate: [authGuard],
  },
  { path: 'trip/:id', redirectTo: 'trips/:id' },
  {
    path: 'domains',
    loadComponent: () => import('./pages/domain-manager/domain-manager.component').then((m) => m.DomainManagerComponent),
    canActivate: [authGuard],
  },
  { path: 'catalog', redirectTo: 'domains' },
  { path: '**', redirectTo: '' },
];
