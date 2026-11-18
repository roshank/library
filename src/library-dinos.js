import { sphere, box, cone, cyl, eyes, legs4, legs2, tail, neck, spine, wing, bob, swing, ground, lighten, belly as bellyPatch } from './builders.js';

const prehistoric = { sky: ['#7ac6ff', '#9fbfdc'], ground: '#759f4b', groundType: 'grass', sun: [0.45, 0.55, 0.6], sunColor: '#ffe3bf', sunPower: 4.4, fog: 0.0001 };
const jungle = { sky: ['#78cfff', '#9cbdd9'], ground: '#609841', groundType: 'grass', sun: [0.4, 0.75, 0.5], fog: 0.0001 };
const sea = { sky: ['#60baff', '#95bddf'], ground: '#287cb3', groundType: 'water', sun: [0.4, 0.7, 0.55] };
const SCALY = { skin: 'scales', pattern: 'mottle', rough: 0.62, sss: 0.3 };
const SLEEK = { skin: 'smooth', pattern: 'mottle', rough: 0.3, sss: 0.3 };

function teeth(x, y, z, count, spread, size, dir = -1) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
    out.push(cone([x, y, z + t * spread], [size * 0.4, size, size * 0.4], '#e9e2cf', { hard: true, rough: 0.3, rot: [0, 0, dir > 0 ? 0 : 180] }));
  }
  return out;
}

function bigBiped({ color, belly, headLen = 1.05, snout = true, extras = () => [], tailLen = 3.2, sail = false }) {
  const parts = [];
  const bodyY = 2.3;
  parts.push(sphere([0, bodyY, 0], [1.7, 1.0, 0.95], color, { rot: [0, 0, -8], anim: [bob(0.04)] }));
  parts.push(bellyPatch([0, bodyY, 0], [1.7, 1.0, 0.95], belly, { rot: [0, 0, -8], anim: [bob(0.04)] }));
  const n = neck({ start: [1.35, bodyY + 0.35, 0], len: 0.9, segs: 3, radius: 0.5, angle: 38, color, taper: 0.15 });
  parts.push(...n.parts);
  const hx = n.end[0] + 0.45, hy = n.end[1] + 0.05;
  const headAnim = [bob(0.05, 2.4, 0.5)];
  parts.push(sphere([hx, hy, 0], [headLen, 0.62, 0.58], color, { anim: headAnim }));
  if (snout) {
    parts.push(sphere([hx + headLen * 0.7, hy - 0.18, 0], [headLen * 0.62, 0.3, 0.3], color, { anim: headAnim }));
    parts.push(sphere([hx + headLen * 0.6, hy - 0.5, 0], [headLen * 0.62, 0.15, 0.3], lighten(color, 0.1), { blend: 0.04, anim: [...headAnim, swing([hx, hy - 0.4, 0], [0, 0, 1], 0.08, 2.4)] }));
    parts.push(...teeth(hx + headLen * 1.12, hy - 0.4, 0, 3, 0.16, 0.14).map((t) => ({ ...t, anim: headAnim })));
    parts.push(...teeth(hx + headLen * 0.8, hy - 0.46, 0, 2, 0.26, 0.12).map((t) => ({ ...t, anim: headAnim })));
  }
  parts.push(...eyes([hx + 0.3, hy + 0.14, 0], 0.46, 0.14, { anim: headAnim }));
  // tiny arms
  for (const s of [-1, 1]) {
    parts.push(cyl([1.15, bodyY - 0.55, s * 0.6], [0.11, 0.55, 0.11], color, { blend: 0.06, rot: [0, 0, -50], anim: [bob(0.04)] }));
  }
  parts.push(...legs2({ x: -0.3, len: 1.9, thick: 0.3, color, spreadZ: 0.6, footColor: lighten(color, 0.15) }));
  parts.push(...tail({ start: [-1.5, bodyY + 0.1, 0], len: tailLen, segs: 7, radius: 0.55, angle: 4, color }));
  if (sail) parts.push(...spine({ fromX: -1.3, toX: 1.1, y: bodyY + 0.7, count: 7, size: 1.9, color: sail, color2: lighten(sail, 0.3), plate: true }).map((x) => ({ ...x, blend: 0.05 })));
  parts.push(...extras({ hx, hy, bodyY }));
  return ground(parts);
}

function sauropod({ color, belly, neckLen, neckAngle, tailLen, bodyScale = [2.3, 1.3, 1.25], frontLen = 2.2, backLen = 2.0, bodyY = 2.9, extras = () => [] }) {
  const parts = [];
  parts.push(sphere([0, bodyY, 0], bodyScale, color, { anim: [bob(0.03)] }));
  parts.push(bellyPatch([0, bodyY, 0], bodyScale, belly, { anim: [bob(0.03)] }));
  parts.push(...legs4({ frontX: bodyScale[0] * 0.6, backX: -bodyScale[0] * 0.6, frontLen, backLen, thick: 0.4, color, spreadZ: bodyScale[2] * 0.5, speed: 1.6, amp: 0.2, footColor: lighten(color, 0.15) }));
  const n = neck({ start: [bodyScale[0] * 0.85, bodyY + 0.5, 0], len: neckLen, segs: 8, radius: 0.55, angle: neckAngle, color, taper: 0.4 });
  parts.push(...n.parts);
  const [hx, hy] = n.end;
  const headAnim = [bob(0.05, 2.4, 1)];
  parts.push(sphere([hx + 0.35, hy + 0.1, 0], [0.75, 0.5, 0.48], color, { anim: headAnim }));
  parts.push(sphere([hx + 0.8, hy - 0.05, 0], [0.4, 0.3, 0.38], lighten(color, 0.1), { anim: headAnim }));
  parts.push(...eyes([hx + 0.55, hy + 0.25, 0], 0.32, 0.12, { anim: headAnim }));
  parts.push(...tail({ start: [-bodyScale[0] * 0.9, bodyY + 0.1, 0], len: tailLen, segs: 10, radius: 0.6, angle: -6, curl: 0.9, color, wag: 0.3, speed: 1.6 }));
  parts.push(...extras({ hx, hy }));
  return ground(parts);
}

function quadruped({ color, belly, bodyScale = [1.9, 1.05, 1.1], bodyY = 1.55, legLen = 1.05, thick = 0.32, head, tailOpts = {}, extras = () => [], pattern, color2, patternScale }) {
  const parts = [];
  parts.push(sphere([0, bodyY, 0], bodyScale, color, { pattern, color2, patternScale, anim: [bob(0.035)] }));
  parts.push(bellyPatch([0, bodyY, 0], bodyScale, belly, { pattern, patternScale, anim: [bob(0.035)] }));
  parts.push(...legs4({ frontX: bodyScale[0] * 0.55, backX: -bodyScale[0] * 0.55, len: legLen, thick, color, spreadZ: bodyScale[2] * 0.5, footColor: lighten(color, 0.15) }));
  parts.push(...head({ x: bodyScale[0] * 0.95, y: bodyY + 0.15 }));
  parts.push(...tail({ start: [-bodyScale[0] * 0.9, bodyY, 0], len: 1.8, segs: 6, radius: 0.45, angle: 5, color, pattern, color2, patternScale, ...tailOpts }));
  parts.push(...extras());
  return ground(parts);
}

export const DINOS = [
  {
    id: 'trex', name: 'Tyrannosaurus rex', emoji: '🦖', category: 'Dinosaurs',
    aliases: ['t rex', 't-rex', 'trex', 'tyrannosaurus', 'tyrannosaurus rex', 'rex', 't. rex'],
    scene: prehistoric,
    material: SCALY,
    build: () => bigBiped({ color: '#7a8b5a', belly: '#dcd6aa' }),
    facts: [
      'T. rex was one of the biggest meat-eating dinosaurs ever. It was as long as a school bus!',
      'Its teeth were as big as bananas. Chomp!',
      'T. rex had tiny arms with only two fingers on each hand.',
      'It lived about 66 million years ago, long before any people were around.',
      'Scientists think T. rex could not roar like in the movies. It probably made deep rumbling sounds.',
    ],
    quiz: [
      { q: 'What did T. rex like to eat?', options: ['Meat', 'Leaves', 'Ice cream'], answer: 0 },
      { q: 'How big were T. rex teeth?', options: ['As small as rice', 'As big as bananas'], answer: 1 },
    ],
  },
  {
    id: 'triceratops', name: 'Triceratops', emoji: '🦕', category: 'Dinosaurs',
    aliases: ['triceratops', 'three horns', 'tricera'],
    scene: prehistoric,
    material: SCALY,
    build: () => quadruped({
      color: '#b38f65', belly: '#f0d9b1', bodyScale: [1.9, 1.1, 1.15],
      head: ({ x, y }) => {
        const a = [bob(0.04, 2.4, 0.4)];
        return [
          sphere([x + 0.55, y, 0], [0.95, 0.72, 0.72], '#b38f65', { anim: a }),
          sphere([x + 0.1, y + 0.45, 0], [0.22, 0.95, 1.05], '#ba906b', { blend: 0.06, rot: [0, 0, 15], anim: a }),
          cone([x + 0.75, y + 0.55, 0.38], [0.12, 0.85, 0.12], '#e8dcc0', { hard: true, rough: 0.4, rot: [0, 0, -55], anim: a }),
          cone([x + 0.75, y + 0.55, -0.38], [0.12, 0.85, 0.12], '#e8dcc0', { hard: true, rough: 0.4, rot: [0, 0, -55], anim: a }),
          cone([x + 1.35, y + 0.15, 0], [0.1, 0.4, 0.1], '#e8dcc0', { hard: true, rough: 0.4, rot: [0, 0, -70], anim: a }),
          cone([x + 1.5, y - 0.2, 0], [0.22, 0.4, 0.3], '#b79872', { rot: [0, 0, -90], anim: a }),
          ...eyes([x + 1.0, y + 0.2, 0], 0.48, 0.14, { anim: a }),
        ];
      },
    }),
    facts: [
      'Triceratops had three horns on its face. Its name means "three-horned face".',
      'It had a big bony frill behind its head, like a giant collar.',
      'Triceratops only ate plants. Crunch, crunch!',
      'It was as big as an elephant and lived at the same time as T. rex.',
      'Its beak was like a parrot beak, great for snipping tough plants.',
    ],
    quiz: [
      { q: 'How many horns did Triceratops have?', options: ['One', 'Three', 'Ten'], answer: 1 },
      { q: 'What did Triceratops eat?', options: ['Plants', 'Other dinosaurs'], answer: 0 },
    ],
  },
  {
    id: 'stegosaurus', name: 'Stegosaurus', emoji: '🦕', category: 'Dinosaurs',
    aliases: ['stegosaurus', 'stego', 'plate dinosaur'],
    scene: prehistoric,
    material: SCALY,
    build: () => quadruped({
      color: '#788f63', belly: '#d5dcb3', bodyScale: [2.1, 1.15, 1.0], bodyY: 1.6,
      head: ({ x, y }) => {
        const a = [bob(0.04, 2.4, 0.4)];
        const n = neck({ start: [x - 0.3, y - 0.2, 0], len: 0.8, segs: 3, radius: 0.33, angle: -25, color: '#788f63' });
        return [...n.parts,
          sphere([n.end[0] + 0.3, n.end[1] - 0.05, 0], [0.55, 0.36, 0.36], '#788f63', { anim: a }),
          ...eyes([n.end[0] + 0.45, n.end[1] + 0.1, 0], 0.25, 0.1, { anim: a })];
      },
      tailOpts: { len: 2.4, angle: -2 },
      extras: () => [
        ...spine({ fromX: -1.5, toX: 1.3, y: (t) => 2.35 + Math.sin(t * Math.PI) * 0.25, count: 7, size: 1.15, color: '#ca754b', color2: '#ef9c64', plate: true, doubleRow: true, widthZ: 0.35 }).map((x) => ({ ...x, blend: 0.03 })),
        ...[-0.25, 0.25].flatMap((z) => [
          cone([-3.4, 1.7, z], [0.1, 0.7, 0.1], '#e8dcc0', { hard: true, rough: 0.4, rot: [0, 0, 20] }),
          cone([-3.0, 1.85, z], [0.1, 0.7, 0.1], '#e8dcc0', { hard: true, rough: 0.4, rot: [0, 0, 10] }),
        ]),
      ],
    }),
    facts: [
      'Stegosaurus had big flat plates sticking up along its back.',
      'Its tail had four sharp spikes to keep hungry meat-eaters away.',
      'Stegosaurus ate plants and was about as long as a school bus.',
      'Its head was tiny. Its brain was only about the size of a hot dog!',
      'The plates may have helped it warm up in the sun or cool down in the shade.',
    ],
    quiz: [
      { q: 'What did Stegosaurus have on its back?', options: ['Plates', 'Wings', 'Wheels'], answer: 0 },
      { q: 'What was on the end of its tail?', options: ['A club', 'Spikes', 'A feather'], answer: 1 },
    ],
  },
  {
    id: 'brachiosaurus', name: 'Brachiosaurus', emoji: '🦕', category: 'Dinosaurs',
    aliases: ['brachiosaurus', 'brachio', 'long neck', 'longneck', 'long neck dinosaur'],
    scene: prehistoric,
    material: SCALY,
    build: () => sauropod({ color: '#90a58c', belly: '#e6ebcb', neckLen: 4.6, neckAngle: 62, tailLen: 3.6, frontLen: 2.4, backLen: 2.0 }),
    facts: [
      'Brachiosaurus had a very long neck, so it could eat leaves from the tops of tall trees.',
      'It was taller than a giraffe. It could peek into a fourth-floor window!',
      'Its front legs were longer than its back legs, like a giraffe.',
      'Brachiosaurus only ate plants and had to eat all day long to fill its huge tummy.',
      'It had nostrils on the top of its head.',
    ],
    quiz: [
      { q: 'Why did Brachiosaurus have a long neck?', options: ['To eat leaves from tall trees', 'To swim faster'], answer: 0 },
      { q: 'Which legs were longer?', options: ['Front legs', 'Back legs'], answer: 0 },
    ],
  },
  {
    id: 'diplodocus', name: 'Diplodocus', emoji: '🦕', category: 'Dinosaurs',
    aliases: ['diplodocus', 'diplo', 'whip tail'],
    scene: prehistoric,
    material: SCALY,
    build: () => sauropod({ color: '#9b9f72', belly: '#eae9bf', neckLen: 4.2, neckAngle: 22, tailLen: 6.5, bodyY: 2.4, frontLen: 1.7, backLen: 1.8, bodyScale: [2.4, 1.15, 1.2] }),
    facts: [
      'Diplodocus was one of the longest dinosaurs ever. It was longer than two school buses!',
      'Its tail was super long and thin, like a whip.',
      'Diplodocus held its neck mostly flat, like a bridge.',
      'It had little peg-shaped teeth for raking leaves off branches.',
      'It swallowed stones to help grind up food in its tummy.',
    ],
    quiz: [
      { q: 'What was Diplodocus\'s tail like?', options: ['Short and stubby', 'Long like a whip'], answer: 1 },
      { q: 'Diplodocus was...', options: ['Very long', 'Very tiny'], answer: 0 },
    ],
  },
  {
    id: 'velociraptor', name: 'Velociraptor', emoji: '🦖', category: 'Dinosaurs',
    aliases: ['velociraptor', 'raptor', 'velocoraptor', 'velociraptors'],
    scene: jungle,
    material: SCALY,
    build: () => {
      const color = '#7c967d', belly = '#eaeeca';
      const parts = [];
      const bodyY = 1.15;
      parts.push(sphere([0, bodyY, 0], [0.95, 0.5, 0.45], color, { rot: [0, 0, -10], anim: [bob(0.04, 3)] }));
      parts.push(bellyPatch([0, bodyY, 0], [0.95, 0.5, 0.45], belly, { rot: [0, 0, -10], anim: [bob(0.04, 3)] }));
      const n = neck({ start: [0.8, bodyY + 0.2, 0], len: 0.6, segs: 3, radius: 0.22, angle: 55, color, taper: 0.1 });
      parts.push(...n.parts);
      const hx = n.end[0] + 0.35, hy = n.end[1] + 0.05;
      const a = [bob(0.05, 3, 0.4)];
      parts.push(sphere([hx, hy, 0], [0.55, 0.3, 0.3], color, { anim: a }));
      parts.push(box([hx + 0.55, hy - 0.08, 0], [0.5, 0.2, 0.24], color, { anim: a }));
      parts.push(...eyes([hx + 0.2, hy + 0.1, 0], 0.22, 0.09, { anim: a }));
      // feathered arms
      for (const s of [-1, 1]) {
        parts.push(cyl([0.6, bodyY - 0.25, s * 0.35], [0.07, 0.45, 0.07], color, { rot: [0, 0, -45] }));
        parts.push(sphere([0.45, bodyY - 0.3, s * 0.4], [0.45, 0.06, 0.2], '#eab260', { rot: [0, 0, -20] }));
      }
      // head crest feathers
      parts.push(sphere([hx - 0.3, hy + 0.2, 0], [0.4, 0.05, 0.18], '#eab260', { rot: [0, 0, 25], anim: a }));
      parts.push(...legs2({ x: -0.1, len: 0.95, thick: 0.11, color, spreadZ: 0.3, speed: 3.2, footColor: '#eab260' }));
      // the famous toe claw
      for (const s of [-1, 1]) parts.push(cone([0.25, 0.15, s * 0.3], [0.05, 0.22, 0.05], '#e8dcc0', { hard: true, rough: 0.4, rot: [0, 0, -60] }));
      parts.push(...tail({ start: [-0.85, bodyY + 0.05, 0], len: 2.2, segs: 7, radius: 0.22, angle: 6, color, speed: 3 }));
      parts.push(sphere([-2.9, bodyY + 0.3, 0], [0.5, 0.06, 0.2], '#eab260', { anim: [swing([-0.85, bodyY, 0], [0, 1, 0], 0.35, 3, -1.6)] }));
      return ground(parts);
    },
    facts: [
      'Velociraptor was small, about the size of a turkey.',
      'It had feathers, just like a bird!',
      'Each foot had one big curved claw that it held up off the ground.',
      'Velociraptor was fast and smart and hunted small animals.',
      'Its name means "speedy thief".',
    ],
    quiz: [
      { q: 'How big was a real Velociraptor?', options: ['As big as a house', 'About the size of a turkey'], answer: 1 },
      { q: 'What covered its body?', options: ['Feathers', 'Fur', 'Scales only'], answer: 0 },
    ],
  },
  {
    id: 'ankylosaurus', name: 'Ankylosaurus', emoji: '🦕', category: 'Dinosaurs',
    aliases: ['ankylosaurus', 'anky', 'club tail', 'armor dinosaur', 'armour dinosaur'],
    scene: prehistoric,
    material: SCALY,
    build: () => {
      const color = '#b68a52', belly = '#e5d0aa', armor = '#785831';
      const parts = quadruped({
        color, belly, bodyScale: [2.1, 0.85, 1.5], bodyY: 1.15, legLen: 0.7, thick: 0.3, pattern: 'spots', color2: '#906b3e', patternScale: 2.5,
        head: ({ x, y }) => {
          const a = [bob(0.03, 2.4, 0.4)];
          return [
            box([x + 0.45, y - 0.15, 0], [0.9, 0.5, 0.85], color, { anim: a }),
            ...[-1, 1].flatMap((s) => [cone([x + 0.1, y + 0.05, s * 0.5], [0.08, 0.3, 0.08], armor, { rot: [0, 0, 0], anim: a }), cone([x + 0.5, y - 0.3, s * 0.52], [0.06, 0.22, 0.06], armor, { rot: [s * 70, 0, 0], anim: a })]),
            ...eyes([x + 0.8, y + 0.05, 0], 0.32, 0.1, { anim: a }),
          ];
        },
        tailOpts: { len: 2.6, angle: 0, segs: 7, radius: 0.35 },
        extras: () => {
          const out = [sphere([-4.5, 1.1, 0], [0.6, 0.45, 0.55], armor, { anim: [swing([-1.9, 1.15, 0], [0, 1, 0], 0.3, 2, -1.6)] })];
          for (let i = 0; i < 4; i++) for (const z of [-0.95, -0.35, 0.35, 0.95]) {
            out.push(cone([-1.3 + i * 0.85, 1.95 - Math.abs(z) * 0.35, z], [0.17, 0.4, 0.17], armor, { rot: [z * 40, 0, 0], anim: [bob(0.035)] }));
          }
          return out;
        },
      });
      return parts;
    },
    facts: [
      'Ankylosaurus was covered in bony armor, like a walking tank.',
      'It had a big heavy club at the end of its tail. Whack!',
      'It was low and wide, and only ate plants.',
      'Even its eyelids had bony armor on them!',
      'It was about as long as two cars.',
    ],
    quiz: [
      { q: 'What was on the end of its tail?', options: ['A club', 'Feathers', 'A flower'], answer: 0 },
      { q: 'What covered Ankylosaurus?', options: ['Soft fur', 'Bony armor'], answer: 1 },
    ],
  },
  {
    id: 'pteranodon', name: 'Pteranodon', emoji: '🦅', category: 'Dinosaurs',
    aliases: ['pteranodon', 'pterodactyl', 'terodactyl', 'flying dinosaur', 'pterosaur', 'teradactyl'],
    scene: { sky: ['#67baff', '#a3c3df'], ground: '#7cb34e', groundType: 'grass', sun: [0.4, 0.75, 0.5] },
    material: { skin: 'rough', pattern: 'mottle', rough: 0.7, sss: 0.3 },
    build: () => {
      const color = '#b38a6e', pale = '#ffe5c3';
      const parts = [];
      const y = 3.0;
      const a = [bob(0.12, 2.2)];
      parts.push(sphere([0, y, 0], [1.0, 0.42, 0.4], color, { anim: a }));
      parts.push(sphere([0.1, y - 0.1, 0], [0.75, 0.3, 0.32], pale, { anim: a }));
      parts.push(sphere([1.1, y + 0.2, 0], [0.45, 0.32, 0.3], color, { anim: a }));
      parts.push(cone([1.9, y + 0.1, 0], [0.12, 1.3, 0.12], '#dab78a', { rot: [0, 0, -95], anim: a }));
      parts.push(cone([0.55, y + 0.65, 0], [0.12, 1.3, 0.1], color, { rot: [0, 0, 55], anim: a }));
      parts.push(...eyes([1.3, y + 0.32, 0], 0.26, 0.1, { anim: a }));
      for (const s of [-1, 1]) {
        parts.push(wing({ root: [0.1, y, s * 0.3], span: 3.6, chord: 1.0, color, side: s, flap: 0.45, speed: 2.2, sweep: -0.3, up: 0.1 }));
        parts.push(cyl([-0.6, y - 0.5, s * 0.2], [0.06, 0.55, 0.06], color, { rot: [0, 0, 20], anim: a }));
      }
      return parts;
    },
    facts: [
      'Pteranodon was a flying reptile that lived with the dinosaurs, but it was not a dinosaur itself!',
      'Its wings were wider than a car is long.',
      'It had a long pointy crest on the back of its head.',
      'Pteranodon had no teeth. It scooped up fish with its long beak.',
      'Its name means "wing without teeth".',
    ],
    quiz: [
      { q: 'What did Pteranodon eat?', options: ['Fish', 'Grass', 'Pizza'], answer: 0 },
      { q: 'Did Pteranodon have teeth?', options: ['Yes, lots', 'No, none at all'], answer: 1 },
    ],
  },
  {
    id: 'spinosaurus', name: 'Spinosaurus', emoji: '🦖', category: 'Dinosaurs',
    aliases: ['spinosaurus', 'spino', 'sail dinosaur', 'spinosaurus aegyptiacus'],
    scene: { ...prehistoric, ground: '#529075', groundType: 'water' },
    material: SCALY,
    build: () => bigBiped({ color: '#8a8b7f', belly: '#eee9d4', headLen: 1.35, tailLen: 3.6, sail: '#b77560' }),
    facts: [
      'Spinosaurus had a huge sail on its back, like a big fin.',
      'It was even longer than T. rex!',
      'Spinosaurus loved to eat fish and spent lots of time in rivers.',
      'Its long snout looked like a crocodile\'s mouth.',
      'Its name means "spine lizard" because of the tall spines on its back.',
    ],
    quiz: [
      { q: 'What was on Spinosaurus\'s back?', options: ['A sail', 'A saddle', 'Wings'], answer: 0 },
      { q: 'Spinosaurus loved to eat...', options: ['Fish', 'Berries'], answer: 0 },
    ],
  },
  {
    id: 'parasaurolophus', name: 'Parasaurolophus', emoji: '🦕', category: 'Dinosaurs',
    aliases: ['parasaurolophus', 'parasaur', 'duck bill', 'duck billed dinosaur', 'duckbill', 'trumpet dinosaur'],
    scene: prehistoric,
    material: SCALY,
    build: () => quadruped({
      color: '#aea664', belly: '#f4edbb', bodyScale: [1.9, 1.05, 1.0], bodyY: 1.7, legLen: 1.15, pattern: 'stripes', color2: '#7c7542', patternScale: 1.2,
      head: ({ x, y }) => {
        const a = [bob(0.04, 2.4, 0.4)];
        const n = neck({ start: [x - 0.2, y + 0.2, 0], len: 1.0, segs: 3, radius: 0.35, angle: 40, color: '#aea664' });
        const [hx, hy] = n.end;
        return [...n.parts,
          sphere([hx + 0.3, hy + 0.05, 0], [0.6, 0.42, 0.4], '#aea664', { anim: a }),
          box([hx + 0.85, hy - 0.1, 0], [0.55, 0.22, 0.42], '#c8ba7f', { anim: a }),
          cone([hx - 0.6, hy + 0.65, 0], [0.16, 1.6, 0.16], '#aea664', { rot: [0, 0, 55], anim: a }),
          ...eyes([hx + 0.45, hy + 0.2, 0], 0.3, 0.11, { anim: a })];
      },
    }),
    facts: [
      'Parasaurolophus had a long tube-shaped crest on its head.',
      'It may have blown air through the crest to make trumpet sounds. Toot!',
      'Its mouth looked like a duck\'s bill, great for munching plants.',
      'It could walk on two legs or on all four.',
      'Parasaurolophus lived in big herds with its friends and family.',
    ],
    quiz: [
      { q: 'What sound might its crest make?', options: ['A trumpet sound', 'A meow'], answer: 0 },
      { q: 'Its mouth looked like a...', options: ['Duck\'s bill', 'Shark\'s mouth'], answer: 0 },
    ],
  },
  {
    id: 'allosaurus', name: 'Allosaurus', emoji: '🦖', category: 'Dinosaurs',
    aliases: ['allosaurus', 'allo'],
    scene: prehistoric,
    material: SCALY,
    build: () => bigBiped({
      color: '#ae7252', belly: '#fbd8b6', headLen: 1.0, tailLen: 3.4,
      extras: ({ hx, hy }) => [-1, 1].map((s) => cone([hx + 0.2, hy + 0.4, s * 0.3], [0.09, 0.35, 0.09], '#784b37', { rot: [0, 0, -20], anim: [bob(0.05, 2.4, 0.5)] })),
    }),
    facts: [
      'Allosaurus was a big meat-eater that lived long before T. rex.',
      'It had two little bumps above its eyes, like tiny horns.',
      'It had three sharp claws on each hand.',
      'Allosaurus could open its mouth really, really wide.',
      'Its name means "different lizard".',
    ],
    quiz: [
      { q: 'What was above Allosaurus\'s eyes?', options: ['Little horns', 'Glasses', 'Ears'], answer: 0 },
      { q: 'Allosaurus ate...', options: ['Meat', 'Flowers'], answer: 0 },
    ],
  },
  {
    id: 'iguanodon', name: 'Iguanodon', emoji: '🦕', category: 'Dinosaurs',
    aliases: ['iguanodon', 'iguana dinosaur', 'thumb spike'],
    scene: jungle,
    material: SCALY,
    build: () => quadruped({
      color: '#879f63', belly: '#ebf0c2', bodyScale: [1.9, 1.05, 1.0], bodyY: 1.75, legLen: 1.2,
      head: ({ x, y }) => {
        const a = [bob(0.04, 2.4, 0.4)];
        const n = neck({ start: [x - 0.2, y + 0.2, 0], len: 0.9, segs: 3, radius: 0.35, angle: 35, color: '#879f63' });
        const [hx, hy] = n.end;
        return [...n.parts,
          sphere([hx + 0.3, hy + 0.05, 0], [0.65, 0.42, 0.4], '#879f63', { anim: a }),
          box([hx + 0.85, hy - 0.1, 0], [0.45, 0.25, 0.4], '#b6c387', { anim: a }),
          ...eyes([hx + 0.45, hy + 0.2, 0], 0.3, 0.11, { anim: a })];
      },
      extras: () => [-1, 1].map((s) => cone([1.25, 1.1, s * 0.75], [0.07, 0.3, 0.07], '#e8dcc0', { hard: true, rough: 0.4, rot: [0, 0, -40] })),
    }),
    facts: [
      'Iguanodon had a sharp spike on each thumb.',
      'It could walk on two legs or four legs.',
      'Iguanodon ate plants with a beak and lots of grinding teeth.',
      'It was one of the very first dinosaurs ever discovered, almost 200 years ago.',
      'Its name means "iguana tooth" because its teeth looked like an iguana\'s.',
    ],
    quiz: [
      { q: 'What did Iguanodon have on its thumbs?', options: ['Spikes', 'Rings'], answer: 0 },
      { q: 'Iguanodon ate...', options: ['Plants', 'Fish'], answer: 0 },
    ],
  },
  {
    id: 'plesiosaurus', name: 'Plesiosaurus', emoji: '🌊', category: 'Dinosaurs',
    aliases: ['plesiosaurus', 'plesiosaur', 'sea dinosaur', 'swimming dinosaur', 'loch ness', 'nessie'],
    scene: sea,
    material: SLEEK,
    build: () => {
      const color = '#6e889f', belly = '#eefafe';
      const parts = [];
      const y = 1.3;
      const a = [bob(0.08, 1.8)];
      parts.push(sphere([0, y, 0], [1.6, 0.7, 1.1], color, { anim: a }));
      parts.push(bellyPatch([0, y, 0], [1.6, 0.7, 1.1], belly, { anim: a }));
      const n = neck({ start: [1.4, y + 0.2, 0], len: 2.6, segs: 7, radius: 0.35, angle: 35, color, taper: 0.3 });
      parts.push(...n.parts);
      const [hx, hy] = n.end;
      parts.push(sphere([hx + 0.3, hy + 0.05, 0], [0.5, 0.3, 0.3], color, { anim: a }));
      parts.push(...eyes([hx + 0.45, hy + 0.2, 0], 0.22, 0.09, { anim: a }));
      for (const s of [-1, 1]) for (const [fx, ph] of [[0.7, 0], [-0.8, Math.PI]]) {
        parts.push(sphere([fx, y - 0.3, s * 1.35], [0.5, 0.1, 0.9], color, { rot: [s * 15, 0, 0], anim: [swing([fx, y - 0.3, s * 0.9], [1, 0, 0], 0.35 * s, 1.8, ph)] }));
      }
      parts.push(...tail({ start: [-1.5, y, 0], len: 1.6, segs: 5, radius: 0.35, angle: -5, color, speed: 1.8 }));
      return parts;
    },
    facts: [
      'Plesiosaurus was a sea reptile that lived in the time of the dinosaurs.',
      'It had a very long neck and a tiny head.',
      'It swam using four big flippers, like a sea turtle.',
      'Plesiosaurus ate fish and squid.',
      'It had to come up for air, just like a whale.',
    ],
    quiz: [
      { q: 'Where did Plesiosaurus live?', options: ['In the sea', 'In the desert', 'On the Moon'], answer: 0 },
      { q: 'How many flippers did it have?', options: ['Two', 'Four'], answer: 1 },
    ],
  },
];
