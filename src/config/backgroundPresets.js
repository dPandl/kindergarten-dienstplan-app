/**
 * backgroundPresets.js
 * Zentrale Definition aller Hintergrundfarben, Presets (1 bis 6) und Hilfsfunktionen.
 */

export const DEFAULT_CUSTOM_COLORS_LIGHT = ['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4'];
export const DEFAULT_CUSTOM_COLORS_DARK = ['#f43f5e', '#a855f7', '#6366f1', '#06b6d4'];

export const BACKGROUND_CONFIGS = {
  'animated-gradient': {
    id: 'animated-gradient',
    title: 'Farbverlauf',
    colorCount: 3,
    colorLabels: ['Farbe 1', 'Farbe 2', 'Farbe 3'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#0f172a', '#1e1b4b', '#111827'] },
        { id: '2', name: 'Nachtviolett', colors: ['#1e1b4b', '#3b0764', '#111827'] },
        { id: '3', name: 'Nordlicht', colors: ['#064e3b', '#0f172a', '#1e1b4b'] },
        { id: '4', name: 'Tiefsee', colors: ['#0c4a6e', '#1e1b4b', '#0f172a'] },
        { id: '5', name: 'Cyber-Glut', colors: ['#831843', '#31104b', '#0f172a'] },
        { id: '6', name: 'Smaragd-Nacht', colors: ['#022c22', '#0f172a', '#172554'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#fbcfe8', '#e9d5ff', '#bfdbfe'] },
        { id: '2', name: 'Sonnenaufgang', colors: ['#fed7aa', '#fecdd3', '#e9d5ff'] },
        { id: '3', name: 'Frische Minze', colors: ['#bbf7d0', '#bfdbfe', '#e9d5ff'] },
        { id: '4', name: 'Ozeanbrise', colors: ['#bae6fd', '#c7d2fe', '#e0e7ff'] },
        { id: '5', name: 'Pfirsichblüte', colors: ['#fef08a', '#fed7aa', '#fbcfe8'] },
        { id: '6', name: 'Lavendelhauch', colors: ['#e9d5ff', '#ddd6fe', '#c7d2fe'] },
      ],
    },
  },

  silk: {
    id: 'silk',
    title: 'Silk',
    colorCount: 1,
    colorLabels: ['Seidenfarbe'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#231d2b'] },
        { id: '2', name: 'Königs-Violett', colors: ['#3b0764'] },
        { id: '3', name: 'Nacht-Smaragd', colors: ['#064e3b'] },
        { id: '4', name: 'Mitternachtsblau', colors: ['#1e1b4b'] },
        { id: '5', name: 'Rubin-Samt', colors: ['#4c0519'] },
        { id: '6', name: 'Obsidian-Graphit', colors: ['#18181b'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#8b8296'] },
        { id: '2', name: 'Puder-Rose', colors: ['#f472b6'] },
        { id: '3', name: 'Flüster-Lavendel', colors: ['#a855f7'] },
        { id: '4', name: 'Himmel-Seide', colors: ['#38bdf8'] },
        { id: '5', name: 'Mint-Perle', colors: ['#34d399'] },
        { id: '6', name: 'Champagner-Glanz', colors: ['#fbbf24'] },
      ],
    },
  },

  'floating-lines': {
    id: 'floating-lines',
    title: 'Floating Lines',
    colorCount: 3,
    colorLabels: ['Linie 1', 'Linie 2', 'Linie 3'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#f43f5e', '#a855f7', '#06b6d4'] },
        { id: '2', name: 'Cyberpunk', colors: ['#ec4899', '#8b5cf6', '#3b82f6'] },
        { id: '3', name: 'Nordlicht', colors: ['#10b981', '#06b6d4', '#6366f1'] },
        { id: '4', name: 'Glut & Lava', colors: ['#ef4444', '#f97316', '#eab308'] },
        { id: '5', name: 'Neon-Matrix', colors: ['#22c55e', '#10b981', '#06b6d4'] },
        { id: '6', name: 'Ultra-Violet', colors: ['#c084fc', '#818cf8', '#e879f9'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#ec4899', '#a855f7', '#3b82f6'] },
        { id: '2', name: 'Pastell-Traum', colors: ['#fbcfe8', '#e9d5ff', '#bfdbfe'] },
        { id: '3', name: 'Sonnenschein', colors: ['#f59e0b', '#ec4899', '#8b5cf6'] },
        { id: '4', name: 'Smaragd & Cyan', colors: ['#10b981', '#06b6d4', '#3b82f6'] },
        { id: '5', name: 'Zuckerwatte', colors: ['#f472b6', '#38bdf8', '#c084fc'] },
        { id: '6', name: 'Tropischer Fluss', colors: ['#06b6d4', '#10b981', '#fbbf24'] },
      ],
    },
  },

  'side-rays': {
    id: 'side-rays',
    title: 'Side Rays',
    colorCount: 2,
    colorLabels: ['Strahl 1', 'Strahl 2'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#818cf8', '#f43f5e'] },
        { id: '2', name: 'Cosmic Glow', colors: ['#c084fc', '#38bdf8'] },
        { id: '3', name: 'Sonnenfinsternis', colors: ['#f59e0b', '#dc2626'] },
        { id: '4', name: 'Biolumineszenz', colors: ['#10b981', '#06b6d4'] },
        { id: '5', name: 'Amethyst-Licht', colors: ['#a855f7', '#ec4899'] },
        { id: '6', name: 'Eis & Feuer', colors: ['#38bdf8', '#f97316'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#8b5cf6', '#ec4899'] },
        { id: '2', name: 'Himmelsstrahlen', colors: ['#3b82f6', '#06b6d4'] },
        { id: '3', name: 'Morgendämmerung', colors: ['#f97316', '#ec4899'] },
        { id: '4', name: 'Frühlingswiese', colors: ['#10b981', '#3b82f6'] },
        { id: '5', name: 'Goldene Stunde', colors: ['#eab308', '#ec4899'] },
        { id: '6', name: 'Polarstern', colors: ['#6366f1', '#14b8a6'] },
      ],
    },
  },

  'color-bends': {
    id: 'color-bends',
    title: 'Color Bends',
    colorCount: 4,
    colorLabels: ['Farbe 1', 'Farbe 2', 'Farbe 3', 'Farbe 4'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#f43f5e', '#a855f7', '#6366f1', '#3b82f6'] },
        { id: '2', name: 'Neon-Retro', colors: ['#ff007a', '#7928ca', '#0070f3', '#00dfd8'] },
        { id: '3', name: 'Tiefsee-Wirbel', colors: ['#06b6d4', '#3b82f6', '#1d4ed8', '#1e1b4b'] },
        { id: '4', name: 'Feuersturm', colors: ['#ef4444', '#f97316', '#f59e0b', '#7c2d12'] },
        { id: '5', name: 'Smaragd-Zauber', colors: ['#10b981', '#059669', '#06b6d4', '#6366f1'] },
        { id: '6', name: 'Purpur-Dämmerung', colors: ['#d946ef', '#8b5cf6', '#4338ca', '#1e1b4b'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4'] },
        { id: '2', name: 'Candy-Pop', colors: ['#f472b6', '#c084fc', '#60a5fa', '#34d399'] },
        { id: '3', name: 'Sonnenallee', colors: ['#f59e0b', '#f43f5e', '#a855f7', '#3b82f6'] },
        { id: '4', name: 'Frischer Wind', colors: ['#06b6d4', '#10b981', '#3b82f6', '#8b5cf6'] },
        { id: '5', name: 'Pastell-Harmonie', colors: ['#fbcfe8', '#e9d5ff', '#c7d2fe', '#bae6fd'] },
        { id: '6', name: 'Beeren-Cocktail', colors: ['#db2777', '#9333ea', '#4f46e5', '#0284c7'] },
      ],
    },
  },

  grainient: {
    id: 'grainient',
    title: 'Grainient',
    colorCount: 3,
    colorLabels: ['Farbe 1', 'Farbe 2', 'Farbe 3'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#8b5cf6', '#ec4899', '#0f172a'] },
        { id: '2', name: 'Nebel-Aura', colors: ['#3b82f6', '#8b5cf6', '#030712'] },
        { id: '3', name: 'Smaragd-Dunst', colors: ['#10b981', '#06b6d4', '#064e3b'] },
        { id: '4', name: 'Lava-Korn', colors: ['#ef4444', '#f59e0b', '#180808'] },
        { id: '5', name: 'Mitternacht-Violett', colors: ['#a855f7', '#6366f1', '#090d16'] },
        { id: '6', name: 'Eismeer', colors: ['#06b6d4', '#3b82f6', '#0f172a'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#fbcfe8', '#e9d5ff', '#bfdbfe'] },
        { id: '2', name: 'Puderzucker', colors: ['#fce7f3', '#f3e8ff', '#e0e7ff'] },
        { id: '3', name: 'Sommerbrise', colors: ['#fef08a', '#fed7aa', '#bbf7d0'] },
        { id: '4', name: 'Skyline', colors: ['#bae6fd', '#c7d2fe', '#fbcfe8'] },
        { id: '5', name: 'Rosengarten', colors: ['#fecdd3', '#fbcfe8', '#ede9fe'] },
        { id: '6', name: 'Lagune', colors: ['#99f6e4', '#bae6fd', '#e0e7ff'] },
      ],
    },
  },

  beams: {
    id: 'beams',
    title: 'Beams',
    colorCount: 2,
    colorLabels: ['Bündelfarbe', 'Lichtfarbe'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#a855f7', '#f43f5e'] },
        { id: '2', name: 'Sci-Fi Laser', colors: ['#06b6d4', '#3b82f6'] },
        { id: '3', name: 'Gold-Prisma', colors: ['#f59e0b', '#eab308'] },
        { id: '4', name: 'Cyber-Grün', colors: ['#10b981', '#22c55e'] },
        { id: '5', name: 'Tiefsee-Kanal', colors: ['#3b82f6', '#8b5cf6'] },
        { id: '6', name: 'Vulkan-Schlot', colors: ['#ef4444', '#f97316'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#8b5cf6', '#ec4899'] },
        { id: '2', name: 'Himmelsleiter', colors: ['#3b82f6', '#60a5fa'] },
        { id: '3', name: 'Frühlingsstrahl', colors: ['#10b981', '#06b6d4'] },
        { id: '4', name: 'Bernstein-Licht', colors: ['#f59e0b', '#fbbf24'] },
        { id: '5', name: 'Violett-Glanz', colors: ['#9333ea', '#c084fc'] },
        { id: '6', name: 'Sonnenkegel', colors: ['#f97316', '#f43f5e'] },
      ],
    },
  },

  'prismatic-burst': {
    id: 'prismatic-burst',
    title: 'Prismatic Burst',
    colorCount: 4,
    colorLabels: ['Spektrum 1', 'Spektrum 2', 'Spektrum 3', 'Spektrum 4'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#f43f5e', '#a855f7', '#6366f1', '#06b6d4'] },
        { id: '2', name: 'Supernova', colors: ['#ef4444', '#f59e0b', '#ec4899', '#8b5cf6'] },
        { id: '3', name: 'Nordlicht-Explosion', colors: ['#10b981', '#06b6d4', '#3b82f6', '#a855f7'] },
        { id: '4', name: 'Plasma-Kern', colors: ['#d946ef', '#8b5cf6', '#3b82f6', '#06b6d4'] },
        { id: '5', name: 'Solar-Flare', colors: ['#f97316', '#eab308', '#ef4444', '#b91c1c'] },
        { id: '6', name: 'Tiefraum-Spektrum', colors: ['#818cf8', '#c084fc', '#38bdf8', '#34d399'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4'] },
        { id: '2', name: 'Regenbogen-Traum', colors: ['#f43f5e', '#fbbf24', '#10b981', '#3b82f6'] },
        { id: '3', name: 'Pastell-Prisma', colors: ['#fbcfe8', '#e9d5ff', '#bfdbfe', '#bbf7d0'] },
        { id: '4', name: 'Zitrus & Beere', colors: ['#f43f5e', '#fb923c', '#facc15', '#a855f7'] },
        { id: '5', name: 'Ozean-Gischt', colors: ['#0284c7', '#06b6d4', '#10b981', '#6366f1'] },
        { id: '6', name: 'Violett-Sonne', colors: ['#a855f7', '#ec4899', '#f59e0b', '#3b82f6'] },
      ],
    },
  },

  iridescence: {
    id: 'iridescence',
    title: 'Iridescence',
    colorCount: 1,
    colorLabels: ['Perlmutt-Farbe'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#7c3aed'] },
        { id: '2', name: 'Cyber-Pink', colors: ['#db2777'] },
        { id: '3', name: 'Aqua-Schimmer', colors: ['#0891b2'] },
        { id: '4', name: 'Smaragd-Glanz', colors: ['#059669'] },
        { id: '5', name: 'Gold-Perlmutt', colors: ['#d97706'] },
        { id: '6', name: 'Kobaltblau', colors: ['#2563eb'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#8b5cf6'] },
        { id: '2', name: 'Zartrosa-Schimmer', colors: ['#f472b6'] },
        { id: '3', name: 'Türkis-Perle', colors: ['#06b6d4'] },
        { id: '4', name: 'Minz-Opal', colors: ['#34d399'] },
        { id: '5', name: 'Pfirsich-Glanz', colors: ['#fb923c'] },
        { id: '6', name: 'Himmelblau', colors: ['#38bdf8'] },
      ],
    },
  },

  'liquid-chrome': {
    id: 'liquid-chrome',
    title: 'Liquid Chrome',
    colorCount: 1,
    colorLabels: ['Metallfarbe'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#7c3aed'] },
        { id: '2', name: 'Chrom-Silber', colors: ['#64748b'] },
        { id: '3', name: 'Titan-Blau', colors: ['#2563eb'] },
        { id: '4', name: 'Roségold-Chrom', colors: ['#e11d48'] },
        { id: '5', name: 'Smaragd-Metall', colors: ['#059669'] },
        { id: '6', name: 'Bronze-Glanz', colors: ['#b45309'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#8b5cf6'] },
        { id: '2', name: 'Reines Flüssig-Silber', colors: ['#94a3b8'] },
        { id: '3', name: 'Himmel-Metall', colors: ['#38bdf8'] },
        { id: '4', name: 'Rosa Perlmutt', colors: ['#f472b6'] },
        { id: '5', name: 'Gold-Legierung', colors: ['#f59e0b'] },
        { id: '6', name: 'Platin-Mint', colors: ['#2dd4bf'] },
      ],
    },
  },

  balatro: {
    id: 'balatro',
    title: 'Balatro',
    colorCount: 3,
    colorLabels: ['Farbe 1 (Primär)', 'Farbe 2 (Sekundär)', 'Farbe 3 (Hintergrund)'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#7c3aed', '#db2777', '#0f172a'] },
        { id: '2', name: 'Original Spiel (Rot/Blau)', colors: ['#dc2626', '#2563eb', '#050510'] },
        { id: '3', name: 'Cyber-Strudel', colors: ['#06b6d4', '#a855f7', '#030712'] },
        { id: '4', name: 'Vulkan & Glut', colors: ['#ea580c', '#dc2626', '#180808'] },
        { id: '5', name: 'Gift-Hypnose', colors: ['#22c55e', '#a855f7', '#052e16'] },
        { id: '6', name: 'Mitternacht-Gold', colors: ['#f59e0b', '#6366f1', '#0f172a'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#8b5cf6', '#ec4899', '#bfdbfe'] },
        { id: '2', name: 'Original Spiel (Rot/Blau)', colors: ['#ef4444', '#3b82f6', '#ffffff'] },
        { id: '3', name: 'Pastell-Wirbel', colors: ['#fbcfe8', '#c7d2fe', '#f8fafc'] },
        { id: '4', name: 'Mint & Ozean', colors: ['#34d399', '#38bdf8', '#f0fdf4'] },
        { id: '5', name: 'Zitrus-Strudel', colors: ['#f59e0b', '#ec4899', '#fffbeb'] },
        { id: '6', name: 'Lavendel-Welle', colors: ['#a855f7', '#38bdf8', '#faf5ff'] },
      ],
    },
  },

  solid: {
    id: 'solid',
    title: 'Einfarbig',
    colorCount: 1,
    colorLabels: ['Hintergrundfarbe'],
    presets: {
      dark: [
        { id: '1', name: '★ App-Standard', colors: ['#0f172a'] },
        { id: '2', name: 'Tiefes Slate', colors: ['#090d16'] },
        { id: '3', name: 'Nacht-Indigo', colors: ['#1e1b4b'] },
        { id: '4', name: 'Obsidian', colors: ['#111827'] },
        { id: '5', name: 'Dunkelgrau', colors: ['#18181b'] },
        { id: '6', name: 'Mitternacht', colors: ['#030712'] },
      ],
      light: [
        { id: '1', name: '★ App-Standard', colors: ['#f1f5f9'] },
        { id: '2', name: 'Pastell-Flieder', colors: ['#faf5ff'] },
        { id: '3', name: 'Pastell-Rosa', colors: ['#fdf2f8'] },
        { id: '4', name: 'Sanftes Sky', colors: ['#f0f9ff'] },
        { id: '5', name: 'Reines Weiß', colors: ['#ffffff'] },
        { id: '6', name: 'Warmgrau', colors: ['#f8fafc'] },
      ],
    },
  },
};

/**
 * Holt die Konfiguration für eine gegebene Hintergrund-ID (oder Fallback auf animated-gradient)
 */
export function getBackgroundConfig(bgId) {
  return BACKGROUND_CONFIGS[bgId] || BACKGROUND_CONFIGS['animated-gradient'];
}

/**
 * Gibt ein Array von Hex-Farben (Länge = config.colorCount) zurück,
 * basierend darauf, ob ein Preset (1-6) oder 'custom' aktiv ist.
 */
export function getBackgroundActiveColors(bgId, presetId, customColors, isDark) {
  const config = getBackgroundConfig(bgId);
  const modeKey = isDark ? 'dark' : 'light';
  const needed = config.colorCount || 1;

  if (presetId === 'custom') {
    const list = Array.isArray(customColors) ? customColors : (isDark ? DEFAULT_CUSTOM_COLORS_DARK : DEFAULT_CUSTOM_COLORS_LIGHT);
    const result = [];
    for (let i = 0; i < needed; i++) {
      result.push(list[i] || (isDark ? '#a855f7' : '#ec4899'));
    }
    return result;
  }

  // Preset 1..6
  const presetList = config.presets[modeKey] || config.presets.dark;
  const match = presetList.find((p) => String(p.id) === String(presetId)) || presetList[0];
  return match.colors.slice(0, needed);
}

/**
 * Wandelt das Array von Hex-Farben in das spezifische Format um,
 * das die jeweilige Hintergrundkomponente erwartet.
 */
export function resolveBackgroundProps(bgId, colors) {
  const c = colors || [];
  switch (bgId) {
    case 'solid':
    case 'silk':
    case 'iridescence':
    case 'liquid-chrome':
      return c[0] || '#8b5cf6';

    case 'side-rays':
      return {
        color1: c[0] || '#818cf8',
        color2: c[1] || '#f43f5e',
      };

    case 'beams':
      return {
        beamColor: c[0] || '#a855f7',
        lightColor: c[1] || '#f43f5e',
      };

    case 'grainient':
    case 'balatro':
      return {
        color1: c[0] || '#7c3aed',
        color2: c[1] || '#db2777',
        color3: c[2] || '#0f172a',
      };

    case 'floating-lines':
    case 'animated-gradient':
      return [c[0] || '#f43f5e', c[1] || '#a855f7', c[2] || '#06b6d4'];

    case 'color-bends':
    case 'prismatic-burst':
    default:
      return [c[0] || '#f43f5e', c[1] || '#a855f7', c[2] || '#6366f1', c[3] || '#3b82f6'];
  }
}
