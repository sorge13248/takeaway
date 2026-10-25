export interface User {
  id: string;
  subject: string;
  email: string | null;
  displayName: string;
  pictureUrl: string | null;
}

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  oidcEnabled?: boolean;
}

export interface OidcMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  userinfo_endpoint?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  defaultQuantity: number;
  isPreparation: boolean;
  minDays: number | null;
  toBuy: boolean;
  imageUrl: string | null;
  sortOrder: number;
  categories?: { id: string; slug: string; name: string; icon: string }[];
  categoryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  parentGroup: string | null;
  icon: string;
  sortOrder: number;
  items: CatalogItem[];
}

export interface CategoryWithCount {
  id: string;
  slug: string;
  name: string;
  parentGroup: string | null;
  icon: string;
  sortOrder: number;
  itemsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  parentGroup?: string | null;
  icon?: string;
  sortOrder?: number;
}

export interface CreateItemDto {
  name: string;
  description?: string | null;
  tags?: string[];
  defaultQuantity?: number;
  isPreparation?: boolean;
  minDays?: number | null;
  toBuy?: boolean;
  imageUrl?: string | null;
  sortOrder?: number;
  categoryIds?: string[];
}

export interface CatalogExportData {
  version: number;
  exportedAt: string;
  categories: any[];
  items: any[];
}

export interface TripSummary {
  id: string;
  title: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  valorizedCount: number;
  packedCount: number;
}

export interface TripDetail {
  id: string;
  title: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  itemStates: Record<string, ItemState>;
}

export interface ItemState {
  quantity: number | null;
  status: ItemStatus;
  note: string | null;
  updatedAt?: string;
}

export type ItemStatus = 'none' | 'packed' | 'worn' | 'car' | 'to_pack_last';

export interface StatusOption {
  value: ItemStatus;
  label: string;
  emoji: string;
}

export const ITEM_STATUS_OPTIONS: StatusOption[] = [
  { value: 'none', label: 'Non selezionato', emoji: '⬜' },
  { value: 'packed', label: 'In valigia', emoji: '🧳' },
  { value: 'worn', label: 'Indossato alla partenza (+)', emoji: '👕' },
  { value: 'car', label: 'In auto (Auris)', emoji: '🚗' },
  { value: 'to_pack_last', label: 'Da mettere all\'ultimo (*)', emoji: '⚠️' },
];

