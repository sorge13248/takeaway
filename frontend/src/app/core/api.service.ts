import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogCategory, ItemState, TripDetail, TripSummary, User } from './models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  getCatalog(): Observable<CatalogCategory[]> {
    return this.http.get<CatalogCategory[]>(`${this.baseUrl}/catalog`);
  }

  getTrips(): Observable<TripSummary[]> {
    return this.http.get<TripSummary[]>(`${this.baseUrl}/trips`);
  }

  getTrip(id: string): Observable<TripDetail> {
    return this.http.get<TripDetail>(`${this.baseUrl}/trips/${id}`);
  }

  createTrip(dto: {
    title: string;
    destination?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
  }): Observable<TripSummary> {
    return this.http.post<TripSummary>(`${this.baseUrl}/trips`, dto);
  }

  updateTrip(
    id: string,
    dto: {
      title?: string;
      destination?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
      isArchived?: boolean;
    },
  ): Observable<TripSummary> {
    return this.http.patch<TripSummary>(`${this.baseUrl}/trips/${id}`, dto);
  }

  deleteTrip(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/trips/${id}`);
  }

  saveItemState(
    tripId: string,
    itemId: string,
    dto: {
      quantity?: number | null;
      status?: string;
      note?: string | null;
    },
  ): Observable<{ valorized: boolean; itemId: string; state: ItemState | null }> {
    return this.http.put<{ valorized: boolean; itemId: string; state: ItemState | null }>(
      `${this.baseUrl}/trips/${tripId}/items/${itemId}`,
      dto,
    );
  }

  resetTrip(tripId: string): Observable<{ reset: boolean; tripId: string }> {
    return this.http.post<{ reset: boolean; tripId: string }>(`${this.baseUrl}/trips/${tripId}/reset`, {});
  }
}

