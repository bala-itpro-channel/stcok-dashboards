import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';

interface Quote {
  symbol: string;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private static readonly symbolsStorageKey = 'stock-dashboard-symbols';
  private readonly http = inject(HttpClient);
  protected readonly symbolsInput = signal('AAPL, MSFT, GOOGL, AMZN');
  protected readonly quotes = signal<Quote[]>([]);
  protected readonly sortedQuotes = computed(() =>
    [...this.quotes()].sort((left, right) => this.profit(right) - this.profit(left)),
  );
  protected readonly loading = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly error = signal('');
  protected readonly hasSearched = signal(false);
  protected readonly lastUpdated = signal<Date | null>(null);
  protected readonly formattedLastUpdated = computed(() => {
    const date = this.lastUpdated();
    return date ? date.toLocaleTimeString() : '';
  });
  protected readonly maxPrice = computed(() => {
    const prices = this.quotes().flatMap((quote) => [quote.previousClose, quote.open, quote.close]);
    return Math.max(...prices, 1);
  });

  constructor() {
    const storedSymbols = this.readStoredSymbols();
    if (storedSymbols) {
      this.symbolsInput.set(storedSymbols);
    }

    timer(0, 30000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.fetchQuotes(true);
      });
  }

  protected fetchQuotes(isAutoRefresh = false): void {
    const symbols = this.symbolsInput()
      .split(',')
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);

    if (symbols.length === 0) {
      this.error.set('Enter at least one comma-separated symbol.');
      this.quotes.set([]);
      this.hasSearched.set(true);
      return;
    }

    if (isAutoRefresh && this.quotes().length > 0) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.error.set('');
    this.hasSearched.set(true);

    this.http
      .get<
        Record<
          string,
          {
            previous_close?: string;
            open?: string;
            high?: string;
            low?: string;
            close?: string;
            volume?: string;
            status?: string;
          }
        >
      >(`http://localhost:3000/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`)
      .subscribe({
        next: (data) => {
          const nextQuotes = Object.entries(data)
            .filter(([, details]) => details.status !== 'error')
            .map(([symbol, details]) => ({
              symbol,
              previousClose: Number(details.previous_close),
              open: Number(details.open),
              high: Number(details.high),
              low: Number(details.low),
              close: Number(details.close),
              volume: Number(details.volume),
            }))
            .filter(
              (quote) =>
                Number.isFinite(quote.previousClose) &&
                Number.isFinite(quote.open) &&
                Number.isFinite(quote.high) &&
                Number.isFinite(quote.low) &&
                Number.isFinite(quote.close) &&
                Number.isFinite(quote.volume),
            );

          this.quotes.set(nextQuotes);
          this.lastUpdated.set(new Date());
          if (nextQuotes.length === 0) {
            this.error.set('No quote data was returned for those symbols.');
          }
          this.loading.set(false);
          this.refreshing.set(false);
        },
        error: (response) => {
          if (!isAutoRefresh) {
            this.quotes.set([]);
          }
          this.error.set(response.error?.error || 'Unable to load stock quotes.');
          this.loading.set(false);
          this.refreshing.set(false);
        },
      });
  }

  protected setSymbols(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.symbolsInput.set(value);

    if (value.trim()) {
      this.saveSymbols(value);
    }
  }

  private readStoredSymbols(): string | null {
    try {
      return localStorage.getItem(Dashboard.symbolsStorageKey)?.trim() || null;
    } catch {
      return null;
    }
  }

  private saveSymbols(symbols: string): void {
    try {
      localStorage.setItem(Dashboard.symbolsStorageKey, symbols.trim());
    } catch {}
  }

  protected barHeight(value: number): string {
    return `${Math.max((value / this.maxPrice()) * 100, 3)}%`;
  }

  protected profit(quote: Quote): number {
    return quote.close - quote.previousClose;
  }

  protected percentageChange(quote: Quote): number {
    return (this.profit(quote) / quote.previousClose) * 100;
  }

  protected formatProfit(quote: Quote): string {
    const value = this.profit(quote);
    return `${value < 0 ? '-$' : '+$'}${Math.abs(value).toFixed(2)}`;
  }

  protected formatPercentageChange(quote: Quote): string {
    const value = this.percentageChange(quote);
    return `${value < 0 ? '-' : '+'}${Math.abs(value).toFixed(2)}%`;
  }

  protected formatVolume(quote: Quote): string {
    return new Intl.NumberFormat('en-US').format(quote.volume);
  }

  protected trendClass(quote: Quote): string {
    if (quote.close < quote.previousClose) {
      return 'trend-red';
    }

    if (quote.close < quote.open && quote.close > quote.previousClose) {
      return 'trend-blue';
    }

    if (quote.open > quote.previousClose && quote.close > quote.previousClose) {
      return 'trend-green';
    }

    return 'trend-neutral';
  }
}
