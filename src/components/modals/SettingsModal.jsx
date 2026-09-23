import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Moon, Sun, Palette, Info, RotateCcw, Sparkles, Waves, Gauge, SunMedium, Check } from 'lucide-react';
import {
  getBackgroundConfig,
  getBackgroundActiveColors,
  DEFAULT_CUSTOM_COLORS_LIGHT,
  DEFAULT_CUSTOM_COLORS_DARK,
} from '../../config/backgroundPresets';

const BACKGROUND_PREVIEWS = [
  {
    id: 'animated-gradient',
    title: 'Farbverlauf',
    subtitle: 'Dynamischer Verlauf',
    renderPreview: (isDark) => (
      <div
        className="w-full h-full relative overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #31104b 35%, #1e1b4b 70%, #090d16 100%)'
            : 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 25%, #c084fc 60%, #93c5fd 100%)',
        }}
      >
        <div
          className="absolute -inset-[50%] opacity-40 blur-md mix-blend-overlay"
          style={{
            background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.8), transparent 60%)',
          }}
        />
      </div>
    ),
  },
  {
    id: 'silk',
    title: 'Silk',
    subtitle: 'Fließende Seide',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="silkBgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isDark ? '#0b0813' : '#ede9fe'} />
            <stop offset="50%" stopColor={isDark ? '#231535' : '#ddd6fe'} />
            <stop offset="100%" stopColor={isDark ? '#120d1e' : '#f5f3ff'} />
          </linearGradient>
          <linearGradient id="silkFold1" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={isDark ? '#9333ea' : '#c084fc'} stopOpacity={isDark ? '0.7' : '0.8'} />
            <stop offset="45%" stopColor="#ffffff" stopOpacity={isDark ? '0.6' : '0.9'} />
            <stop offset="80%" stopColor={isDark ? '#3b0764' : '#a855f7'} stopOpacity={isDark ? '0.5' : '0.6'} />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="silkFold2" x1="1" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor={isDark ? '#ec4899' : '#f472b6'} stopOpacity={isDark ? '0.5' : '0.7'} />
            <stop offset="50%" stopColor="#ffffff" stopOpacity={isDark ? '0.5' : '0.8'} />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill="url(#silkBgGrad)" />
        <path d="M-10,30 C30,70 60,-10 110,40 C135,65 150,20 170,35 L170,110 L-10,110 Z" fill="url(#silkFold1)" />
        <path d="M-10,55 C40,95 70,25 120,70 C145,95 155,50 170,60 L170,110 L-10,110 Z" fill="url(#silkFold2)" />
        <path d="M-10,30 C30,70 60,-10 110,40 C135,65 150,20 170,35" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none" />
        <path d="M-10,55 C40,95 70,25 120,70" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: 'floating-lines',
    title: 'Floating Lines',
    subtitle: 'Schwebende Linien',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <rect width="160" height="100" fill={isDark ? '#060813' : '#0f172a'} />
        <defs>
          <linearGradient id="flLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        {[-20, -14, -8, -2, 4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64].map((offset, i) => (
          <path
            key={i}
            d={`M -10,${45 + offset * 0.9} Q 40,${15 + offset * 0.5} 80,${50 + offset * 0.8} T 170,${40 + offset * 0.9}`}
            fill="none"
            stroke="url(#flLineGrad)"
            strokeWidth={i % 3 === 0 ? "1.6" : "0.9"}
            opacity={0.3 + (i / 15) * 0.65}
          />
        ))}
        <path
          d="M -10,55 Q 40,25 80,60 T 170,50"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          opacity="0.8"
        />
      </svg>
    ),
  },
  {
    id: 'side-rays',
    title: 'Side Rays',
    subtitle: 'Lichtstrahlen',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="raySource" cx="0%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#c084fc" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rayBeam1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rayBeam2" x1="0" y1="0" x2="1" y2="0.8">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill={isDark ? '#050711' : '#0f172a'} />
        <polygon points="0,0 70,100 25,100" fill="url(#rayBeam1)" />
        <polygon points="0,0 120,100 75,100" fill="url(#rayBeam2)" />
        <polygon points="0,0 160,80 160,35" fill="url(#rayBeam1)" opacity="0.6" />
        <polygon points="0,0 160,30 160,5" fill="url(#rayBeam2)" opacity="0.4" />
        <polygon points="0,0 100,100 50,100" fill="rgba(255,255,255,0.25)" />
        <circle cx="0" cy="0" r="35" fill="url(#raySource)" />
      </svg>
    ),
  },
  {
    id: 'color-bends',
    title: 'Color Bends',
    subtitle: 'Fließende Kurven',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cbGrad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff007a" />
            <stop offset="50%" stopColor="#7928ca" />
            <stop offset="100%" stopColor="#0070f3" />
          </linearGradient>
          <linearGradient id="cbGrad2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00dfd8" />
            <stop offset="50%" stopColor="#7928ca" />
            <stop offset="100%" stopColor="#ff4b4b" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill={isDark ? '#080816' : '#0f172a'} />
        <path d="M-20,20 C30,80 50,-20 100,60 C130,100 150,20 180,40" stroke="url(#cbGrad1)" strokeWidth="18" fill="none" opacity="0.85" strokeLinecap="round" />
        <path d="M-20,60 C40,-10 60,90 110,30 C140,-10 160,70 180,80" stroke="url(#cbGrad2)" strokeWidth="16" fill="none" opacity="0.85" strokeLinecap="round" />
        <path d="M-20,40 C20,95 80,10 120,75 C140,100 160,50 180,60" stroke="#f43f5e" strokeWidth="8" fill="none" opacity="0.75" />
        <path d="M-20,75 C30,30 90,95 130,45 C150,20 170,60 180,50" stroke="#00dfd8" strokeWidth="7" fill="none" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: 'grainient',
    title: 'Grainient',
    subtitle: 'Film-Körnung',
    renderPreview: (isDark) => (
      <div
        className="w-full h-full relative overflow-hidden"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 20% 30%, #8b5cf6 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #ec4899 0%, transparent 60%), radial-gradient(ellipse at 50% 90%, #3b82f6 0%, transparent 50%), #090d16'
            : 'radial-gradient(ellipse at 20% 30%, #f472b6 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #60a5fa 0%, transparent 60%), radial-gradient(ellipse at 50% 90%, #c084fc 0%, transparent 50%), #f8fafc',
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50 mix-blend-overlay">
          <filter id="grainFilterPreview">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grainFilterPreview)" />
        </svg>
      </div>
    ),
  },
  {
    id: 'beams',
    title: 'Beams',
    subtitle: '3D-Lichtbündel',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="beamA" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#c084fc" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beamB" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#f472b6" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beamCore" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="beamFloor" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="160" height="100" fill={isDark ? '#050711' : '#0f172a'} />
        <rect y="60" width="160" height="40" fill="url(#beamFloor)" />
        <rect x="25" y="0" width="18" height="100" fill="url(#beamA)" opacity="0.6" />
        <rect x="32" y="0" width="4" height="100" fill="url(#beamCore)" opacity="0.8" />
        <rect x="55" y="0" width="26" height="100" fill="url(#beamB)" opacity="0.75" />
        <rect x="66" y="0" width="5" height="100" fill="url(#beamCore)" opacity="0.95" />
        <rect x="95" y="0" width="22" height="100" fill="url(#beamA)" opacity="0.8" />
        <rect x="104" y="0" width="4" height="100" fill="url(#beamCore)" opacity="0.9" />
        <rect x="130" y="0" width="16" height="100" fill="url(#beamB)" opacity="0.5" />
        <rect x="136" y="0" width="3" height="100" fill="url(#beamCore)" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: 'prismatic-burst',
    title: 'Prismatic Burst',
    subtitle: 'Spektral-Prisma',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100">
        <defs>
          <radialGradient id="pbCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="160" height="100" fill={isDark ? '#03050c' : '#0b0f19'} />
        <g transform="translate(80, 50)">
          {[
            '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
            '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
            '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316',
            '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
          ].map((col, idx) => {
            const deg = (idx / 24) * 360;
            return (
              <polygon
                key={idx}
                points="0,-2 95,-7 100,0 95,7 0,2"
                fill={col}
                opacity="0.8"
                transform={`rotate(${deg})`}
              />
            );
          })}
          <circle cx="0" cy="0" r="32" fill="url(#pbCore)" />
          <circle cx="0" cy="0" r="7" fill="#ffffff" />
        </g>
      </svg>
    ),
  },
  {
    id: 'iridescence',
    title: 'Iridescence',
    subtitle: 'Perlmutt-Schimmer',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="iridBase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="25%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="75%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="iridWave" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="35%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill={isDark ? '#080816' : '#0f172a'} />
        <path d="M-10,30 Q30,-10 80,40 T170,20 L170,110 L-10,110 Z" fill="url(#iridBase)" opacity="0.85" />
        <path d="M-10,60 Q50,20 90,70 T170,50 L170,110 L-10,110 Z" fill="url(#iridWave)" opacity="0.8" />
        <ellipse cx="65" cy="45" rx="45" ry="25" fill="url(#iridBase)" opacity="0.75" />
        <ellipse cx="110" cy="35" rx="35" ry="20" fill="url(#iridWave)" opacity="0.8" />
        <path d="M10,25 Q50,75 110,35 T160,40" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.85" />
      </svg>
    ),
  },
  {
    id: 'liquid-chrome',
    title: 'Liquid Chrome',
    subtitle: 'Flüssiges Metall',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chromeMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="20%" stopColor="#334155" />
            <stop offset="38%" stopColor="#f8fafc" />
            <stop offset="55%" stopColor="#475569" />
            <stop offset="72%" stopColor="#ffffff" />
            <stop offset="90%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="chromeGlow" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill="url(#chromeMetal)" />
        <path d="M-10,40 C30,10 60,70 100,30 C130,5 150,45 170,25 L170,110 L-10,110 Z" fill="url(#chromeGlow)" opacity="0.65" />
        <path d="M-10,65 C40,35 70,85 120,50 C145,30 155,70 170,55 L170,110 L-10,110 Z" fill="url(#chromeMetal)" opacity="0.85" />
        <path d="M-10,38 C30,8 60,68 100,28 C130,3 150,43 170,23" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.95" />
        <path d="M-10,63 C40,33 70,83 120,48 C145,28 155,68 170,53" stroke="#ffffff" strokeWidth="1.8" fill="none" opacity="0.9" />
        <path d="M10,80 Q50,55 90,82 T160,70" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'balatro',
    title: 'Balatro',
    subtitle: 'Hypnotischer Wirbel',
    renderPreview: (isDark) => (
      <svg className="w-full h-full" viewBox="0 0 160 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="balatroVortex" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#111827" stopOpacity="1" />
            <stop offset="40%" stopColor="#1e1b4b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#090514" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="balatroRed" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="balatroBlue" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <pattern id="balatroCRT" width="100" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="160" height="100" fill="url(#balatroVortex)" />
        <path
          d="M 80,50 Q 120,10 150,30 T 170,90 Q 130,110 90,80 T 30,70 Q 10,40 40,20 T 110,25 Q 130,50 100,70 T 65,55"
          fill="none"
          stroke="url(#balatroRed)"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M 80,50 Q 50,90 20,70 T 5,20 Q 40,-5 80,15 T 145,45 Q 160,80 125,95 T 70,85 Q 45,65 75,45"
          fill="none"
          stroke="url(#balatroBlue)"
          strokeWidth="13"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M 80,50 Q 115,20 140,40 T 150,85 Q 115,100 85,75 T 45,60"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          opacity="0.75"
        />
        <path
          d="M 80,50 Q 55,80 30,65 T 20,30 Q 50,10 85,25"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.7"
        />
        <circle cx="80" cy="50" r="10" fill="#111827" />
        <circle cx="80" cy="50" r="6" fill="#ef4444" opacity="0.9" />
        <circle cx="80" cy="50" r="3" fill="#ffffff" />
        <rect width="160" height="100" fill="url(#balatroCRT)" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'solid',
    title: 'Einfarbig',
    subtitle: 'Ruhig & Schlicht',
    renderPreview: (isDark) => (
      <div
        className="w-full h-full flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-600"
        style={{ background: isDark ? '#0f172a' : '#f8fafc' }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-gray-400 dark:border-gray-500 shadow-inner" style={{ background: isDark ? '#1e293b' : '#e2e8f0' }} />
        <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 font-semibold tracking-wider mt-1">
          EINFARBIG
        </span>
      </div>
    ),
  },
];

const SettingsModal = ({
  isOpen,
  onClose,
  theme,
  toggleTheme,
  appVersion = '1.0.0',
  backgroundStyle = 'animated-gradient',
  setBackgroundStyle,
  globalBgSpeed = 1.0,
  setGlobalBgSpeed,
  activeBgPreset = '1',
  setActiveBgPreset,
  customColorsLight = DEFAULT_CUSTOM_COLORS_LIGHT,
  setCustomColorsLight,
  customColorsDark = DEFAULT_CUSTOM_COLORS_DARK,
  setCustomColorsDark,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  // Welcher Farbmodus wird im Color-Chooser gerade konfiguriert (default: aktuelles Theme)
  const [editingMode, setEditingMode] = useState(theme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    if (isOpen) {
      setEditingMode(theme === 'dark' ? 'dark' : 'light');
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, theme]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  if (!isOpen && !isVisible) return null;

  const config = getBackgroundConfig(backgroundStyle);
  const isEditingDark = editingMode === 'dark';
  const currentCustomColors = isEditingDark ? customColorsDark : customColorsLight;
  const setCurrentCustomColors = isEditingDark ? setCustomColorsDark : setCustomColorsLight;
  const currentPresets = config.presets[isEditingDark ? 'dark' : 'light'] || [];

  const activePreviewColors = getBackgroundActiveColors(
    backgroundStyle,
    activeBgPreset,
    currentCustomColors,
    isEditingDark
  );

  const renderGradientPreview = (colors) => {
    if (!colors || colors.length === 0) return '#8b5cf6';
    if (colors.length === 1) return colors[0];
    return `linear-gradient(135deg, ${colors.join(', ')})`;
  };

  return createPortal(
    <div
      style={{ zIndex: 120 }}
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print-hidden-modal transition-all duration-250 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl shadow-2xl max-w-lg w-full relative border border-gray-200/80 dark:border-gray-700/80 overflow-hidden transform transition-all duration-250 ease-out flex flex-col max-h-[90vh] ${
          isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800/50">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                Einstellungen
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Erscheinungsbild, Theme-Farben & Optionen
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Sektion: Erscheinungsbild */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <Palette size={14} className="text-purple-500" />
              <span>Erscheinungsbild & Theme</span>
            </div>

            {/* 1. Farbschema (Hell / Dunkel) */}
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3.5 border border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Farbschema
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Aktuell: {theme === 'dark' ? 'Dunkles Design' : 'Helles Design'}
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-200/70 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => {
                    if (theme === 'dark') toggleTheme();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    theme !== 'dark'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Sun size={13} className="text-amber-500" />
                  <span>Hell</span>
                </button>
                <button
                  onClick={() => {
                    if (theme !== 'dark') toggleTheme();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    theme === 'dark'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Moon size={13} className="text-indigo-400" />
                  <span>Dunkel</span>
                </button>
              </div>
            </div>

            {/* 2. Visual Background Gallery Selector */}
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3.5 border border-gray-200/80 dark:border-gray-700/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Palette size={14} className="text-purple-500" />
                    <span>Hintergrund-Stil auswählen</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Klicke auf eine Karte, um den Hintergrund direkt zu aktivieren
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 rounded-lg text-xs font-medium text-purple-700 dark:text-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span>Aktiv: {BACKGROUND_PREVIEWS.find((b) => b.id === backgroundStyle)?.title || 'Standard'}</span>
                </div>
              </div>

              {/* Grid mit visuellen Miniatur-Vorschauen */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 sm:max-h-72 overflow-y-auto p-1 pr-1.5 custom-scrollbar">
                {BACKGROUND_PREVIEWS.map((item) => {
                  const isActive = backgroundStyle === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBackgroundStyle?.(item.id)}
                      className={`group flex flex-col text-left rounded-xl p-1.5 border transition-all duration-200 relative cursor-pointer ${
                        isActive
                          ? 'border-purple-500 ring-2 ring-purple-500/40 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs'
                          : 'border-gray-200 dark:border-gray-700/80 hover:border-purple-300 dark:hover:border-purple-600 bg-white dark:bg-gray-800 hover:shadow-xs'
                      }`}
                    >
                      {/* Mini-Vorschau-Fenster mit echtem Foto (Hell & Dunkel) */}
                      <div className="h-14 w-full rounded-lg overflow-hidden relative shadow-inner border border-black/10 dark:border-white/10 mb-1.5 transition-transform duration-200 group-hover:scale-[1.02] bg-gray-900">
                        <img
                          key={`${item.id}-${(editingMode === 'dark' || theme === 'dark') ? 'dark' : 'light'}`}
                          src={`${import.meta.env.BASE_URL}previews/${item.id}-${(editingMode === 'dark' || theme === 'dark') ? 'dark' : 'light'}.webp`}
                          alt={item.title}
                          className="w-full h-full object-cover block transition-opacity duration-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.svg-preview-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                        <div className="svg-preview-fallback hidden w-full h-full">
                          {item.renderPreview(editingMode === 'dark' || theme === 'dark')}
                        </div>
                        {isActive && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-purple-600/90 text-white text-[9px] font-semibold flex items-center gap-0.5 shadow-xs backdrop-blur-xs">
                            <Check size={10} />
                            <span>Aktiv</span>
                          </div>
                        )}
                      </div>

                      {/* Titel & Subtitel */}
                      <div className="px-0.5 pb-0.5">
                        <div className={`text-xs font-semibold truncate ${isActive ? 'text-purple-700 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>
                          {item.title}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Globaler Hintergrund-Geschwindigkeits-Regler */}
            {backgroundStyle !== 'solid' && (
              <div className="bg-purple-50/60 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-200/80 dark:border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Gauge size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        Globale Hintergrund-Geschwindigkeit
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        Steuert das Tempo für alle animierten Hintergründe einheitlich
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-800 shadow-xs">
                    {Math.round(globalBgSpeed * 100)}% ({globalBgSpeed.toFixed(1)}x)
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] font-medium text-gray-400">Ruhig</span>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={globalBgSpeed}
                    onChange={(e) => setGlobalBgSpeed?.(parseFloat(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer h-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                  />
                  <span className="text-[11px] font-medium text-gray-400">Schnell</span>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {[
                    { label: '0.5x Sehr ruhig', val: 0.5 },
                    { label: '1.0x Standard', val: 1.0 },
                    { label: '1.5x Dynamisch', val: 1.5 },
                    { label: '2.0x Schnell', val: 2.0 },
                  ].map((chip) => (
                    <button
                      key={chip.val}
                      type="button"
                      onClick={() => setGlobalBgSpeed?.(chip.val)}
                      className={`flex-1 py-1 text-[11px] font-medium rounded-md border transition ${
                        Math.abs(globalBgSpeed - chip.val) < 0.05
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs font-semibold'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Universeller Farb- & Preset-Chooser */}
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700/80 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Palette size={14} className="text-purple-500" />
                    <span>Farben & Presets ({config.title})</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    6 abgestimmte Presets oder eigene Wunschfarben wählen
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Modus-Umschalter für Farben */}
                  <div className="flex items-center bg-gray-200/80 dark:bg-gray-800 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditingMode('light')}
                      className={`px-2 py-1 rounded-md transition ${
                        editingMode === 'light'
                          ? 'bg-white dark:bg-gray-700 font-semibold text-gray-900 dark:text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                      }`}
                    >
                      Hell
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMode('dark')}
                      className={`px-2 py-1 rounded-md transition ${
                        editingMode === 'dark'
                          ? 'bg-white dark:bg-gray-700 font-semibold text-gray-900 dark:text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                      }`}
                    >
                      Dunkel
                    </button>
                  </div>

                  {/* Reset-Button auf Preset 1 */}
                  <button
                    type="button"
                    onClick={() => setActiveBgPreset('1')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 transition shadow-xs"
                    title="Auf Preset 1 (Standard) zurücksetzen"
                  >
                    <RotateCcw size={12} />
                    <span>Standard</span>
                  </button>
                </div>
              </div>

              {/* Live-Vorschau der aktuellen Farben */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Live-Vorschau ({editingMode === 'dark' ? 'Dunkelmodus' : 'Hellmodus'}):</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {activeBgPreset === 'custom' ? 'Eigene Farben aktiv' : `Preset ${activeBgPreset} aktiv`}
                  </span>
                </div>
                <div
                  className="h-10 w-full rounded-xl shadow-inner border border-black/10 dark:border-white/10 transition-all duration-300 flex items-center justify-center"
                  style={{
                    background: renderGradientPreview(activePreviewColors),
                  }}
                >
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded backdrop-blur-md bg-black/25 text-white shadow-xs">
                    {config.title} • {activeBgPreset === 'custom' ? 'Benutzerdefiniert' : (currentPresets.find(p => String(p.id) === String(activeBgPreset))?.name || `Preset ${activeBgPreset}`)}
                  </span>
                </div>
              </div>

              {/* Die 6 Presets */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  6 Farb-Presets ({editingMode === 'dark' ? 'Dunkel' : 'Hell'}):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentPresets.map((preset) => {
                    const isSelected = String(activeBgPreset) === String(preset.id);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setActiveBgPreset(String(preset.id))}
                        className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl border text-left transition relative ${
                          isSelected
                            ? 'border-purple-500 ring-2 ring-purple-400/40 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                        title={preset.name}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                        <div
                          className="w-full h-4 rounded-md shadow-xs border border-black/10 dark:border-white/10"
                          style={{
                            background: renderGradientPreview(preset.colors),
                          }}
                        />
                        <div className="w-full text-center">
                          <span className="text-[10px] font-medium text-gray-800 dark:text-gray-200 truncate block">
                            {preset.id}. {preset.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Benutzerdefinierte Farben (Custom 1..4) */}
              <div className="space-y-2 pt-2 border-t border-gray-200/70 dark:border-gray-700/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Eigene Wunschfarben (Custom)
                    </span>
                    {activeBgPreset === 'custom' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded">
                        Aktiv
                      </span>
                    )}
                  </div>
                  {activeBgPreset !== 'custom' && (
                    <button
                      type="button"
                      onClick={() => setActiveBgPreset('custom')}
                      className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-medium"
                    >
                      Eigene Farben anwenden
                    </button>
                  )}
                </div>

                <div
                  className={`grid gap-2 pt-0.5 ${
                    config.colorCount === 1
                      ? 'grid-cols-1'
                      : config.colorCount === 2
                      ? 'grid-cols-2'
                      : config.colorCount === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {Array.from({ length: config.colorCount }).map((_, idx) => {
                    const colorVal = currentCustomColors[idx] || (editingMode === 'dark' ? '#a855f7' : '#ec4899');
                    const label = config.colorLabels[idx] || `Farbe ${idx + 1}`;
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border shadow-xs transition ${
                          activeBgPreset === 'custom'
                            ? 'bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-700/70'
                            : 'bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate max-w-full">
                          {label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={colorVal}
                            onChange={(e) => {
                              const next = [...currentCustomColors];
                              next[idx] = e.target.value;
                              setCurrentCustomColors(next);
                              if (activeBgPreset !== 'custom') {
                                setActiveBgPreset('custom');
                              }
                            }}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600 p-0 bg-transparent"
                            title={`${label} ändern`}
                          />
                          <span className="text-[10px] font-mono font-medium text-gray-700 dark:text-gray-300 uppercase">
                            {colorVal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sektion: Über die Anwendung */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <Info size={14} className="text-emerald-500" />
              <span>App-Information</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Installierte Version</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                v{appVersion}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm hover:shadow transition"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;
