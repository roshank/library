import { sphere, box, cone, cyl, torus, eyes, bob, swing, spin, ground, lighten } from './builders.js';

const space = { sky: ['#02030a', '#0a0e22'], ground: '#000', space: true, sun: [0.6, 0.3, 0.55], sunColor: '#fff8f0', sunPower: 3.6, fog: 0 };
const GRASS = { sky: ['#5c9fe0', '#a3c3df'], ground: '#5f8a3c', groundType: 'grass', sun: [0.4, 0.75, 0.5] };

function stars(seed = 7) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  for (let i = 0; i < 90; i++) {
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
    const r = 30 + rnd() * 10;
    out.push(sphere([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.6 + 4, r * Math.sin(ph) * Math.sin(th)], 0.08 + rnd() * 0.14, '#ffffff', { emissive: true, color2: '#ffffff', fit: false }));
  }
  return out;
}

function planet({ color, color2, pattern, patternScale = 1.8, radius = 2.4, spinSpeed = 0.25, extras = [] }) {
  return [
    sphere([0, 2.5, 0], radius, color, { color2, pattern, patternScale, rough: 0.85, anim: [spin([0.15, 1, 0], spinSpeed, [0, 2.5, 0])] }),
    ...extras,
  ];
}

export const WORLD = [
  {
    id: 'earth', name: 'Planet Earth', emoji: '🌍', category: 'Space',
    aliases: ['earth', 'planet earth', 'the earth', 'our planet', 'world', 'the world'],
    scene: space,
    build: () => planet({
      color: '#1d4f9c', color2: '#3f7a3a', pattern: 'blobs', patternScale: 1.1,
      extras: [
        sphere([0, 2.5, 0], 2.48, '#ffffff', { pattern: 'clouds', patternScale: 1.6, alpha: 0.85, anim: [spin([0.15, 1, 0], 0.32, [0, 2.5, 0])] }),
        sphere([0, 2.5, 0], 2.62, '#6fb6ff', { alpha: 0.1, emissive: true, color2: '#6fb6ff' }),
        sphere([5.2, 3.6, 0], 0.55, '#cfcfd6', { fit: false, pattern: 'blobs', color2: '#9a9aa5', patternScale: 4, anim: [{ type: 'orbit', center: [0, 2.5, 0], speed: 0.4 }] }),
      ],
    }),
    facts: [
      'Earth is our home planet. It is round like a giant ball.',
      'Earth is mostly covered in water. That is why it looks blue from space.',
      'Earth spins around once every day. That is what makes day and night.',
      'Earth travels all the way around the Sun once every year.',
      'The Moon is Earth\'s neighbour. It goes around and around our planet.',
    ],
    quiz: [
      { q: 'What shape is the Earth?', options: ['Round like a ball', 'Flat like a pancake', 'Square like a box'], answer: 0 },
      { q: 'Why does Earth look blue from space?', options: ['It is covered in water', 'It is painted blue'], answer: 0 },
    ],
  },
  {
    id: 'moon', name: 'The Moon', emoji: '🌕', category: 'Space',
    aliases: ['moon', 'the moon', 'full moon', 'luna'],
    scene: space,
    build: () => planet({ color: '#d7d7de', color2: '#8e8e9c', pattern: 'blobs', patternScale: 2.6, spinSpeed: 0.15 }),
    facts: [
      'The Moon goes around the Earth. It is our closest neighbour in space.',
      'The Moon has no air and no wind, so footprints left there stay forever!',
      'The Moon does not make its own light. It shines because sunlight bounces off it.',
      'The Moon seems to change shape each night, from a thin sliver to a big round circle.',
      'People have walked on the Moon! The first was Neil Armstrong in 1969.',
    ],
    quiz: [
      { q: 'Does the Moon make its own light?', options: ['No, it bounces sunlight', 'Yes, like a lamp'], answer: 0 },
      { q: 'Have people ever walked on the Moon?', options: ['Yes!', 'No, never'], answer: 0 },
    ],
  },
  {
    id: 'sun', name: 'The Sun', emoji: '☀️', category: 'Space',
    aliases: ['sun', 'the sun', 'our star', 'sunshine'],
    scene: { ...space, sky: ['#120818', '#3a1a2e'] },
    build: () => [
      sphere([0, 2.5, 0], 2.4, '#ffb000', { color2: '#ff4d00', pattern: 'fiery', patternScale: 1.2, emissive: true, anim: [spin([0, 1, 0], 0.1, [0, 2.5, 0])] }),
      sphere([0, 2.5, 0], 2.9, '#ffd36b', { alpha: 0.22, emissive: true, color2: '#ffd36b' }),
      sphere([0, 2.5, 0], 3.6, '#ff9f43', { alpha: 0.1, emissive: true, color2: '#ff9f43' }),
      ...Array.from({ length: 10 }, (_, i) => cone([Math.cos((i / 10) * Math.PI * 2) * 3.1, 2.5 + Math.sin((i / 10) * Math.PI * 2) * 3.1, 0], [0.25, 0.9, 0.25], '#ffd36b', { emissive: true, color2: '#ffd36b', alpha: 0.6, rot: [0, 0, (i / 10) * 360 - 90], anim: [spin([0, 0, 1], 0.2, [0, 2.5, 0])] })),
    ],
    facts: [
      'The Sun is a star, just like the twinkly stars at night, but it is much, much closer to us.',
      'The Sun is a giant ball of super hot, glowing gas.',
      'The Sun is so big that a million Earths could fit inside it!',
      'Sunlight takes about eight minutes to travel all the way to Earth.',
      'Never look straight at the Sun. It is so bright it can hurt your eyes.',
    ],
    quiz: [
      { q: 'What is the Sun?', options: ['A star', 'A planet', 'A big lamp'], answer: 0 },
      { q: 'Should you look straight at the Sun?', options: ['Never!', 'Yes, for a long time'], answer: 0 },
    ],
  },
  {
    id: 'mars', name: 'Mars', emoji: '🔴', category: 'Space',
    aliases: ['mars', 'red planet', 'the red planet', 'planet mars'],
    scene: space,
    build: () => planet({ color: '#c8552b', color2: '#8e3a1c', pattern: 'blobs', patternScale: 1.5, radius: 2.0, extras: [
      sphere([0, 4.45, 0], [0.6, 0.12, 0.6], '#f3e9dd', { anim: [spin([0.15, 1, 0], 0.25, [0, 2.5, 0])] }),
    ] }),
    facts: [
      'Mars is called the Red Planet because it is covered in rusty red dust.',
      'Mars has two tiny moons named Phobos and Deimos.',
      'Robots called rovers drive around on Mars and send pictures back to Earth.',
      'Mars has the biggest volcano in the whole solar system. It is three times taller than Mount Everest!',
      'Mars is very cold, much colder than the coldest winter day on Earth.',
    ],
    quiz: [
      { q: 'What colour is Mars?', options: ['Red', 'Green', 'Purple'], answer: 0 },
      { q: 'What drives around on Mars?', options: ['Robot rovers', 'School buses'], answer: 0 },
    ],
  },
  {
    id: 'saturn', name: 'Saturn', emoji: '🪐', category: 'Space',
    aliases: ['saturn', 'ring planet', 'planet saturn', 'planet with rings'],
    scene: space,
    build: () => planet({ color: '#e7c98b', color2: '#c7a265', pattern: 'bands', patternScale: 0.6, radius: 2.2, extras: [
      torus([0, 2.5, 0], [3.4, 0.25, 3.4], '#d9c39a', { rot: [22, 0, 8], alpha: 0.9, anim: [spin([0.37, 1, 0.14], 0.3, [0, 2.5, 0])] }),
      torus([0, 2.5, 0], [4.2, 0.2, 4.2], '#b9a37d', { rot: [22, 0, 8], alpha: 0.75, anim: [spin([0.37, 1, 0.14], 0.3, [0, 2.5, 0])] }),
    ] }),
    facts: [
      'Saturn has beautiful rings made of ice, rocks, and dust.',
      'Saturn is huge. Hundreds of Earths could fit inside it!',
      'Saturn is so light for its size that it would float in a giant bathtub.',
      'Saturn has more than 100 moons!',
      'A day on Saturn is short, only about 10 hours long.',
    ],
    quiz: [
      { q: 'What are Saturn\'s rings made of?', options: ['Ice and rocks', 'Candy', 'Gold'], answer: 0 },
      { q: 'Would Saturn float in a giant bathtub?', options: ['Yes!', 'No, it would sink'], answer: 0 },
    ],
  },
  {
    id: 'jupiter', name: 'Jupiter', emoji: '🟠', category: 'Space',
    aliases: ['jupiter', 'planet jupiter', 'biggest planet'],
    scene: space,
    build: () => planet({ color: '#d9a46b', color2: '#8c5a3c', pattern: 'bands', patternScale: 0.75, radius: 2.7, spinSpeed: 0.35, extras: [
      sphere([2.3, 1.9, 1.2], [0.5, 0.3, 0.45], '#c84a2e', { anim: [spin([0.15, 1, 0], 0.35, [0, 2.5, 0])] }),
    ] }),
    facts: [
      'Jupiter is the biggest planet in our solar system. All the other planets could fit inside it!',
      'Jupiter has a giant storm called the Great Red Spot. It is bigger than Earth!',
      'Jupiter is made mostly of gas, so you could not stand on it.',
      'Jupiter has dozens and dozens of moons.',
      'Jupiter spins super fast. A day there is only 10 hours long.',
    ],
    quiz: [
      { q: 'Which is the biggest planet?', options: ['Jupiter', 'Earth', 'Mars'], answer: 0 },
      { q: 'What is the Great Red Spot?', options: ['A giant storm', 'A ladybug'], answer: 0 },
    ],
  },
  {
    id: 'rocket', name: 'Rocket', emoji: '🚀', category: 'Machines',
    aliases: ['rocket', 'rockets', 'rocket ship', 'rocketship', 'spaceship', 'space ship'],
    scene: { sky: ['#2a4a8a', '#7fa0c8'], ground: '#7a7d80', groundType: 'asphalt', sun: [0.5, 0.6, 0.6] },
    build: () => {
      const parts = [];
      const a = [bob(0.03, 9)];
      parts.push(cyl([0, 2.6, 0], [0.9, 3.2, 0.9], '#e8e8ea', { anim: a, rough: 0.35, metal: 0.6 }));
      parts.push(cone([0, 4.9, 0], [0.9, 1.4, 0.9], '#c8343f', { anim: a, rough: 0.4, metal: 0.3 }));
      parts.push(torus([0, 3.1, 0], [0.92, 0.1, 0.92], '#1d3557', { anim: a }));
      parts.push(torus([0, 3.1, 0.8], [0.35, 0.3, 0.35], '#1d3557', { rot: [90, 0, 0], anim: a }));
      parts.push(sphere([0, 3.1, 0.85], 0.3, '#8fd3ff', { shiny: 80, anim: a }));
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2;
        parts.push(box([Math.cos(ang) * 1.05, 1.3, Math.sin(ang) * 1.05], [0.6, 1.1, 0.15], '#e63946', { rot: [0, (-ang * 180) / Math.PI, 0], anim: a }));
      }
      parts.push(cyl([0, 0.85, 0], [0.55, 0.4, 0.55], '#555a66', { anim: a }));
      // flames
      parts.push(cone([0, 0.1, 0], [0.5, 1.2, 0.5], '#ff9f1c', { rot: [0, 0, 180], emissive: true, color2: '#fff3b0', alpha: 0.9, anim: [{ type: 'bob', amp: 0.1, speed: 14 }] }));
      parts.push(cone([0, 0.3, 0], [0.3, 0.8, 0.3], '#fff3b0', { rot: [0, 0, 180], emissive: true, color2: '#fff', alpha: 0.95, anim: [{ type: 'bob', amp: 0.08, speed: 17 }] }));
      // launch pad legs
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        parts.push(cyl([Math.cos(ang) * 1.5, 0.6, Math.sin(ang) * 1.5], [0.1, 1.2, 0.1], '#777d8a'));
      }
      return parts;
    },
    facts: [
      'Rockets zoom up into space by shooting hot gas out of the bottom. Whoosh!',
      'Rockets carry astronauts and satellites high above the sky.',
      'The first person to fly into space was Yuri Gagarin, a long time ago in 1961.',
      'Rockets have to go super fast, much faster than any car or airplane, to escape Earth.',
      'Some rockets can land back on the ground and fly again!',
    ],
    quiz: [
      { q: 'Where do rockets go?', options: ['Into space', 'Under the sea', 'To the shops'], answer: 0 },
      { q: 'How does a rocket go up?', options: ['It shoots hot gas out the bottom', 'It flaps its wings'], answer: 0 },
    ],
  },
  {
    id: 'car', name: 'Car', emoji: '🚗', category: 'Machines',
    aliases: ['car', 'cars', 'race car', 'racecar', 'automobile', 'vroom'],
    scene: { sky: ['#4f8fd6', '#a3c3df'], ground: '#45474b', groundType: 'asphalt', sun: [0.5, 0.65, 0.55] },
    build: () => {
      const parts = [];
      const red = '#e63946';
      parts.push(box([0, 0.95, 0], [3.2, 0.7, 1.6], red, { rough: 0.25, metal: 0.4 }));
      parts.push(box([-0.2, 1.55, 0], [1.9, 0.6, 1.4], red, { rough: 0.25, metal: 0.4 }));
      parts.push(box([-0.2, 1.55, 0], [1.6, 0.45, 1.45], '#6fa8d8', { rough: 0.05, metal: 0.2 }));
      for (const [x, z] of [[1.0, 0.85], [1.0, -0.85], [-1.0, 0.85], [-1.0, -0.85]]) {
        parts.push(cyl([x, 0.45, z], [0.45, 0.3, 0.45], '#2b2b30', { rot: [90, 0, 0], anim: [spin([0, 0, 1], -6, [x, 0.45, z])] }));
        parts.push(cyl([x, 0.45, z], [0.25, 0.32, 0.25], '#d9d9df', { rot: [90, 0, 0], anim: [spin([0, 0, 1], -6, [x, 0.45, z])] }));
      }
      parts.push(sphere([1.62, 1.0, 0.5], 0.15, '#fff6c2', { emissive: true, color2: '#fff' }));
      parts.push(sphere([1.62, 1.0, -0.5], 0.15, '#fff6c2', { emissive: true, color2: '#fff' }));
      parts.push(box([-1.62, 1.0, 0.5], [0.05, 0.15, 0.3], '#ff4d4d', { emissive: true, color2: '#ff4d4d' }));
      parts.push(box([-1.62, 1.0, -0.5], [0.05, 0.15, 0.3], '#ff4d4d', { emissive: true, color2: '#ff4d4d' }));
      parts.push(box([0, 0.65, 0], [3.3, 0.15, 1.65], '#2b2b30'));
      return ground(parts);
    },
    facts: [
      'Cars have four wheels and an engine that makes them go. Vroom!',
      'The very first cars were slower than a person on a bicycle.',
      'Cars need fuel or electricity to run, just like you need food for energy.',
      'Always buckle your seat belt. It keeps you safe in the car.',
      'Red lights mean stop and green lights mean go.',
    ],
    quiz: [
      { q: 'How many wheels does a car have?', options: ['Two', 'Four', 'Ten'], answer: 1 },
      { q: 'What does a red traffic light mean?', options: ['Stop', 'Go faster'], answer: 0 },
    ],
  },
  {
    id: 'airplane', name: 'Airplane', emoji: '✈️', category: 'Machines',
    aliases: ['airplane', 'aeroplane', 'plane', 'planes', 'jet', 'aircraft'],
    scene: { sky: ['#3f86d8', '#9fc3e4'], ground: '#5f8a3c', groundType: 'grass', sun: [0.4, 0.75, 0.5], fog: 0.0002 },
    build: () => {
      const parts = [];
      const y = 3.0;
      const a = [bob(0.08, 1.5), swing([0, y, 0], [1, 0, 0], 0.05, 1.1)];
      parts.push(cyl([0, y, 0], [0.55, 4.2, 0.55], '#e6e7ea', { rot: [0, 0, 90], anim: a, rough: 0.3, metal: 0.5 }));
      parts.push(sphere([2.2, y, 0], [0.7, 0.55, 0.55], '#f4f4f8', { anim: a }));
      parts.push(cone([-2.3, y + 0.1, 0], [0.55, 0.9, 0.55], '#f4f4f8', { rot: [0, 0, 90], anim: a }));
      parts.push(box([0.2, y, 0], [1.1, 0.08, 5.5], '#3a86ff', { anim: a }));
      parts.push(box([-2.2, y + 0.1, 0], [0.6, 0.06, 2.0], '#3a86ff', { anim: a }));
      parts.push(box([-2.3, y + 0.7, 0], [0.7, 1.2, 0.06], '#e63946', { anim: a }));
      for (const s of [-1, 1]) {
        parts.push(cyl([0.4, y - 0.4, s * 1.5], [0.28, 0.9, 0.28], '#5a6270', { rot: [0, 0, 90], anim: a }));
        parts.push(sphere([0.95, y - 0.4, s * 1.5], [0.05, 0.4, 0.4], '#dfe3ea', { anim: [spin([1, 0, 0], 20, [0.95, y - 0.4, s * 1.5]), ...a] }));
      }
      for (let i = 0; i < 6; i++) parts.push(sphere([1.4 - i * 0.6, y + 0.15, 0.56], [0.12, 0.14, 0.03], '#8fd3ff', { anim: a }), sphere([1.4 - i * 0.6, y + 0.15, -0.56], [0.12, 0.14, 0.03], '#8fd3ff', { anim: a }));
      parts.push(sphere([2.55, y + 0.15, 0], [0.3, 0.2, 0.45], '#8fd3ff', { anim: a }));
      // clouds
      for (const [cx, cy, cz, s] of [[-4, 1.2, 2, 0.8], [3.5, 1.0, -2.5, 0.9], [0.5, 1.4, 4, 0.6]]) {
        parts.push(sphere([cx, cy, cz], s, '#ffffff', { alpha: 0.95, anim: [bob(0.05, 0.7)] }), sphere([cx + s * 0.9, cy - 0.1, cz], s * 0.7, '#ffffff', { alpha: 0.95, anim: [bob(0.05, 0.7)] }), sphere([cx - s * 0.9, cy - 0.1, cz], s * 0.65, '#ffffff', { alpha: 0.95, anim: [bob(0.05, 0.7)] }));
      }
      return parts;
    },
    facts: [
      'Airplanes have big wings that lift them up into the sky.',
      'The first airplane flew more than 100 years ago. It was built by two brothers, Orville and Wilbur Wright.',
      'Airplanes fly very high, way above the clouds, where the air is freezing cold.',
      'The pilot sits at the front in the cockpit and steers the plane.',
      'A big airplane can carry hundreds of people across the ocean in one trip.',
    ],
    quiz: [
      { q: 'What helps an airplane fly?', options: ['Its wings', 'Its wheels', 'Its seats'], answer: 0 },
      { q: 'Who steers the airplane?', options: ['The pilot', 'The passengers'], answer: 0 },
    ],
  },
  {
    id: 'volcano', name: 'Volcano', emoji: '🌋', category: 'Nature',
    aliases: ['volcano', 'volcanoes', 'volcanos', 'lava', 'vulcano'],
    scene: { sky: ['#3a2a2a', '#a35a3a'], ground: '#3b332f', groundType: 'rock', sun: [-0.3, 0.45, 0.6], sunColor: '#ffc090', sunPower: 3.6, fog: 0.0002 },
    build: () => {
      const parts = [];
      parts.push(cone([0, 1.6, 0], [3.2, 3.2, 3.2], '#4a3b33', { rough: 0.95, skin: 'rough', pattern: 'mottle', color2: '#2e2420', patternScale: 1.5 }));
      for (let i = 0; i < 7; i++) parts.push(sphere([Math.cos(i * 0.9) * (1.6 + i * 0.1), 0.25, Math.sin(i * 0.9) * (1.6 + i * 0.1)], [0.9, 0.5, 0.8], '#4a3b33', { rough: 0.95, skin: 'rough', pattern: 'mottle', color2: '#2e2420', patternScale: 1.5 }));
      parts.push(cyl([0, 3.0, 0], [0.9, 0.6, 0.9], '#302622', { rough: 0.95, skin: 'rough' }));
      parts.push(cyl([0, 3.3, 0], [0.7, 0.1, 0.7], '#ff6a00', { hard: true, emissive: true, color2: '#ffd166' }));
      // lava streams
      // lava streams hug the slope: cone surface height at radius r is 3.2 - r
      for (const ang of [0.4, 2.2, 4.1]) {
        for (let i = 0; i < 6; i++) {
          const r = 0.9 + i * 0.42;
          parts.push(sphere([Math.cos(ang) * r, 3.2 - r + 0.04, Math.sin(ang) * r], [0.34, 0.1, 0.26], '#ff5400', { hard: true, emissive: true, color2: '#ffd166', rot: [0, (-ang * 180) / Math.PI, 45] }));
        }
      }
      // smoke & embers
      for (let i = 0; i < 6; i++) parts.push(sphere([Math.sin(i) * 0.5, 4.0 + i * 0.5, Math.cos(i * 1.3) * 0.5], 0.5 + i * 0.14, '#b8b4b0', { alpha: 0.45, rough: 1, anim: [bob(0.15, 1.2, i)] }));
      for (let i = 0; i < 7; i++) parts.push(sphere([Math.cos(i * 0.9) * 0.5, 3.6 + (i % 3) * 0.5, Math.sin(i * 0.9) * 0.5], 0.09, '#ffb703', { emissive: true, color2: '#fff', anim: [bob(0.5, 2.5 + i * 0.3, i)] }));
      return parts;
    },
    facts: [
      'A volcano is a mountain with a hole at the top that can spit out hot melted rock called lava.',
      'Lava is so hot it glows red and orange, like the inside of a campfire.',
      'Deep under the ground, the melted rock is called magma. When it comes out, we call it lava.',
      'Volcanoes can also blow out ash and smoke high into the sky.',
      'Some islands, like Hawaii, were made by volcanoes growing up out of the sea!',
    ],
    quiz: [
      { q: 'What comes out of a volcano?', options: ['Lava', 'Lemonade', 'Snow'], answer: 0 },
      { q: 'Is lava hot or cold?', options: ['Super hot', 'Freezing cold'], answer: 0 },
    ],
  },
  {
    id: 'tree', name: 'Tree', emoji: '🌳', category: 'Nature', mesh: 'organic', material: { skin: 'rough', pattern: 'mottle', rough: 0.85, sss: 0.15 },
    aliases: ['tree', 'trees', 'oak', 'oak tree', 'forest'],
    scene: GRASS,
    build: () => {
      const parts = [];
      const a = [swing([0, 0, 0], [0, 0, 1], 0.02, 1.2)];
      parts.push(cyl([0, 1.5, 0], [0.55, 3.0, 0.55], '#5e4228', { anim: a }));
      parts.push(cyl([0.5, 2.6, 0.2], [0.22, 1.4, 0.22], '#8b5a2b', { rot: [10, 0, -35], anim: a }));
      parts.push(cyl([-0.5, 2.7, -0.2], [0.2, 1.3, 0.2], '#8b5a2b', { rot: [-10, 0, 35], anim: a }));
      const greens = ['#3a6f2e', '#4a8a3a', '#2f5f28'];
      const blobs = [[0, 4.4, 0, 1.7], [1.1, 3.9, 0.4, 1.2], [-1.1, 3.9, -0.3, 1.2], [0.2, 3.7, 1.1, 1.0], [-0.3, 3.8, -1.1, 1.0], [0.3, 5.3, 0.2, 1.1]];
      blobs.forEach(([x, y, z, s], i) => parts.push(sphere([x, y, z], s, greens[i % 3], { anim: [swing([0, 0, 0], [0, 0, 1], 0.03, 1.2, i)] })));
      for (let i = 0; i < 6; i++) parts.push(sphere([Math.cos(i * 1.1) * 1.3, 4.2 + Math.sin(i * 2.1) * 0.8, Math.sin(i * 1.1) * 1.3], 0.14, '#b8303a', { hard: true, rough: 0.3, anim: a }));
      return parts;
    },
    facts: [
      'Trees make the fresh air we breathe. Thank you, trees!',
      'Trees drink water from the ground with their roots.',
      'Leaves use sunlight to make food for the tree.',
      'Cut a tree trunk and you can count its rings to tell how old it is. One ring for each year!',
      'Some trees are older than 4,000 years. That is older than any person who has ever lived.',
    ],
    quiz: [
      { q: 'How does a tree drink water?', options: ['With its roots', 'With a straw'], answer: 0 },
      { q: 'What do leaves use to make food?', options: ['Sunlight', 'Candy'], answer: 0 },
    ],
  },
  {
    id: 'snowman', name: 'Snowman', emoji: '⛄', category: 'Nature', mesh: 'organic', material: { skin: 'rough', rough: 0.7, sss: 0.4 },
    aliases: ['snowman', 'snow man', 'snow', 'frosty', 'snowmen'],
    scene: { sky: ['#86b8e8', '#eef6fb'], ground: '#eef3f8', groundType: 'snow', sun: [0.4, 0.5, 0.6], sunColor: '#fff4e4' },
    build: () => {
      const parts = [];
      const a = [swing([0, 0, 0], [1, 0, 0], 0.04, 1.5)];
      parts.push(sphere([0, 1.1, 0], 1.15, '#ffffff', { anim: a }));
      parts.push(sphere([0, 2.75, 0], 0.85, '#ffffff', { anim: a }));
      parts.push(sphere([0, 3.95, 0], 0.62, '#ffffff', { anim: a }));
      parts.push(cone([0.65, 3.95, 0], [0.1, 0.6, 0.1], '#e0661a', { hard: true, rough: 0.5, rot: [0, 0, -90], anim: a }));
      parts.push(...eyes([0.5, 4.15, 0], 0.22, 0.08, { white: '#222', pupil: '#222', anim: a }));
      for (let i = 0; i < 3; i++) parts.push(sphere([0.8 - i * 0.03, 3.0 - i * 0.35, 0], 0.08, '#222', { hard: true, anim: a }));
      for (let i = 0; i < 4; i++) parts.push(sphere([0.58 + Math.cos(i * 0.6) * 0.05, 3.7, (i - 1.5) * 0.14], 0.045, '#222', { hard: true, anim: a }));
      parts.push(cyl([0, 4.55, 0], [0.7, 0.1, 0.7], '#222', { hard: true, rough: 0.6, anim: a }));
      parts.push(cyl([0, 4.95, 0], [0.45, 0.75, 0.45], '#222', { hard: true, rough: 0.6, anim: a }));
      parts.push(torus([0, 3.5, 0], [0.75, 0.15, 0.75], '#b8303a', { hard: true, rough: 0.9, anim: a }));
      parts.push(box([0.6, 3.1, 0.3], [0.35, 0.8, 0.35], '#b8303a', { hard: true, rough: 0.9, rot: [0, 0, 10], anim: a }));
      for (const s of [-1, 1]) parts.push(cyl([0, 2.9, s * 1.3], [0.07, 1.3, 0.07], '#6b4226', { hard: true, rough: 0.9, rot: [s * 70, 0, 0], anim: [swing([0, 2.9, s * 0.8], [1, 0, 0], 0.08 * s, 1.5), ...a] }));
      return ground(parts);
    },
    facts: [
      'Snow is made of frozen water that falls from clouds when it is very cold.',
      'Every snowflake has six sides, and no two snowflakes are exactly the same!',
      'To build a snowman, roll three snowballs: a big one, a middle one, and a small one for the head.',
      'Snow looks white, but each tiny snowflake is actually clear like glass.',
      'Snow is a cozy blanket for plants and animals in winter.',
    ],
    quiz: [
      { q: 'What is snow made of?', options: ['Frozen water', 'Sugar', 'Cotton'], answer: 0 },
      { q: 'How many sides does a snowflake have?', options: ['Six', 'Two'], answer: 0 },
    ],
  },
  {
    id: 'robot', name: 'Robot', emoji: '🤖', category: 'Machines',
    aliases: ['robot', 'robots', 'droid', 'android', 'bot'],
    scene: { sky: ['#1b2440', '#7f93b8'], ground: '#5b6068', groundType: 'asphalt', sun: [0.4, 0.7, 0.55] },
    build: () => {
      const parts = [];
      const steel = '#9aa3b2', dark = '#3b4556';
      const a = [bob(0.04, 2)];
      parts.push(box([0, 1.9, 0], [1.4, 1.5, 0.9], steel, { anim: a, rough: 0.35, metal: 0.8 }));
      parts.push(box([0.46, 2.0, 0], [0.05, 0.6, 0.5], '#1d3557', { anim: a }));
      for (let i = 0; i < 3; i++) parts.push(sphere([0.5, 2.15 - i * 0.15, -0.15 + i * 0.15], 0.06, ['#ff4d4d', '#ffd166', '#06d6a0'][i], { emissive: true, color2: '#fff', anim: [bob(0.04, 2), { type: 'bob', amp: 0, speed: 1 }] }));
      parts.push(cyl([0, 2.75, 0], [0.25, 0.2, 0.25], dark, { anim: a }));
      parts.push(box([0, 3.35, 0], [1.0, 0.9, 0.9], steel, { anim: a, rough: 0.35, metal: 0.8 }));
      parts.push(box([0.5, 3.4, 0], [0.05, 0.4, 0.7], '#1d3557', { anim: a }));
      parts.push(...eyes([0.52, 3.42, 0], 0.22, 0.1, { white: '#6ff3ff', pupil: '#0b2a3a', anim: a }));
      parts.push(cyl([0, 4.0, 0], [0.05, 0.5, 0.05], dark, { anim: a }));
      parts.push(sphere([0, 4.3, 0], 0.12, '#ff4d4d', { emissive: true, color2: '#fff', anim: a }));
      for (const s of [-1, 1]) {
        parts.push(sphere([0, 2.5, s * 0.75], 0.2, dark, { anim: a }));
        parts.push(cyl([0, 1.85, s * 0.8], [0.14, 1.1, 0.14], steel, { anim: [swing([0, 2.5, s * 0.8], [0, 0, 1], 0.3, 2, s > 0 ? 0 : Math.PI), ...a] }));
        parts.push(sphere([0, 1.25, s * 0.8], 0.2, dark, { anim: [swing([0, 2.5, s * 0.8], [0, 0, 1], 0.3, 2, s > 0 ? 0 : Math.PI), ...a] }));
        parts.push(cyl([0, 0.6, s * 0.35], [0.18, 1.0, 0.18], dark, { anim: [swing([0, 1.1, s * 0.35], [0, 0, 1], 0.25, 2, s > 0 ? Math.PI : 0)] }));
        parts.push(box([0.1, 0.12, s * 0.35], [0.6, 0.24, 0.35], steel, { anim: [swing([0, 1.1, s * 0.35], [0, 0, 1], 0.25, 2, s > 0 ? Math.PI : 0)] }));
      }
      return ground(parts);
    },
    facts: [
      'A robot is a machine that can do jobs by following instructions.',
      'Some robots build cars, some explore Mars, and some vacuum the floor!',
      'Robots do not get tired, so they can do the same job again and again.',
      'People write special instructions, called code, to tell robots what to do.',
      'Some robots can walk, talk, and even dance!',
    ],
    quiz: [
      { q: 'What tells a robot what to do?', options: ['Instructions called code', 'Magic words'], answer: 0 },
      { q: 'Do robots get tired?', options: ['No', 'Yes, very quickly'], answer: 0 },
    ],
  },
];
