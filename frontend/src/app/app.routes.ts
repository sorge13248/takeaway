import { Routes } from '@angular/router';
import { TripListComponent } from './pages/trip-list/trip-list.component';
import { TripDetailComponent } from './pages/trip-detail/trip-detail.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard, loginGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: '', component: TripListComponent, canActivate: [authGuard] },
  { path: 'trips/:id', component: TripDetailComponent, canActivate: [authGuard] },
  { path: 'trip/:id', redirectTo: 'trips/:id' },
  { path: '**', redirectTo: '' },
];
