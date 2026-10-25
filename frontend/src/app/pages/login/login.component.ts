import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  returnUrl: string | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const err = this.route.snapshot.queryParamMap.get('error');
    if (err) {
      if (err === 'invalid_state') {
        this.errorMessage = 'Sessione di autenticazione scaduta o non valida. Riprova.';
      } else if (err === 'token_exchange_failed') {
        this.errorMessage = 'Autenticazione non riuscita. Riprova.';
      } else {
        this.errorMessage = 'Si è verificato un errore durante l\'autenticazione. Riprova.';
      }
    }
  }

  onLogin(): void {
    this.auth.login(this.returnUrl ?? undefined);
  }
}
