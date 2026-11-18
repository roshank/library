import { sphere, box, cone, cyl, torus, eyes, legs4, legs2, tail, neck, wing, bob, swing, spin, ground, lighten, belly as bellyPatch } from './builders.js';

const savanna = { sky: ['#81c7ff', '#c9c1a8'], ground: '#d7b56e', groundType: 'sand', sun: [0.5, 0.45, 0.6], sunColor: '#ffd9a8', sunPower: 4.6, fog: 0.0001 };
const meadow = { sky: ['#70c2ff', '#a3c3df'], ground: '#74a849', groundType: 'grass', sun: [0.4, 0.75, 0.5] };
const ocean = { sky: ['#5aaeff', '#95bddf'], ground: '#2674a8', groundType: 'water', sun: [0.4, 0.7, 0.55] };
const ice = { sky: ['#a3e0ff', '#c7dcea'], ground: '#e4edf5', groundType: 'snow', sun: [0.4, 0.5, 0.6], sunColor: '#fff4e4' };
const home = { sky: ['#cde5ff', '#c9c4bd'], ground: '#a88664', groundType: 'rock', sun: [0.4, 0.75, 0.5] };
const FUR = { skin: 'fur', pattern: 'mottle', rough: 0.78, sss: 0.4 };
const HIDE = { skin: 'rough', pattern: 'mottle', rough: 0.72, sss: 0.3 };
const SLEEK = { skin: 'smooth', pattern: 'mottle', rough: 0.3, sss: 0.3 };
const jungle = { sky: ['#70c2ff', '#9cbdd9'], ground: '#5a8f3d', groundType: 'grass', sun: [0.4, 0.75, 0.5], fog: 0.0001 };
const SHELL = { skin: 'scales', pattern: 'mottle', rough: 0.5, sss: 0.2 };

function mammal({ color, belly, bodyScale, bodyY, legLen, thick, head, tailOpts, extras = () => [], pattern, color2, patternScale, legSpeed = 3, legColor }) {
  const parts = [];
  parts.push(sphere([0, bodyY, 0], bodyScale, color, { pattern, color2, patternScale, anim: [bob(0.03)] }));
  if (belly) parts.push(bellyPatch([0, bodyY, 0], bodyScale, belly, { pattern, patternScale, anim: [bob(0.03)] }));
  parts.push(...legs4({ frontX: bodyScale[0] * 0.6, backX: -bodyScale[0] * 0.6, len: legLen, thick, color: legColor || color, spreadZ: bodyScale[2] * 0.5, speed: legSpeed, footColor: lighten(legColor || color, 0.1) }));
  parts.push(...head({ x: bodyScale[0] * 0.9, y: bodyY + bodyScale[1] * 0.4 }));
  if (tailOpts) parts.push(...tail({ start: [-bodyScale[0] * 0.9, bodyY + 0.2, 0], color, pattern, color2, patternScale, ...tailOpts }));
  parts.push(...extras());
  return ground(parts);
}

function ears(x, y, z, size, color, inner, rot = 0) {
  return [-1, 1].flatMap((s) => [
    sphere([x, y, s * z], [size * 0.5, size, size * 0.3], color, { rot: [s * rot, 0, 0], anim: [bob(0.04, 3, 0.3)] }),
    sphere([x + 0.03, y, s * z], [size * 0.3, size * 0.7, size * 0.25], inner, { rot: [s * rot, 0, 0], anim: [bob(0.04, 3, 0.3)] }),
  ]);
}

function catLike({ color, belly, color2, pattern, patternScale, mane, size = 1, snoutColor, earColor }) {
  const S = size;
  return mammal({
    color, belly, color2, pattern, patternScale,
    bodyScale: [1.5 * S, 0.75 * S, 0.7 * S], bodyY: 1.25 * S, legLen: 0.85 * S, thick: 0.2 * S,
    head: ({ x, y }) => {
      const a = [bob(0.04, 3, 0.3)];
      const hx = x + 0.3 * S, hy = y + 0.1 * S;
      const out = [
        sphere([hx, hy, 0], [0.62 * S, 0.58 * S, 0.6 * S], color, { pattern, color2, patternScale, anim: a }),
        sphere([hx + 0.45 * S, hy - 0.15 * S, 0], [0.32 * S, 0.24 * S, 0.3 * S], snoutColor || lighten(color, 0.3), { anim: a }),
        sphere([hx + 0.72 * S, hy - 0.08 * S, 0], 0.09 * S, '#473333', { anim: a }),
        ...ears(hx - 0.1 * S, hy + 0.5 * S, 0.38 * S, 0.3 * S, earColor || color, '#f3b5b5', 20),
        ...eyes([hx + 0.35 * S, hy + 0.12 * S, 0], 0.26 * S, 0.11 * S, { anim: a }),
      ];
      if (mane) out.unshift(sphere([hx - 0.1 * S, hy, 0], [0.75 * S, 0.95 * S, 1.0 * S], mane, { anim: a }));
      return out;
    },
    tailOpts: { len: 1.5 * S, segs: 6, radius: 0.13 * S, angle: 35, curl: 0.5, wag: 0.5, speed: 2.5 },
  });
}

export const ANIMALS = [
  {
    id: 'elephant', name: 'Elephant', emoji: '🐘', category: 'Animals',
    aliases: ['elephant', 'elefant', 'elephants', 'elly'],
    scene: savanna,
    material: HIDE,
    build: () => mammal({
      color: '#9b9692', belly: '#aea8a3', bodyScale: [2.0, 1.4, 1.35], bodyY: 2.2, legLen: 1.4, thick: 0.4,
      head: ({ x, y }) => {
        const a = [bob(0.03, 2.4, 0.3)];
        const hx = x + 0.45, hy = y - 0.15;
        const trunkPivot = [hx + 0.6, hy - 0.4, 0];
        const trunk = [];
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          trunk.push(sphere([trunkPivot[0] + 0.25 + t * 0.35 - t * t * 0.4, trunkPivot[1] - t * 1.5, 0], [0.26 - t * 0.1, 0.3, 0.26 - t * 0.1], '#9b9692', { anim: [swing(trunkPivot, [0, 0, 1], 0.25 * (0.3 + t), 2, 0.5), ...a] }));
        }
        return [
          sphere([hx, hy, 0], [0.95, 0.95, 0.9], '#9b9692', { anim: a }),
          ...[-1, 1].map((s) => sphere([hx - 0.15, hy + 0.1, s * 0.95], [0.5, 0.9, 0.12], '#928c87', { rot: [s * 10, 0, 0], anim: [swing([hx - 0.15, hy + 0.1, s * 0.55], [1, 0, 0], 0.15 * s, 1.5, s), ...a] })),
          ...[-1, 1].map((s) => cone([hx + 0.7, hy - 0.45, s * 0.42], [0.09, 0.75, 0.09], '#efe6cf', { hard: true, rough: 0.35, rot: [0, 0, -95], anim: a })),
          ...trunk,
          ...eyes([hx + 0.7, hy + 0.2, 0], 0.4, 0.12, { anim: a }),
        ];
      },
      tailOpts: { len: 1.2, segs: 4, radius: 0.12, angle: -40, wag: 0.5 },
    }),
    facts: [
      'Elephants are the biggest animals that live on land.',
      'An elephant\'s long nose is called a trunk. It uses it to grab food, drink, and even give hugs!',
      'Elephants flap their big ears to keep cool.',
      'Baby elephants are called calves. They suck on their trunks like a thumb.',
      'Elephants love to play in water and squirt themselves with mud to stay cool.',
    ],
    quiz: [
      { q: 'What is an elephant\'s long nose called?', options: ['A trunk', 'A tail', 'A snout'], answer: 0 },
      { q: 'Why do elephants flap their ears?', options: ['To fly', 'To keep cool'], answer: 1 },
    ],
  },
  {
    id: 'giraffe', name: 'Giraffe', emoji: '🦒', category: 'Animals',
    aliases: ['giraffe', 'giraf', 'jiraffe', 'giraffes'],
    scene: savanna,
    material: FUR,
    build: () => {
      const color = '#ffd995', spots = '#985e2d';
      const parts = mammal({
        color, color2: spots, pattern: 'spots', patternScale: 2.6, belly: '#e8d7b5',
        bodyScale: [1.4, 0.95, 0.85], bodyY: 2.6, legLen: 2.1, thick: 0.2, legSpeed: 2,
        head: ({ x, y }) => {
          const n = neck({ start: [x - 0.3, y + 0.1, 0], len: 3.2, segs: 7, radius: 0.42, angle: 72, color, color2: spots, pattern: 'spots', patternScale: 2.6, taper: 0.25 });
          const [hx, hy] = n.end;
          const a = [bob(0.05, 2.4, 0.5)];
          return [...n.parts,
            sphere([hx + 0.3, hy + 0.15, 0], [0.62, 0.45, 0.42], color, { anim: a }),
            sphere([hx + 0.75, hy + 0.05, 0], [0.32, 0.28, 0.32], '#fae0b5', { anim: a }),
            ...[-1, 1].flatMap((s) => [
              cyl([hx + 0.15, hy + 0.6, s * 0.2], [0.05, 0.4, 0.05], color, { anim: a }),
              sphere([hx + 0.15, hy + 0.82, s * 0.2], 0.1, '#834d23', { anim: a }),
              sphere([hx - 0.05, hy + 0.45, s * 0.42], [0.1, 0.25, 0.08], color, { rot: [s * 40, 0, 0], anim: a }),
            ]),
            ...eyes([hx + 0.55, hy + 0.3, 0], 0.3, 0.1, { anim: a })];
        },
        tailOpts: { len: 1.3, segs: 4, radius: 0.08, angle: -60, wag: 0.5, speed: 3 },
      });
      return parts;
    },
    facts: [
      'Giraffes are the tallest animals in the world. They are as tall as a two-storey house!',
      'A giraffe\'s neck has the same number of bones as yours, but each bone is really, really long.',
      'Giraffes have a long dark purple tongue for grabbing leaves off thorny trees.',
      'Every giraffe has its own pattern of spots, like a fingerprint.',
      'Giraffes only sleep for a few minutes at a time, often standing up!',
    ],
    quiz: [
      { q: 'Giraffes are the ______ animals in the world.', options: ['Tallest', 'Smallest', 'Loudest'], answer: 0 },
      { q: 'What colour is a giraffe\'s tongue?', options: ['Pink', 'Dark purple'], answer: 1 },
    ],
  },
  {
    id: 'lion', name: 'Lion', emoji: '🦁', category: 'Animals',
    aliases: ['lion', 'lions', 'lioness', 'king of the jungle'],
    scene: savanna,
    material: FUR,
    build: () => catLike({ color: '#f5c981', belly: '#fffdcb', mane: '#955c29', size: 1.15 }),
    facts: [
      'Lions are big cats. A daddy lion has a fluffy mane around his head.',
      'A lion\'s roar is so loud you can hear it from far, far away.',
      'Lions live together in a family group called a pride.',
      'Lions sleep a lot, up to 20 hours a day!',
      'Baby lions are called cubs, and they love to play and pounce.',
    ],
    quiz: [
      { q: 'What is a lion family called?', options: ['A pride', 'A flock', 'A school'], answer: 0 },
      { q: 'Lions sleep...', options: ['Just a little', 'A whole lot'], answer: 1 },
    ],
  },
  {
    id: 'tiger', name: 'Tiger', emoji: '🐯', category: 'Animals',
    aliases: ['tiger', 'tigers', 'tigger'],
    scene: { ...jungle },
    material: FUR,
    build: () => catLike({ color: '#ff9f39', belly: '#efe3cf', color2: '#332014', pattern: 'stripes', patternScale: 1.5, size: 1.15 }),
    facts: [
      'Tigers are the biggest cats in the world.',
      'Every tiger has its own pattern of stripes. No two tigers look exactly the same.',
      'Tigers love to swim, unlike most cats.',
      'A tiger\'s roar can be heard from very far away.',
      'Tigers are striped right down to their skin, not just their fur!',
    ],
    quiz: [
      { q: 'Do tigers like water?', options: ['Yes, they love to swim', 'No, never'], answer: 0 },
      { q: 'What pattern does a tiger have?', options: ['Spots', 'Stripes'], answer: 1 },
    ],
  },
  {
    id: 'zebra', name: 'Zebra', emoji: '🦓', category: 'Animals',
    aliases: ['zebra', 'zebras', 'stripy horse'],
    scene: savanna,
    material: FUR,
    build: () => mammal({
      color: '#e4e2dc', color2: '#232329', pattern: 'stripes', patternScale: 2.2,
      bodyScale: [1.5, 0.85, 0.75], bodyY: 1.7, legLen: 1.3, thick: 0.17, legColor: '#dddbd5',
      head: ({ x, y }) => {
        const n = neck({ start: [x - 0.3, y, 0], len: 1.2, segs: 4, radius: 0.4, angle: 55, color: '#e4e2dc', color2: '#232329', pattern: 'stripes', patternScale: 2.2, taper: 0.2 });
        const [hx, hy] = n.end;
        const a = [bob(0.05, 2.4, 0.5)];
        return [...n.parts,
          sphere([hx + 0.35, hy + 0.1, 0], [0.7, 0.42, 0.4], '#e4e2dc', { color2: '#232329', pattern: 'stripes', patternScale: 2.2, anim: a }),
          sphere([hx + 0.85, hy, 0], [0.3, 0.28, 0.3], '#333338', { anim: a }),
          ...[-1, 1].map((s) => sphere([hx + 0.05, hy + 0.45, s * 0.25], [0.12, 0.28, 0.1], '#e4e2dc', { anim: a })),
          ...Array.from({ length: 5 }, (_, i) => sphere([n.parts[0].pos[0] - 0.1 + i * 0.22, n.parts[0].pos[1] + 0.35 + i * 0.3, 0], [0.15, 0.3, 0.08], '#232329', { anim: a })),
          ...eyes([hx + 0.6, hy + 0.25, 0], 0.3, 0.1, { anim: a })];
      },
      tailOpts: { len: 1.1, segs: 4, radius: 0.08, angle: -55, wag: 0.5, speed: 3 },
    }),
    facts: [
      'Zebras are striped horses that live in Africa.',
      'Every zebra has its own special stripe pattern.',
      'Stripes may help confuse lions and keep biting flies away.',
      'Zebras live in big groups called herds and look after each other.',
      'A baby zebra can run just one hour after it is born!',
    ],
    quiz: [
      { q: 'What colours are a zebra\'s stripes?', options: ['Black and white', 'Red and blue'], answer: 0 },
      { q: 'Zebras live in groups called...', options: ['Herds', 'Pods', 'Packs'], answer: 0 },
    ],
  },
  {
    id: 'shark', name: 'Shark', emoji: '🦈', category: 'Animals',
    aliases: ['shark', 'sharks', 'great white', 'great white shark', 'jaws'],
    scene: ocean,
    material: SLEEK,
    build: () => {
      const color = '#748798', belly = '#d8dde2';
      const parts = [];
      const y = 2.0;
      const a = [bob(0.08, 1.6)];
      parts.push(sphere([0, y, 0], [2.0, 0.72, 0.62], color, { anim: a }));
      parts.push(bellyPatch([0, y, 0], [2.0, 0.72, 0.62], belly, { anim: a }));
      parts.push(cone([-1.6, y + 0.0, 0], [0.4, 1.0, 0.25], color, { rot: [0, 0, 90 + 25], anim: a }));
      parts.push(cone([0.1, y + 1.0, 0], [0.2, 1.1, 0.75], color, { rot: [0, 0, 20], anim: a }));
      for (const s of [-1, 1]) parts.push(cone([0.5, y - 0.3, s * 0.95], [0.18, 1.0, 0.5], color, { rot: [s * 100, 0, 20], anim: a }));
      // tail fin (vertical) wags
      const tp = [-2.0, y, 0];
      const wag = [swing(tp, [0, 1, 0], 0.35, 3.2), ...a];
      parts.push(cone([-2.4, y + 0.45, 0], [0.15, 1.1, 0.5], color, { rot: [0, 0, 30], anim: wag }));
      parts.push(cone([-2.35, y - 0.4, 0], [0.15, 0.8, 0.45], color, { rot: [0, 0, 180 - 30], anim: wag }));
      parts.push(sphere([1.45, y - 0.28, 0], [0.62, 0.1, 0.42], '#333341', { anim: a }));
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) parts.push(cone([1.35 + i * 0.16, y - 0.2, s * (0.38 - i * 0.09)], [0.04, 0.12, 0.04], '#ffffff', { rot: [0, 0, 180], anim: a }));
      for (let i = 0; i < 4; i++) parts.push(box([-0.2 - i * 0.18, y - 0.05, 0.6], [0.05, 0.25, 0.03], '#556470', { anim: a }), box([-0.2 - i * 0.18, y - 0.05, -0.6], [0.05, 0.25, 0.03], '#556470', { anim: a }));
      parts.push(...eyes([1.1, y + 0.2, 0], 0.45, 0.1, { anim: a }));
      return parts;
    },
    facts: [
      'Sharks are fish that have lived in the ocean since before the dinosaurs!',
      'Sharks have lots of rows of teeth. When one falls out, a new one moves forward.',
      'Sharks don\'t have bones. Their skeletons are made of bendy cartilage, like your ears.',
      'There are more than 500 kinds of sharks. Some are as small as your hand!',
      'The biggest shark is the whale shark. It is gentle and eats tiny sea creatures.',
    ],
    quiz: [
      { q: 'What happens when a shark loses a tooth?', options: ['A new one grows in', 'It has no more teeth'], answer: 0 },
      { q: 'Sharks are a kind of...', options: ['Fish', 'Bird', 'Bug'], answer: 0 },
    ],
  },
  {
    id: 'whale', name: 'Blue Whale', emoji: '🐋', category: 'Animals',
    aliases: ['whale', 'blue whale', 'whales', 'wale', 'humpback'],
    scene: ocean,
    material: SLEEK,
    build: () => {
      const color = '#5a7495', belly = '#d4e0ef';
      const parts = [];
      const y = 2.0;
      const a = [bob(0.1, 1.4)];
      parts.push(sphere([0, y, 0], [3.0, 1.0, 1.0], color, { anim: a }));
      parts.push(bellyPatch([0, y, 0], [3.0, 1.0, 1.0], belly, { anim: a }));
      const tp = [-2.6, y, 0];
      const wag = [swing(tp, [0, 0, 1], 0.25, 1.4, 1), ...a];
      parts.push(sphere([-3.2, y + 0.05, 0], [0.8, 0.3, 0.3], color, { anim: wag }));
      for (const s of [-1, 1]) parts.push(sphere([-3.9, y + 0.1, s * 0.75], [0.6, 0.08, 0.6], color, { rot: [0, s * 20, 0], anim: wag }));
      for (const s of [-1, 1]) parts.push(sphere([0.9, y - 0.45, s * 1.0], [0.75, 0.08, 0.35], color, { rot: [s * 25, 0, 15], anim: [swing([0.9, y - 0.45, s * 0.6], [1, 0, 0], 0.25 * s, 1.4), ...a] }));
      // water spout
      for (let i = 0; i < 4; i++) parts.push(sphere([1.6, y + 1.1 + i * 0.3, (i % 2 ? 0.1 : -0.1) * i], [0.12 + i * 0.05, 0.25, 0.12 + i * 0.05], '#dff3ff', { alpha: 0.75, anim: [bob(0.15, 2.4, i)] }));
      parts.push(cyl([-0.1, y + 0.6, 0], [0.8, 0.8, 0.3], color, { rot: [0, 0, 0], anim: a }));
      parts.push(...eyes([2.4, y + 0.1, 0], 0.72, 0.12, { anim: a }));
      parts.push(box([2.95, y - 0.35, 0], [0.5, 0.06, 0.6], '#34475a', { anim: a }));
      return parts;
    },
    facts: [
      'The blue whale is the biggest animal that has ever lived, even bigger than any dinosaur!',
      'A blue whale\'s heart is as big as a small car.',
      'Blue whales eat tiny shrimp-like animals called krill. They eat millions of them every day.',
      'Whales are not fish. They breathe air through a blowhole on top of their heads.',
      'Blue whales make the loudest sounds of any animal, and other whales can hear them from far away.',
    ],
    quiz: [
      { q: 'How does a whale breathe?', options: ['Through a blowhole', 'With gills', 'Through its tail'], answer: 0 },
      { q: 'The blue whale is...', options: ['The biggest animal ever', 'A tiny animal'], answer: 0 },
    ],
  },
  {
    id: 'dolphin', name: 'Dolphin', emoji: '🐬', category: 'Animals',
    aliases: ['dolphin', 'dolphins', 'dolfin', 'porpoise'],
    scene: ocean,
    material: SLEEK,
    build: () => {
      const color = '#95abbc', belly = '#dfe6ea';
      const parts = [];
      const y = 2.0;
      const a = [bob(0.12, 2)];
      parts.push(sphere([0, y, 0], [1.6, 0.55, 0.5], color, { rot: [0, 0, 8], anim: a }));
      parts.push(bellyPatch([0, y, 0], [1.6, 0.55, 0.5], belly, { rot: [0, 0, 8], anim: a }));
      parts.push(cone([1.8, y + 0.1, 0], [0.22, 0.7, 0.22], color, { rot: [0, 0, -92], anim: a }));
      parts.push(cone([-0.1, y + 0.75, 0], [0.12, 0.6, 0.4], color, { rot: [0, 0, 25], anim: a }));
      for (const s of [-1, 1]) parts.push(cone([0.5, y - 0.3, s * 0.6], [0.12, 0.6, 0.3], color, { rot: [s * 100, 0, 20], anim: a }));
      const tp = [-1.5, y, 0];
      const wag = [swing(tp, [0, 0, 1], 0.3, 2, 1), ...a];
      parts.push(sphere([-1.8, y, 0], [0.5, 0.2, 0.2], color, { anim: wag }));
      for (const s of [-1, 1]) parts.push(sphere([-2.2, y, s * 0.4], [0.35, 0.06, 0.35], color, { anim: wag }));
      parts.push(...eyes([1.2, y + 0.18, 0], 0.4, 0.09, { anim: a }));
      return parts;
    },
    facts: [
      'Dolphins are very smart and playful. They love to jump and do flips!',
      'Dolphins are not fish. They are mammals and breathe air, just like you.',
      'Dolphins talk to each other with clicks and whistles.',
      'They find fish by making clicking sounds and listening for the echo.',
      'Dolphins sleep with one half of their brain at a time so they can keep swimming.',
    ],
    quiz: [
      { q: 'How do dolphins talk?', options: ['With clicks and whistles', 'With words', 'They never talk'], answer: 0 },
      { q: 'Dolphins breathe...', options: ['Water', 'Air'], answer: 1 },
    ],
  },
  {
    id: 'octopus', name: 'Octopus', emoji: '🐙', category: 'Animals',
    aliases: ['octopus', 'octopuses', 'octopi', 'octapus'],
    scene: { sky: ['#4a96ff', '#9ad0ff'], ground: '#f5d99a', groundType: 'sand', sun: [0.3, 0.8, 0.5], fog: 0.001 },
    material: { skin: 'smooth', pattern: 'mottle', rough: 0.35, sss: 0.5 },
    build: () => {
      const color = '#bc6e5a', pale = '#ffdac2';
      const parts = [];
      const y = 1.6;
      const a = [bob(0.06, 1.8)];
      parts.push(sphere([0, y + 0.3, 0], [1.1, 1.2, 1.1], color, { pattern: 'spots', color2: '#8c4e39', patternScale: 3, anim: a }));
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + 0.2;
        const dx = Math.cos(ang), dz = Math.sin(ang);
        const pivot = [dx * 0.6, y - 0.4, dz * 0.6];
        for (let j = 0; j < 5; j++) {
          const t = (j + 0.5) / 5;
          const r = 0.3 * (1 - t * 0.7);
          parts.push(sphere([dx * (0.6 + t * 1.4), y - 0.5 - Math.sin(t * Math.PI * 0.6) * 0.8, dz * (0.6 + t * 1.4)], [r * 1.3, r, r * 1.3], j % 2 ? pale : color, {
            anim: [swing(pivot, [-dz, 0, dx], 0.25 * t, 1.8, i * 0.8 + t * 2), ...a],
          }));
        }
      }
      parts.push(...eyes([0.85, y + 0.5, 0], 0.4, 0.18, { anim: a }));
      return ground(parts);
    },
    facts: [
      'An octopus has eight long arms. Octo means eight!',
      'Octopuses have three hearts and blue blood.',
      'An octopus can change colour to hide. It is a master of disguise!',
      'It has no bones at all, so it can squeeze through tiny holes.',
      'If it gets scared, an octopus squirts dark ink and zooms away.',
    ],
    quiz: [
      { q: 'How many arms does an octopus have?', options: ['Two', 'Eight', 'Twenty'], answer: 1 },
      { q: 'How many hearts does an octopus have?', options: ['One', 'Three'], answer: 1 },
    ],
  },
  {
    id: 'penguin', name: 'Penguin', emoji: '🐧', category: 'Animals',
    aliases: ['penguin', 'penguins', 'pengwin', 'emperor penguin'],
    scene: ice,
    material: { skin: 'fur', rough: 0.6, sss: 0.2 },
    build: () => {
      const parts = [];
      const a = [swing([0, 0, 0], [1, 0, 0], 0.12, 3)];
      parts.push(sphere([0, 1.3, 0], [0.9, 1.25, 0.95], '#2b3147', { anim: a }));
      parts.push(sphere([0.35, 1.15, 0], [0.62, 1.0, 0.72], '#fbfbfb', { anim: a }));
      parts.push(sphere([0.1, 2.55, 0], [0.62, 0.6, 0.62], '#2b3147', { anim: a }));
      parts.push(sphere([0.45, 2.5, 0], [0.32, 0.4, 0.44], '#fbfbfb', { anim: a }));
      parts.push(cone([0.75, 2.42, 0], [0.12, 0.45, 0.12], '#ffcb2b', { rot: [0, 0, -95], anim: a }));
      parts.push(...eyes([0.72, 2.72, 0], 0.24, 0.085, { anim: a }));
      for (const s of [-1, 1]) {
        parts.push(sphere([0, 1.4, s * 0.85], [0.35, 0.8, 0.12], '#2b3147', { rot: [s * 15, 0, 0], anim: [swing([0, 1.9, s * 0.8], [1, 0, 0], 0.4 * s, 3), ...a] }));
        parts.push(sphere([0.3, 0.1, s * 0.35], [0.45, 0.12, 0.3], '#ffcb2b', { anim: [bob(0.08, 3, s > 0 ? 0 : Math.PI)] }));
      }
      return ground(parts);
    },
    facts: [
      'Penguins are birds, but they cannot fly. They are amazing swimmers instead!',
      'Penguins live in the cold, cold south, near the bottom of the world.',
      'A penguin\'s black and white colours help it hide from seals in the water.',
      'Daddy emperor penguins keep the egg warm on top of their feet for two whole months!',
      'Penguins waddle when they walk, and they slide on their tummies on the ice. Whee!',
    ],
    quiz: [
      { q: 'Can penguins fly?', options: ['Yes, very high', 'No, but they swim really well'], answer: 1 },
      { q: 'Who keeps the emperor penguin egg warm?', options: ['The daddy penguin', 'A polar bear'], answer: 0 },
    ],
  },
  {
    id: 'frog', name: 'Frog', emoji: '🐸', category: 'Animals',
    aliases: ['frog', 'frogs', 'toad', 'froggy'],
    scene: { ...meadow, ground: '#60953e' },
    material: { skin: 'smooth', pattern: 'mottle', rough: 0.22, sss: 0.5 },
    build: () => {
      const g = '#73ae47', light = '#dffda8';
      const parts = [];
      const a = [bob(0.03, 2.4)];
      parts.push(sphere([0, 0.75, 0], [1.1, 0.7, 0.95], g, { anim: a }));
      parts.push(sphere([0.15, 0.55, 0], [0.9, 0.5, 0.8], light, { anim: a }));
      parts.push(sphere([0.6, 1.05, 0], [0.75, 0.5, 0.9], g, { anim: a }));
      parts.push(box([1.0, 0.85, 0], [0.9, 0.05, 1.1], '#345a2c', { anim: a }));
      for (const s of [-1, 1]) {
        parts.push(sphere([0.8, 1.5, s * 0.55], 0.3, g, { anim: a }));
        parts.push(sphere([0.95, 1.55, s * 0.55], 0.22, '#ffffff', { anim: a, shiny: 60 }));
        parts.push(sphere([1.1, 1.58, s * 0.55], 0.12, '#212139', { anim: a, shiny: 90 }));
        parts.push(sphere([-0.6, 0.6, s * 1.0], [0.55, 0.45, 0.4], g, { anim: a }));
        parts.push(sphere([-0.2, 0.15, s * 1.15], [0.6, 0.15, 0.35], g, { anim: a }));
        parts.push(sphere([0.9, 0.2, s * 0.8], [0.5, 0.15, 0.3], g, { anim: a }));
      }
      // throat bubble
      parts.push(sphere([0.9, 0.55, 0], [0.4, 0.3, 0.5], light, { anim: [{ type: 'bob', amp: 0.02, speed: 6 }] }));
      return ground(parts);
    },
    facts: [
      'Frogs start life as tadpoles that swim in the water like little fish.',
      'A frog can jump more than 20 times its own length. Boing!',
      'Frogs catch bugs with their long sticky tongues.',
      'Frogs drink water through their skin instead of with their mouths.',
      'Frogs say "ribbit" and "croak" to call their friends.',
    ],
    quiz: [
      { q: 'What is a baby frog called?', options: ['A tadpole', 'A puppy', 'A chick'], answer: 0 },
      { q: 'How does a frog catch bugs?', options: ['With a net', 'With its sticky tongue'], answer: 1 },
    ],
  },
  {
    id: 'butterfly', name: 'Butterfly', emoji: '🦋', category: 'Animals', mesh: 'parts',
    aliases: ['butterfly', 'butterflies', 'buterfly', 'monarch'],
    scene: meadow,
    material: { skin: 'fur', rough: 0.7, sss: 0.2 },
    build: () => {
      const parts = [];
      const y = 2.2;
      const a = [bob(0.15, 2.5)];
      parts.push(sphere([0, y, 0], [0.75, 0.18, 0.18], '#363647', { anim: a }));
      parts.push(sphere([0.75, y + 0.05, 0], 0.22, '#363647', { anim: a }));
      for (const s of [-1, 1]) {
        parts.push(cyl([0.95, y + 0.4, s * 0.12], [0.02, 0.5, 0.02], '#363647', { rot: [s * 25, 0, -30], anim: a }));
        const flap = [swing([0, y, 0], [1, 0, 0], 0.9 * s, 5), ...a];
        parts.push(sphere([0.25, y, s * 0.95], [0.75, 0.04, 0.95], '#ffbb5a', { pattern: 'spots', color2: '#232329', patternScale: 4, anim: flap }));
        parts.push(sphere([-0.55, y, s * 0.7], [0.55, 0.04, 0.65], '#ffe05a', { pattern: 'spots', color2: '#232329', patternScale: 4, anim: flap }));
        parts.push(torus([0.25, y, s * 0.95], [0.8, 0.5, 0.95], '#232329', { rot: [0, 0, 0], anim: flap }));
      }
      parts.push(...eyes([0.9, y + 0.1, 0], 0.15, 0.06, { anim: a }));
      return parts;
    },
    facts: [
      'A butterfly starts as a caterpillar, wraps itself in a chrysalis, and comes out with wings!',
      'Butterflies taste with their feet.',
      'Butterflies drink sweet nectar from flowers through a tongue like a straw.',
      'Their wings are covered in thousands of tiny scales that make the pretty colours.',
      'Some butterflies fly thousands of miles to find a warm place for winter.',
    ],
    quiz: [
      { q: 'What does a butterfly start life as?', options: ['A caterpillar', 'An egg-shaped rock', 'A bird'], answer: 0 },
      { q: 'What do butterflies drink?', options: ['Milk', 'Nectar from flowers'], answer: 1 },
    ],
  },
  {
    id: 'turtle', name: 'Sea Turtle', emoji: '🐢', category: 'Animals',
    aliases: ['turtle', 'sea turtle', 'turtles', 'tortoise', 'turtel'],
    scene: { sky: ['#4a96ff', '#9ad0ff'], ground: '#f5d99a', groundType: 'sand', sun: [0.3, 0.8, 0.5], fog: 0.001 },
    material: SHELL,
    build: () => {
      const shell = '#6e834d', skin = '#a8bc81';
      const parts = [];
      const a = [bob(0.04, 1.8)];
      parts.push(sphere([0, 0.9, 0], [1.5, 0.7, 1.25], shell, { pattern: 'spots', color2: '#4a5a33', patternScale: 2.2, anim: a }));
      parts.push(sphere([0, 0.55, 0], [1.4, 0.3, 1.15], '#eddca8', { anim: a }));
      parts.push(sphere([1.7, 0.85, 0], [0.5, 0.38, 0.38], skin, { anim: a }));
      parts.push(...eyes([1.95, 1.0, 0], 0.25, 0.09, { anim: a }));
      for (const s of [-1, 1]) {
        parts.push(sphere([0.9, 0.5, s * 1.35], [0.8, 0.1, 0.45], skin, { rot: [0, s * -25, 0], anim: [swing([0.9, 0.5, s * 0.9], [1, 0, 0], 0.3 * s, 1.8), ...a] }));
        parts.push(sphere([-1.0, 0.5, s * 1.15], [0.55, 0.1, 0.35], skin, { rot: [0, s * 20, 0], anim: [swing([-1.0, 0.5, s * 0.8], [1, 0, 0], 0.3 * s, 1.8, 1.5), ...a] }));
      }
      parts.push(sphere([-1.55, 0.6, 0], [0.3, 0.12, 0.15], skin, { anim: a }));
      return ground(parts);
    },
    facts: [
      'Sea turtles carry a hard shell on their backs to keep them safe.',
      'They can live for a very long time, sometimes more than 80 years!',
      'Mother turtles crawl onto the beach to lay their eggs in the sand.',
      'Sea turtles breathe air, so they pop up to the surface to take a breath.',
      'Some sea turtles love to eat jellyfish. Yum!',
    ],
    quiz: [
      { q: 'What does a turtle carry on its back?', options: ['A shell', 'A backpack', 'A house'], answer: 0 },
      { q: 'Where do mother turtles lay their eggs?', options: ['In the sand', 'In a tree'], answer: 0 },
    ],
  },
  {
    id: 'bee', name: 'Honey Bee', emoji: '🐝', category: 'Animals',
    aliases: ['bee', 'bees', 'honey bee', 'honeybee', 'bumblebee', 'bumble bee'],
    scene: meadow,
    material: { skin: 'fur', rough: 0.6, sss: 0.2 },
    build: () => {
      const parts = [];
      const y = 2.0;
      const a = [bob(0.15, 3)];
      parts.push(sphere([-0.2, y, 0], [1.0, 0.7, 0.7], '#ffea2e', { pattern: 'stripes', color2: '#332d27', patternScale: 1.6, anim: a }));
      parts.push(sphere([0.9, y + 0.1, 0], [0.5, 0.5, 0.5], '#332d27', { anim: a }));
      parts.push(cone([-1.3, y - 0.05, 0], [0.12, 0.35, 0.12], '#332d27', { rot: [0, 0, 90], anim: a }));
      for (const s of [-1, 1]) {
        parts.push(cyl([1.1, y + 0.55, s * 0.18], [0.03, 0.45, 0.03], '#332d27', { rot: [s * 20, 0, -25], anim: a }));
        parts.push(sphere([0.0, y + 0.55, s * 0.7], [0.6, 0.03, 0.75], '#dff4ff', { alpha: 0.65, anim: [swing([0, y + 0.4, 0], [1, 0, 0], 0.5 * s, 18), ...a] }));
        for (let i = 0; i < 3; i++) parts.push(cyl([0.4 - i * 0.4, y - 0.6, s * 0.45], [0.04, 0.4, 0.04], '#332d27', { rot: [s * 25, 0, 0], anim: a }));
      }
      parts.push(...eyes([1.2, y + 0.2, 0], 0.3, 0.14, { anim: a, pupil: '#111' }));
      return parts;
    },
    facts: [
      'Bees make sweet honey from the nectar they collect from flowers.',
      'A bee has six legs, four wings, and five eyes!',
      'Bees dance to tell their friends where the best flowers are.',
      'Bees help flowers and fruit grow by carrying pollen from one flower to another.',
      'Every beehive has one queen bee. She is the mother of all the other bees.',
    ],
    quiz: [
      { q: 'What do bees make?', options: ['Honey', 'Cheese', 'Juice'], answer: 0 },
      { q: 'How do bees tell friends where flowers are?', options: ['They dance', 'They write notes'], answer: 0 },
    ],
  },
  {
    id: 'cat', name: 'Cat', emoji: '🐱', category: 'Animals',
    aliases: ['cat', 'cats', 'kitty', 'kitten', 'kitty cat'],
    scene: home,
    material: FUR,
    build: () => catLike({ color: '#a8a29c', belly: '#d9d4ce', color2: '#68625a', pattern: 'stripes', patternScale: 2.2, size: 0.85, snoutColor: '#d8c4bf' }),
    facts: [
      'Cats purr when they are happy. It sounds like a little motor!',
      'Cats can see really well in the dark, much better than people.',
      'A cat\'s whiskers help it feel its way through small spaces.',
      'Cats sleep for about 15 hours a day. What a snooze!',
      'Baby cats are called kittens.',
    ],
    quiz: [
      { q: 'What sound does a happy cat make?', options: ['Purr', 'Moo', 'Quack'], answer: 0 },
      { q: 'What is a baby cat called?', options: ['A puppy', 'A kitten'], answer: 1 },
    ],
  },
  {
    id: 'dog', name: 'Dog', emoji: '🐶', category: 'Animals',
    aliases: ['dog', 'dogs', 'puppy', 'doggy', 'doggie', 'pup'],
    scene: meadow,
    material: FUR,
    build: () => {
      const color = '#da9c60', belly = '#e2cfb0';
      return mammal({
        color, belly, bodyScale: [1.4, 0.75, 0.7], bodyY: 1.2, legLen: 0.8, thick: 0.18,
        head: ({ x, y }) => {
          const a = [bob(0.05, 3, 0.3)];
          const hx = x + 0.35, hy = y + 0.1;
          return [
            sphere([hx, hy, 0], [0.6, 0.58, 0.58], color, { anim: a }),
            sphere([hx + 0.5, hy - 0.15, 0], [0.4, 0.28, 0.32], belly, { anim: a }),
            sphere([hx + 0.85, hy - 0.1, 0], 0.11, '#333333', { anim: a }),
            cyl([hx + 0.55, hy - 0.42, 0.1], [0.12, 0.2, 0.08], '#ff9bae', { rot: [20, 0, 0], anim: a }),
            ...[-1, 1].map((s) => sphere([hx - 0.1, hy + 0.25, s * 0.5], [0.3, 0.5, 0.12], '#95643b', { rot: [s * 30, 0, 0], anim: [swing([hx - 0.1, hy + 0.5, s * 0.4], [1, 0, 0], 0.15 * s, 3), ...a] })),
            ...eyes([hx + 0.35, hy + 0.15, 0], 0.26, 0.11, { anim: a }),
          ];
        },
        tailOpts: { len: 1.0, segs: 5, radius: 0.12, angle: 50, curl: 0.3, wag: 0.8, speed: 7 },
        extras: () => [torus([0.95, 1.4, 0], [0.42, 0.42, 0.42], '#ff5447', { rot: [0, 0, 90], anim: [bob(0.03)] })],
      });
    },
    facts: [
      'Dogs wag their tails when they are happy to see you.',
      'A dog\'s nose is super powerful. It can smell things from far away.',
      'Dogs can hear sounds that are too quiet for people to hear.',
      'Baby dogs are called puppies.',
      'Dogs have been best friends with people for thousands of years.',
    ],
    quiz: [
      { q: 'What does a happy dog do?', options: ['Wags its tail', 'Hides', 'Flies away'], answer: 0 },
      { q: 'What is a baby dog called?', options: ['A kitten', 'A puppy'], answer: 1 },
    ],
  },
];
