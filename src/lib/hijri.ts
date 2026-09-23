// ─── Date Hégirienne ──────────────────────────────────────────────
// Utilise Intl (calendrier islamique) quand il est disponible, sinon
// un calcul tabulaire (algorithme « koweïtien »). Le repli est
// nécessaire sur iOS 9 (iPad 2) où Intl n'existe pas.

const MONTHS_FR = [
  'Mouharram', 'Safar', 'Rabia al awal', 'Rabia ath-thani',
  'Joumada al oula', 'Joumada ath-thania', 'Rajab', 'Chaabane',
  'Ramadan', 'Chawwal', 'Dhou al-qi’da', 'Dhou al-hijja',
];

export interface HijriDate {
  label: string;  // « 12 Ramadan 1447 AH »
  day:   number;  // 1..30
}

function tabularHijri(date: Date): { day: number; month: number; year: number } {
  // Jour julien (midi local)
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jd = d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;

  // Calendrier islamique tabulaire (époque civile : 16 juillet 622)
  const l0 = jd - 1948440 + 10632;
  const n  = Math.floor((l0 - 1) / 10631);
  const l1 = l0 - 10631 * n + 354;
  const j  = Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719)
    + Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238);
  const l2 = l1 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l2) / 709);
  const day   = l2 - Math.floor((709 * month) / 24);
  const year  = 30 * n + j - 30;
  return { day, month, year };
}

function intlHijri(date: Date): HijriDate | null {
  if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) return null;
  try {
    const dayStr = new Intl.DateTimeFormat('en-u-ca-islamic', { day: 'numeric' }).format(date);
    const yearStr = new Intl.DateTimeFormat('en-u-ca-islamic', { year: 'numeric' }).format(date);
    // Certains moteurs ignorent « -u-ca-islamic » et renvoient l'année grégorienne
    if (parseInt(yearStr, 10) > 1700) return null;
    const label = new Intl.DateTimeFormat('fr-FR-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(date);
    return { label, day: parseInt(dayStr, 10) || 15 };
  } catch {
    return null;
  }
}

export function getHijriDate(date: Date = new Date()): HijriDate {
  const fromIntl = intlHijri(date);
  if (fromIntl) return fromIntl;
  const h = tabularHijri(date);
  return { label: `${h.day} ${MONTHS_FR[h.month - 1]} ${h.year} AH`, day: h.day };
}
