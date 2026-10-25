import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TripDetailComponent } from './trip-detail.component';
import { ApiService } from '../../core/api.service';
import { CatalogCategory, TripDetail } from '../../core/models';

describe('TripDetailComponent', () => {
  let fixture: ComponentFixture<TripDetailComponent>;
  let component: TripDetailComponent;

  const mockTrip: TripDetail = {
    id: 'test-trip-1',
    title: 'Viaggio a Parigi',
    destination: 'Parigi',
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    notes: 'Hotel vicino al Louvre',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemStates: {
      item1: { quantity: 2, status: 'packed', note: 'Due paia' },
    },
  };

  const mockCatalog: CatalogCategory[] = [
    {
      id: 'cat1',
      slug: 'abbigliamento',
      name: 'Abbigliamento',
      parentGroup: null,
      icon: 'shirt',
      sortOrder: 1,
      items: [
        {
          id: 'item1',
          name: 'Pantaloni',
          description: 'Jeans comodi',
          tags: ['estate'],
          defaultQuantity: 1,
          isPreparation: false,
          minDays: null,
          toBuy: false,
          imageUrl: null,
          sortOrder: 1,
        },
        {
          id: 'item2',
          name: 'Maglietta',
          description: 'T-shirt cotone',
          tags: ['estate'],
          defaultQuantity: 1,
          isPreparation: false,
          minDays: null,
          toBuy: false,
          imageUrl: null,
          sortOrder: 2,
        },
      ],
    },
  ];

  const mockApiService = {
    getCatalog: () => of(mockCatalog),
    getTrip: (id: string) => of(mockTrip),
    updateTrip: (id: string, dto: any) => of({ ...mockTrip, ...dto }),
    deleteTrip: (id: string) => of({ deleted: true, id }),
    resetTrip: (id: string) => of({ reset: true, tripId: id }),
    saveItemState: (tripId: string, itemId: string, dto: any) =>
      of({ valorized: (dto.status && dto.status !== 'none') || (dto.quantity && dto.quantity > 0), itemId, state: null }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['id', 'test-trip-1']])),
          },
        },
        { provide: ApiService, useValue: mockApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create TripDetailComponent and load trip', () => {
    expect(component).toBeTruthy();
    expect(component.activeTrip()?.title).toBe('Viaggio a Parigi');
  });

  it('should render trip details banner', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.trip-banner')).toBeTruthy();
    expect(compiled.querySelector('h2')?.textContent).toContain('Viaggio a Parigi');
    expect(compiled.querySelector('.trip-destination')?.textContent).toContain('Parigi');
    expect(compiled.querySelector('.trip-notes')?.textContent).toContain('Hotel vicino al Louvre');
  });

  it('should render back link to home page', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const backBtn = compiled.querySelector('.btn-back');
    expect(backBtn).toBeTruthy();
    expect(backBtn?.getAttribute('href')).toBe('/');
    expect(backBtn?.textContent).toContain('Tutti i viaggi');
  });

  it('should calculate stats properly', () => {
    const stats = component.tripStats();
    expect(stats.totalValorized).toBe(1);
    expect(stats.totalPacked).toBe(1);
    expect(stats.percent).toBe(100);
  });

  it('should render view-controls with expand and collapse buttons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const viewControls = compiled.querySelector('.view-controls');
    expect(viewControls).toBeTruthy();

    const buttons = viewControls?.querySelectorAll('button.btn-text');
    expect(buttons?.length).toBe(2);
    expect(buttons?.[0]?.textContent).toContain('Espandi tutti');
    expect(buttons?.[1]?.textContent).toContain('Comprimi tutti');
  });

  it('should toggle category collapse state and apply sliding classes', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const categoryCard = compiled.querySelector('.category-card');
    const categoryHeader = compiled.querySelector('.category-header') as HTMLElement;
    const collapseWrapper = compiled.querySelector('.category-collapse-wrapper');
    const categoryBody = compiled.querySelector('.category-body');

    expect(categoryCard).toBeTruthy();
    expect(collapseWrapper).toBeTruthy();
    expect(categoryBody).toBeTruthy();
    expect(categoryCard?.classList.contains('collapsed')).toBe(false);

    // Click header to collapse
    categoryHeader.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(categoryCard?.classList.contains('collapsed')).toBe(true);

    // Click "Espandi tutti" to expand
    const expandBtn = compiled.querySelector('.view-controls button:first-child') as HTMLElement;
    expandBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(categoryCard?.classList.contains('collapsed')).toBe(false);

    // Click "Comprimi tutti" to collapse
    const collapseBtn = compiled.querySelector('.view-controls button:last-child') as HTMLElement;
    collapseBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(categoryCard?.classList.contains('collapsed')).toBe(true);
  });

  it('should have default quantity 0 for unvalorized items and disable minus button', () => {
    const unvalorizedState = component.getItemState('item2');
    expect(unvalorizedState.quantity).toBe(0);
    expect(unvalorizedState.status).toBe('none');

    const compiled = fixture.nativeElement as HTMLElement;
    const itemRows = compiled.querySelectorAll('.item-row');
    const item2Row = itemRows[1];
    expect(item2Row).toBeTruthy();

    const input = item2Row.querySelector('.quantity-input') as HTMLInputElement;
    expect(input.value).toBe('0');

    const minusBtn = item2Row.querySelector('.counter-btn') as HTMLButtonElement;
    expect(minusBtn.disabled).toBe(true);
  });

  it('should not render explicit X button in item controls', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const resetButtons = compiled.querySelectorAll('.btn-reset-item');
    expect(resetButtons.length).toBe(0);
  });

  it('should show error when status is selected but quantity is 0', () => {
    const item2 = mockCatalog[0].items[1];
    component.onStatusChange(item2, 'packed');
    fixture.detectChanges();

    const err = component.getItemError('item2');
    expect(err).toContain('Quantità a 0');

    const compiled = fixture.nativeElement as HTMLElement;
    const item2Row = compiled.querySelectorAll('.item-row')[1];
    expect(item2Row.classList.contains('has-error')).toBe(true);

    const errorNotice = item2Row.querySelector('.item-error-notice');
    expect(errorNotice).toBeTruthy();
    expect(errorNotice?.textContent).toContain('Quantità a 0');
  });

  it('should show error when quantity is greater than 0 but status is none', () => {
    const item2 = mockCatalog[0].items[1];
    component.onQuantityChange(item2, 1);
    fixture.detectChanges();

    const err = component.getItemError('item2');
    expect(err).toContain('Stato non selezionato');

    const compiled = fixture.nativeElement as HTMLElement;
    const item2Row = compiled.querySelectorAll('.item-row')[1];
    expect(item2Row.classList.contains('has-error')).toBe(true);

    const errorNotice = item2Row.querySelector('.item-error-notice');
    expect(errorNotice).toBeTruthy();
    expect(errorNotice?.textContent).toContain('Stato non selezionato');
  });

  it('should clear error when both quantity > 0 and status != none are set', () => {
    const item2 = mockCatalog[0].items[1];
    component.onQuantityChange(item2, 2);
    component.onStatusChange(item2, 'worn');
    fixture.detectChanges();

    expect(component.getItemError('item2')).toBeNull();

    const compiled = fixture.nativeElement as HTMLElement;
    const item2Row = compiled.querySelectorAll('.item-row')[1];
    expect(item2Row.classList.contains('has-error')).toBe(false);
    expect(item2Row.querySelector('.item-error-notice')).toBeNull();
  });

  it('should remove item from trip when status is set to none (incorporating X removal)', () => {
    const item1 = mockCatalog[0].items[0];
    expect(component.itemStates()['item1']).toBeTruthy();

    component.onStatusChange(item1, 'none');
    fixture.detectChanges();

    expect(component.itemStates()['item1']).toBeUndefined();
    expect(component.getItemState('item1').quantity).toBe(0);
    expect(component.getItemState('item1').status).toBe('none');
    expect(component.getItemError('item1')).toBeNull();
  });

  it('should display error summary card between header and filters card when errors exist', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    // Initially, no errors exist
    expect(component.errorCount()).toBe(0);
    expect(compiled.querySelector('.error-summary-card')).toBeNull();

    // Trigger an error on item2
    const item2 = mockCatalog[0].items[1];
    component.onStatusChange(item2, 'packed');
    fixture.detectChanges();

    expect(component.errorCount()).toBe(1);
    const errorCard = compiled.querySelector('.error-summary-card');
    expect(errorCard).toBeTruthy();
    expect(errorCard?.textContent).toContain('1 oggetto richiede correzione');

    // Verify it is placed between trip-banner and filters-card
    const banner = compiled.querySelector('.trip-banner');
    const filters = compiled.querySelector('.filters-card');
    expect(banner?.nextElementSibling).toBe(errorCard);
    expect(errorCard?.nextElementSibling).toBe(filters);
  });

  it('should filter items in error when status filter is set to error', () => {
    const item2 = mockCatalog[0].items[1];
    // Put item2 in error (status 'car', quantity 0)
    component.onStatusChange(item2, 'car');
    fixture.detectChanges();

    expect(component.errorCount()).toBe(1);

    // Set filter to error
    component.statusFilter.set('error');
    fixture.detectChanges();

    const filtered = component.filteredCatalog();
    expect(filtered.length).toBe(1);
    expect(filtered[0].filteredItems.length).toBe(1);
    expect(filtered[0].filteredItems[0].id).toBe('item2');
  });

  it('should filter by error and expand categories when clicking the action button in summary card', () => {
    const item2 = mockCatalog[0].items[1];
    component.onQuantityChange(item2, 4);
    fixture.detectChanges();

    expect(component.errorCount()).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    const filterBtn = compiled.querySelector('.error-summary-actions button') as HTMLButtonElement;
    expect(filterBtn).toBeTruthy();

    filterBtn.click();
    fixture.detectChanges();

    expect(component.statusFilter()).toBe('error');
  });

  it('should display correct counters for all options in status filter select', () => {
    const counts = component.statusCounts();
    expect(counts.all).toBe(2);
    expect(counts.valorized).toBe(1);
    expect(counts.unvalorized).toBe(1);
    expect(counts.error).toBe(0);
    expect(counts.packed).toBe(1);
    expect(counts.worn).toBe(0);
    expect(counts.car).toBe(0);
    expect(counts.to_pack_last).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    const options = compiled.querySelectorAll('#status-filter option');
    expect(options.length).toBe(8);

    expect(options[0].textContent).toContain('Tutti gli oggetti (2)');
    expect(options[1].textContent).toContain('Solo valorizzati (in lista) (1)');
    expect(options[2].textContent).toContain('Da considerare / vuoti (1)');
    expect(options[3].textContent).toContain('Con errori (0)');
    expect(options[4].textContent).toContain('In valigia (1)');
    expect(options[5].textContent).toContain('Indossati alla partenza (+) (0)');
    expect(options[6].textContent).toContain('In auto (Auris) (0)');
    expect(options[7].textContent).toContain('Da mettere all\'ultimo (*) (0)');
  });
});

