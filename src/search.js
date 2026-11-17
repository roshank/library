// Forgiving lookup: five-year-olds (and their grown-ups) make typos.
import { LIBRARY } from './library.js';

export const normalize = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function bigrams(s) {
  const out = new Map();
  const str = ` ${s} `;
  for (let i = 0; i < str.length - 1; i++) {
    const g = str.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}

/** Sørensen–Dice similarity on character bigrams: 0..1. */
export function similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const ga = bigrams(a), gb = bigrams(b);
  let inter = 0, total = 0;
  for (const [g, n] of ga) { total += n; if (gb.has(g)) inter += Math.min(n, gb.get(g)); }
  for (const n of gb.values()) total += n;
  return (2 * inter) / total;
}

export function findConcept(query) {
  const q = normalize(query);
  if (!q) return null;
  let best = null, bestScore = 0;
  for (const c of LIBRARY) {
    const names = [c.name, c.id, ...c.aliases].map(normalize);
    for (const n of names) {
      let score = 0;
      if (n === q) score = 1;
      else if (n.startsWith(q) && q.length >= 3) score = 0.92;
      else if (q.startsWith(n) && n.length >= 3) score = 0.9;
      else if (n.includes(q) && q.length >= 4) score = 0.85;
      else score = similarity(q, n) * 0.84;
      if (score > bestScore) { bestScore = score; best = c; }
    }
  }
  return bestScore >= 0.55 ? best : null;
}

/** A few suggestions that resemble the query, for "did you mean?". */
export function suggest(query, n = 4) {
  const q = normalize(query);
  return LIBRARY
    .map((c) => ({ c, s: Math.max(...[c.name, ...c.aliases].map((a) => similarity(q, normalize(a)))) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.c);
}
