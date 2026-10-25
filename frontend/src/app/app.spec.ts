import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { AuthService } from './core/auth.service';

describe('App', () => {
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render brand link to home page', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const brandLink = compiled.querySelector('a.brand');
    expect(brandLink).toBeTruthy();
    expect(brandLink?.getAttribute('href')).toBe('/');
    expect(brandLink?.querySelector('h1')?.textContent).toContain('TakeAway');
  });

  it('should NOT render trip selector or create button in header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.trip-select')).toBeNull();
    expect(compiled.querySelector('.trip-selector-wrapper')).toBeNull();
    const headerBtns = Array.from(compiled.querySelectorAll('.app-header button'));
    const newTripBtn = headerBtns.find((b) => b.textContent?.includes('Nuovo Viaggio'));
    expect(newTripBtn).toBeUndefined();
  });

  it('should render round profile image when pictureUrl is present', async () => {
    authService.currentUser.set({
      id: 'user-1',
      subject: 'sub-1',
      displayName: 'Mario Rossi',
      email: 'mario@example.com',
      pictureUrl: 'https://example.com/avatar.jpg',
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const avatarImg = compiled.querySelector('.user-avatar-img') as HTMLImageElement;
    expect(avatarImg).toBeTruthy();
    expect(avatarImg.getAttribute('src')).toBe('https://example.com/avatar.jpg');
    expect(compiled.querySelector('.user-avatar-initials')).toBeNull();
  });

  it('should fallback to initials when pictureUrl is absent or load fails', async () => {
    authService.currentUser.set({
      id: 'user-1',
      subject: 'sub-1',
      displayName: 'Mario Rossi',
      email: 'mario@example.com',
      pictureUrl: null,
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-avatar-img')).toBeNull();
    const initials = compiled.querySelector('.user-avatar-initials');
    expect(initials).toBeTruthy();
    expect(initials?.textContent?.trim()).toBe('MR');

    // Now test failure fallback
    authService.currentUser.set({
      id: 'user-1',
      subject: 'sub-1',
      displayName: 'Mario Rossi',
      email: 'mario@example.com',
      pictureUrl: 'https://example.com/invalid.jpg',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onAvatarError();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector('.user-avatar-img')).toBeNull();
    expect(compiled.querySelector('.user-avatar-initials')).toBeTruthy();
  });
});
