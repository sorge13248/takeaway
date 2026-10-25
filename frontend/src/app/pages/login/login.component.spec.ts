import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let mockAuthService: { login: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => {
                  if (key === 'returnUrl') return '/trips/123';
                  if (key === 'error') return 'invalid_state';
                  return null;
                },
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create login component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the login notice without OIDC references', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const notice = compiled.querySelector('.login-notice');
    expect(notice).toBeTruthy();
    expect(notice?.textContent).toContain('Accedi per utilizzare l\'applicazione');
    expect(notice?.textContent).toContain('Verrai reindirizzato per completare l\'accesso');
    expect(notice?.textContent).not.toContain('OIDC');
  });

  it('should display the error banner when error param is present', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const errorAlert = compiled.querySelector('.login-error');
    expect(errorAlert).toBeTruthy();
    expect(errorAlert?.textContent).toContain('Sessione di autenticazione scaduta o non valida');
    expect(errorAlert?.textContent).not.toContain('OIDC');
  });

  it('should call auth.login with returnUrl when login button is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const loginBtn = compiled.querySelector('.login-btn') as HTMLButtonElement;
    expect(loginBtn).toBeTruthy();
    expect(loginBtn.textContent).toContain('Accedi');
    expect(loginBtn.textContent).not.toContain('OIDC');

    loginBtn.click();
    expect(mockAuthService.login).toHaveBeenCalledWith('/trips/123');
  });
});
