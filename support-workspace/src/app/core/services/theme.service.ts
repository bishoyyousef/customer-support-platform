import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject: BehaviorSubject<Theme>;
  public currentTheme$: Observable<Theme>;

  constructor() {
    const savedTheme = (localStorage.getItem('heroui_theme') as Theme) || 'light';
    this.themeSubject = new BehaviorSubject<Theme>(savedTheme);
    this.currentTheme$ = this.themeSubject.asObservable();
    this.applyTheme(savedTheme);
  }

  public get currentTheme(): Theme {
    return this.themeSubject.value;
  }

  public toggleTheme(): void {
    const nextTheme: Theme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
  }

  public setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem('heroui_theme', theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
