import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TripListComponent } from './trip-list.component';
import { ApiService } from '../../core/api.service';
import { TripSummary } from '../../core/models';

describe('TripListComponent', () => {
  let fixture: ComponentFixture<TripListComponent>;
  let component: TripListComponent;

  const mockTrips: TripSummary[] = Array.from({ length: 25 }, (_, i) => ({
    id: `trip-${i + 1}`,
    title: `Viaggio ${i + 1}`,
    destination: `Destinazione ${i + 1}`,
    startDate: '2026-06-01',
    endDate: '2026-06-10',
    notes: `Note viaggio ${i + 1}`,
    isArchived: false,
    createdAt: new Date(2026, 0, i + 1).toISOString(), // Trip 25 is newest, Trip 1 is oldest
    updatedAt: new Date(2026, 0, i + 1).toISOString(),
    valorizedCount: 10,
    packedCount: 5,
  }));

  const mockApiService = {
    getTrips: () => of(mockTrips),
    createTrip: (dto: any) =>
      of({
        id: 'new-trip-id',
        ...dto,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        valorizedCount: 0,
        packedCount: 0,
      }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripListComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TripListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create TripListComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should always render the dashed "create trip" placeholder as the first card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.trip-card');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0];
    expect(firstCard.classList.contains('create-card')).toBe(true);
    expect(firstCard.textContent).toContain('Nuovo Viaggio');
  });

  it('should sort trips from most recent to least recent', () => {
    const sorted = component.sortedTrips();
    expect(sorted.length).toBe(25);
    // Trip 25 was created on 2026-01-25, Trip 1 was created on 2026-01-01
    expect(sorted[0].id).toBe('trip-25');
    expect(sorted[24].id).toBe('trip-1');
  });

  it('should paginate with 20 items per page', () => {
    expect(component.totalPages()).toBe(2);
    expect(component.paginatedTrips().length).toBe(20);

    const compiled = fixture.nativeElement as HTMLElement;
    // 1 create card + 20 trip cards = 21 cards
    const cards = compiled.querySelectorAll('.trip-card');
    expect(cards.length).toBe(21);

    // Switch to page 2
    component.goToPage(2);
    fixture.detectChanges();
    expect(component.paginatedTrips().length).toBe(5);
    const cardsPage2 = compiled.querySelectorAll('.trip-card');
    // 1 create card + 5 trip cards = 6 cards
    expect(cardsPage2.length).toBe(6);
    expect(cardsPage2[0].classList.contains('create-card')).toBe(true);
  });

  it('should open and close create trip modal', () => {
    expect(component.showCreateModal()).toBe(false);
    component.openCreateModal();
    expect(component.showCreateModal()).toBe(true);
    component.closeModal();
    // Modal closes with animation flag
    expect(component.isModalClosing()).toBe(true);
  });
});

