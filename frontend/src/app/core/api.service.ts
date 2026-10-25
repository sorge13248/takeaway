import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CatalogCategory,
  CatalogExportData,
  CatalogItem,
  CategoryWithCount,
  CreateCategoryDto,
  CreateItemDto,
  ItemState,
  OidcConfig,
  OidcMetadata,
  TripDetail,
  TripSummary,
  User,
} from './models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  // --------------------------------------------------------------------------
  // OIDC & User
  // --------------------------------------------------------------------------
  getOidcConfig(): Observable<OidcConfig> {
    return this.http.get<OidcConfig>(`${this.baseUrl}/oidc/config`);
  }

  getOidcMetadata(): Observable<OidcMetadata> {
    return this.http.get<OidcMetadata>(`${this.baseUrl}/oidc/metadata`);
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  // --------------------------------------------------------------------------
  // Catalog View
  // --------------------------------------------------------------------------
  getCatalog(): Observable<CatalogCategory[]> {
    return this.http.get<CatalogCategory[]>(`${this.baseUrl}/catalog`);
  }

  // --------------------------------------------------------------------------
  // Categories (Domain Management)
  // --------------------------------------------------------------------------
  getCategories(): Observable<CategoryWithCount[]> {
    return this.http.get<CategoryWithCount[]>(`${this.baseUrl}/catalog/categories`);
  }

  getCategory(id: string): Observable<CatalogCategory> {
    return this.http.get<CatalogCategory>(`${this.baseUrl}/catalog/categories/${id}`);
  }

  createCategory(dto: CreateCategoryDto): Observable<CatalogCategory> {
    return this.http.post<CatalogCategory>(`${this.baseUrl}/catalog/categories`, dto);
  }

  updateCategory(id: string, dto: Partial<CreateCategoryDto>): Observable<CatalogCategory> {
    return this.http.patch<CatalogCategory>(`${this.baseUrl}/catalog/categories/${id}`, dto);
  }

  deleteCategory(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/catalog/categories/${id}`);
  }

  // --------------------------------------------------------------------------
  // Items (Domain Management)
  // --------------------------------------------------------------------------
  getItems(): Observable<CatalogItem[]> {
    return this.http.get<CatalogItem[]>(`${this.baseUrl}/catalog/items`);
  }

  getItem(id: string): Observable<CatalogItem> {
    return this.http.get<CatalogItem>(`${this.baseUrl}/catalog/items/${id}`);
  }

  createItem(dto: CreateItemDto): Observable<CatalogItem> {
    return this.http.post<CatalogItem>(`${this.baseUrl}/catalog/items`, dto);
  }

  updateItem(id: string, dto: Partial<CreateItemDto>): Observable<CatalogItem> {
    return this.http.patch<CatalogItem>(`${this.baseUrl}/catalog/items/${id}`, dto);
  }

  deleteItem(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/catalog/items/${id}`);
  }

  // --------------------------------------------------------------------------
  // Image Upload
  // --------------------------------------------------------------------------
  uploadItemImage(file: File): Observable<{ url: string; filename: string; originalName: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; filename: string; originalName: string; size: number }>(
      `${this.baseUrl}/catalog/upload`,
      formData,
    );
  }

  // --------------------------------------------------------------------------
  // Import & Export
  // --------------------------------------------------------------------------
  exportCatalog(): Observable<CatalogExportData> {
    return this.http.get<CatalogExportData>(`${this.baseUrl}/catalog/export`);
  }

  importCatalog(payload: {
    mode?: 'merge' | 'replace';
    categories: any[];
    items: any[];
  }): Observable<{ success: boolean; importedCategories: number; importedItems: number; mode: string }> {
    return this.http.post<{ success: boolean; importedCategories: number; importedItems: number; mode: string }>(
      `${this.baseUrl}/catalog/import`,
      payload,
    );
  }

  // --------------------------------------------------------------------------
  // Trips
  // --------------------------------------------------------------------------
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
