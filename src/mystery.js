// When a word is not in the library we still render *something*: a friendly
// "mystery creature" grown deterministically from the word itself, with facts
// that nudge the child to go find out more.
import { sphere, box, cone, cyl, eyes, legs4, legs2, tail, neck, spine, wing, bob, swing, ground, lighten, belly as bellyPatch } from './builders.js';

function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
}

const PALETTE = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#9775fa', '#f783ac', '#63e6be', '#a9e34b'];

function kindFor(word, r) {
  const w = word.toLowerCase();
  if (/saur|raptor|rex|dino|don$|dactyl|ceratops/.test(w)) return 'dino';
  if (/fish|shark|whale|eel|squid|trout|salmon|orca/.test(w)) return 'fish';
  if (/bird|eagle|owl|parrot|hawk|duck|chicken|hen|crow|robin|flamingo|swan|goose|pigeon|seagull/.test(w)) return 'bird';
  if (/bug|ant|beetle|fly|moth|wasp|cricket|grasshopper|dragonfly|ladybug/.test(w)) return 'bug';
  if (/planet|star|comet|asteroid|neptune|uranus|venus|mercury|pluto|galaxy|nebula/.test(w)) return 'planet';
  return ['dino', 'quad', 'bird', 'blob', 'quad'][Math.floor(r() * 5)];
}

export function buildMystery(word) {
  const r = rng(word.toLowerCase());
  const kind = kindFor(word, r);
  const color = PALETTE[Math.floor(r() * PALETTE.length)];
  let color2 = PALETTE[Math.floor(r() * PALETTE.length)];
  if (color2 === color) color2 = lighten(color, 0.4);
  const belly = lighten(color, 0.45);
  const pattern = ['none', 'spots', 'stripes', 'none'][Math.floor(r() * 4)];
  const parts = [];

  if (kind === 'planet') {
    parts.push(sphere([0, 2.5, 0], 2.2, color, { color2, pattern: ['blobs', 'bands', 'spots'][Math.floor(r() * 3)], patternScale: 1 + r() * 2, anim: [{ type: 'spin', axis: [0.2, 1, 0], speed: 0.3, pivot: [0, 2.5, 0] }] }));
    if (r() > 0.5) parts.push({ shape: 'torus', pos: [0, 2.5, 0], scale: [3.2, 0.2, 3.2], color: color2, rot: [20 + r() * 20, 0, 0], alpha: 0.85 });
    for (let i = 0; i < 70; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rad = 30 + r() * 8;
      parts.push(sphere([rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph) * 0.6 + 4, rad * Math.sin(ph) * Math.sin(th)], 0.08 + r() * 0.12, '#fff', { emissive: true, color2: '#fff', fit: false }));
    }
    return { parts, scene: { sky: ['#05071a', '#1b1f4a'], ground: '#000', space: true } };
  }

  const size = 0.8 + r() * 0.6;
  const bodyY = 1.6 * size + (kind === 'bird' || kind === 'bug' ? 0.8 : 0);
  const bodyScale = [1.5 * size, (0.8 + r() * 0.4) * size, (0.8 + r() * 0.3) * size];
  const a = [bob(0.04)];
  parts.push(sphere([0, bodyY, 0], bodyScale, color, { color2, pattern, patternScale: 2, anim: a }));
  parts.push(bellyPatch([0, bodyY, 0], bodyScale, belly, { anim: a }));

  const n = neck({ start: [bodyScale[0] * 0.85, bodyY + bodyScale[1] * 0.3, 0], len: (0.5 + r() * 1.8) * size, segs: 4, radius: 0.35 * size, angle: 25 + r() * 45, color, color2, pattern, patternScale: 2 });
  parts.push(...n.parts);
  const [hx, hy] = n.end;
  const headS = (0.45 + r() * 0.3) * size;
  const ha = [bob(0.05, 2.4, 0.5)];
  parts.push(sphere([hx + headS * 0.5, hy + 0.05, 0], [headS * 1.2, headS, headS], color, { anim: ha }));
  if (kind === 'bird' || r() > 0.5) parts.push(cone([hx + headS * 1.7, hy - 0.05, 0], [headS * 0.3, headS * 0.9, headS * 0.3], kind === 'bird' ? '#ffb703' : lighten(color, 0.2), { rot: [0, 0, -90], anim: ha }));
  parts.push(...eyes([hx + headS * 0.9, hy + headS * 0.3, 0], headS * 0.5, headS * 0.28, { anim: ha }));
  if (r() > 0.5) parts.push(...[-1, 1].map((s) => cone([hx + headS * 0.3, hy + headS * 0.8, s * headS * 0.5], [headS * 0.2, headS * 0.8, headS * 0.2], color2, { rot: [0, 0, -20], anim: ha })));

  if (kind === 'dino') {
    parts.push(...legs2({ x: -0.2 * size, len: bodyY - bodyScale[1] * 0.5, thick: 0.25 * size, color, spreadZ: bodyScale[2] * 0.6 }));
    if (r() > 0.4) parts.push(...spine({ fromX: -bodyScale[0] * 0.7, toX: bodyScale[0] * 0.6, y: bodyY + bodyScale[1] * 0.75, count: 5, size: 0.9 * size, color: color2, plate: r() > 0.5 }));
    for (const s of [-1, 1]) parts.push(cyl([bodyScale[0] * 0.6, bodyY - 0.4 * size, s * bodyScale[2] * 0.7], [0.1, 0.5 * size, 0.1], color, { rot: [0, 0, -50], anim: a }));
  } else if (kind === 'quad') {
    parts.push(...legs4({ frontX: bodyScale[0] * 0.55, backX: -bodyScale[0] * 0.55, len: bodyY - bodyScale[1] * 0.4, thick: 0.22 * size, color, spreadZ: bodyScale[2] * 0.6 }));
  } else if (kind === 'bird' || kind === 'bug') {
    for (const s of [-1, 1]) parts.push(wing({ root: [0, bodyY, s * bodyScale[2] * 0.5], span: 2.4 * size, chord: 0.9 * size, color: color2, side: s, flap: 0.6, speed: kind === 'bug' ? 14 : 3 }));
    for (const s of [-1, 1]) parts.push(cyl([0, bodyY - bodyScale[1] - 0.2, s * 0.25], [0.05, 0.5, 0.05], '#ffb703', { anim: a }));
  } else if (kind === 'fish') {
    parts.push(cone([0, bodyY + bodyScale[1] * 0.9, 0], [0.2, 0.8 * size, 0.5 * size], color2, { rot: [0, 0, 20], anim: a }));
    for (const s of [-1, 1]) parts.push(cone([0.3, bodyY - 0.2, s * bodyScale[2] * 0.9], [0.15, 0.7 * size, 0.35 * size], color2, { rot: [s * 100, 0, 20], anim: a }));
  } else {
    parts.push(...legs4({ frontX: bodyScale[0] * 0.4, backX: -bodyScale[0] * 0.4, len: bodyY - bodyScale[1] * 0.5, thick: 0.3 * size, color, spreadZ: bodyScale[2] * 0.5, amp: 0.15 }));
  }
  if (kind !== 'bug') parts.push(...tail({ start: [-bodyScale[0] * 0.9, bodyY, 0], len: (1 + r() * 2.2) * size, segs: 6, radius: 0.3 * size, angle: r() * 30, curl: r() * 0.6, color, color2, pattern, patternScale: 2 }));

  const scene = kind === 'fish'
    ? { sky: ['#4aa3ff', '#cfe9ff'], ground: '#2f7fc2' }
    : { sky: ['#b6e0ff', '#fff3e0'], ground: ['#8cd16a', '#f3c6a2', '#c9b6ff', '#ffe08a'][Math.floor(r() * 4)] };
  const flyer = kind === 'bird' || kind === 'bug';
  return { parts: flyer ? parts : ground(parts), scene };
}

export function mysteryConcept(word) {
  const pretty = word.trim().replace(/\s+/g, ' ');
  const title = pretty.charAt(0).toUpperCase() + pretty.slice(1);
  const { parts, scene } = buildMystery(pretty);
  return {
    id: `mystery:${pretty.toLowerCase()}`,
    name: title,
    emoji: '✨',
    category: 'Mystery',
    mystery: true,
    scene,
    build: () => parts,
    facts: [
      `I do not know "${title}" yet, so I imagined a mystery friend for you!`,
      `Can you ask a grown-up what a ${pretty.toLowerCase()} really looks like?`,
      'Scientists learn new things by asking questions and looking closely. You can too!',
      'Try typing a dinosaur, an animal, a planet, or a machine to meet a friend I know.',
    ],
    quiz: [
      { q: 'What is a great way to learn about something new?', options: ['Ask questions and look closely', 'Never think about it'], answer: 0 },
    ],
  };
}
