import { DINOS } from './library-dinos.js';
import { ANIMALS } from './library-animals.js';
import { WORLD } from './library-world.js';

export const LIBRARY = [...DINOS, ...ANIMALS, ...WORLD];
export const BY_ID = Object.fromEntries(LIBRARY.map((c) => [c.id, c]));
export const CATEGORIES = [...new Set(LIBRARY.map((c) => c.category))];
