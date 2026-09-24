// ─── localStorage protégé ─────────────────────────────────────────
// Safari iOS ≤ 10 en navigation privée lève une exception à l'écriture :
// on l'ignore pour ne pas faire planter l'application.

export function storageGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function storageSet(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function storageRemove(key: string): void {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}
