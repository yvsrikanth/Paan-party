export interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Share the app address, without invoice IDs, login parameters or fragments.
export function appHomeUrl(address: string): string {
  const url = new URL(address);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
  return new URL('/', url.origin).href;
}

export function runningAsApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
