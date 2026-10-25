import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly isDarkMode = this.theme.isDarkMode;
  readonly isLoginPage = signal<boolean>(false);
  readonly avatarLoadFailed = signal<boolean>(false);

  constructor() {
    effect(() => {
      this.auth.currentUser();
      untracked(() => {
        this.avatarLoadFailed.set(false);
      });
    });
  }

  ngOnInit() {
    this.auth.initAuth();
    this.updateIsLoginPage(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateIsLoginPage(event.urlAfterRedirects || event.url);
      });
  }

  toggleTheme() {
    this.theme.toggleTheme();
  }

  onAvatarError(): void {
    this.avatarLoadFailed.set(true);
  }

  private updateIsLoginPage(url: string | undefined) {
    this.isLoginPage.set(Boolean(url && url.startsWith('/login')));
  }
}
