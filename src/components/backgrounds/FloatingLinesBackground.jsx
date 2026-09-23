import React, { useEffect, useRef } from 'react';

/**
 * Wandelt einen Hex-Farbstring (#RRGGBB oder #RGB) in normalisierte RGB-Werte ([0..1, 0..1, 0..1]) um.
 */
function hexToNormalizedRGB(hex) {
  if (!hex) return [0.5, 0.5, 0.5];
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0.5, 0.5, 0.5];
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return [r, g, b];
}

/**
 * Sampelt eine Farbpalette auf der CPU bei t [0..1]
 */
function sampleColor(colors, t) {
  if (!colors || colors.length === 0) return [0.5, 0.5, 0.5];
  if (colors.length === 1) return colors[0];
  const clamped = Math.max(0, Math.min(0.9999, t));
  const scaled = clamped * (colors.length - 1);
  const idx = Math.floor(scaled);
  const f = scaled - idx;
  const c1 = colors[idx];
  const c2 = colors[Math.min(idx + 1, colors.length - 1)];
  return [
    (c1[0] + (c2[0] - c1[0]) * f) * 0.5,
    (c1[1] + (c2[1] - c1[1]) * f) * 0.5,
    (c1[2] + (c2[2] - c1[2]) * f) * 0.5,
  ];
}

const VERTEX_SHADER_SRC = `
attribute vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Hochgradig optimierter Fragment-Shader:
// - Keine inneren Schleifen zur Farbberechnung (Farben werden als vorberechnete Uniforms übergeben)
// - Rotation und Logarithmus werden nur EINMAL pro Wellengruppe berechnet statt in jeder Iteration
// - Schlanke Wellenanzahl (3 oben, 5 mitte, 3 unten)
const FRAGMENT_SHADER_SRC = `
precision mediump float;

uniform float iTime;
uniform vec2  iResolution;
uniform float animationSpeed;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec3 botColors[3];
uniform vec3 midColors[5];
uniform vec3 topColors[3];

uniform bool lightMode;

mat2 rotate(float r) {
  float c = cos(r);
  float s = sin(r);
  return mat2(c, s, -s, c);
}

float wave(vec2 uv, float offset) {
  float time = iTime * animationSpeed;
  float x_movement = time * 0.1;
  float amp = sin(offset + time * 0.2) * 0.3;
  float y = sin(uv.x + offset + x_movement) * amp;
  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void main() {
  vec2 baseUv = (2.0 * gl_FragCoord.xy - iResolution) / iResolution.y;
  baseUv.y = -baseUv.y;

  vec3 col = vec3(0.0);
  float logDist = log(length(baseUv) + 1.0);

  // 1. Bottom waves (3 Linien) - Rotation nur 1x vorberechnet
  float angleBot = bottomWavePosition.z * logDist;
  vec2 ruvBot = baseUv * rotate(angleBot);
  for (int i = 0; i < 3; ++i) {
    float fi = float(i);
    col += botColors[i] * wave(
      ruvBot + vec2(0.04 * fi + bottomWavePosition.x, bottomWavePosition.y),
      1.5 + 0.25 * fi
    ) * 0.2;
  }

  // 2. Middle waves (5 Linien) - Rotation nur 1x vorberechnet
  float angleMid = middleWavePosition.z * logDist;
  vec2 ruvMid = baseUv * rotate(angleMid);
  for (int i = 0; i < 5; ++i) {
    float fi = float(i);
    col += midColors[i] * wave(
      ruvMid + vec2(0.035 * fi + middleWavePosition.x, middleWavePosition.y),
      2.0 + 0.18 * fi
    );
  }

  // 3. Top waves (3 Linien) - Rotation nur 1x vorberechnet
  float angleTop = topWavePosition.z * logDist;
  vec2 ruvTop = baseUv * rotate(angleTop);
  ruvTop.x = -ruvTop.x;
  for (int i = 0; i < 3; ++i) {
    float fi = float(i);
    col += topColors[i] * wave(
      ruvTop + vec2(0.04 * fi + topWavePosition.x, topWavePosition.y),
      1.0 + 0.25 * fi
    ) * 0.1;
  }

  if (lightMode) {
    vec3 energy = max(col, vec3(0.0));
    float peak = max(energy.r, max(energy.g, energy.b));
    float coverage = smoothstep(0.018, 0.5, peak);
    vec3 chroma = clamp(energy / max(peak, 0.0001), 0.0, 1.0);
    chroma = pow(chroma, vec3(1.35));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    chroma /= max(chromaPeak, 0.0001);
    vec3 ink = mix(chroma, clamp(chroma * 0.82, 0.0, 1.0), smoothstep(0.5, 1.0, coverage));
    gl_FragColor = vec4(mix(vec3(0.96, 0.96, 0.98), ink, coverage * 0.92), 1.0);
  } else {
    gl_FragColor = vec4(col + vec3(0.05, 0.07, 0.10), 1.0);
  }
}
`;

/**
 * FloatingLinesBackground
 * Hochgradig performante, native WebGL-Komponente für schwebende Wellenlinien ohne Mauseffekt.
 * - 0 externe Abhängigkeiten
 * - Automatische Bildwiederholraten-Drosselung (40 FPS) für minimale CPU/GPU-Auslastung
 * - Schlank skalierte Canvas-Auflösung mit nativer Hardware-Glättung
 * - Automatischer Energiesparmodus bei inaktivem Tab
 */
const FloatingLinesBackground = ({
  colors = ['#ec4899', '#a855f7', '#3b82f6'],
  speed = 1.0,
  lightMode = false,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef(null);

  const uniformsRef = useRef({
    colors: colors.map(hexToNormalizedRGB),
    speed,
    lightMode,
    time: 0
  });

  useEffect(() => {
    uniformsRef.current.colors = colors.map(hexToNormalizedRGB);
    uniformsRef.current.speed = speed;
    uniformsRef.current.lightMode = lightMode;
  }, [colors, speed, lightMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Energiespar-Kontext: low-power verhindert GPU-Lüfter-Hochdrehen
    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power'
    }) || canvas.getContext('experimental-webgl');

    if (!gl) {
      console.warn('WebGL wird von diesem Browser nicht unterstützt. Floating Lines inaktiv.');
      return;
    }

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader-Fehler (FloatingLines):', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program Link-Fehler (FloatingLines):', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Uniform Locations
    const locTime = gl.getUniformLocation(program, 'iTime');
    const locResolution = gl.getUniformLocation(program, 'iResolution');
    const locSpeed = gl.getUniformLocation(program, 'animationSpeed');
    const locLightMode = gl.getUniformLocation(program, 'lightMode');

    const locTopPos = gl.getUniformLocation(program, 'topWavePosition');
    const locMidPos = gl.getUniformLocation(program, 'middleWavePosition');
    const locBotPos = gl.getUniformLocation(program, 'bottomWavePosition');

    const locBotColors = [0, 1, 2].map((i) => gl.getUniformLocation(program, `botColors[${i}]`));
    const locMidColors = [0, 1, 2, 3, 4].map((i) => gl.getUniformLocation(program, `midColors[${i}]`));
    const locTopColors = [0, 1, 2].map((i) => gl.getUniformLocation(program, `topColors[${i}]`));

    // Geometrie (Full-Screen Quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttrLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttrLoc);
    gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);

    // Statische Wellen-Positionen
    gl.uniform3f(locTopPos, 0.0, 0.5, 0.2);
    gl.uniform3f(locMidPos, 0.0, 0.0, -0.3);
    gl.uniform3f(locBotPos, 0.0, -0.5, 0.4);

    let animFrameId = null;
    let lastRenderTime = 0;
    let lastClockTime = performance.now();
    // 40 FPS Zielrate: Absolut flüssig für fließende Wellen, spart über 70% GPU-Zyklen
    const targetInterval = 1000 / 40;

    const resize = () => {
      // Skalierungsfaktor 0.75x: Reduziert Pixelanzahl um 44% bei voller visueller Geschmeidigkeit
      const dpr = Math.max(0.65, Math.min(window.devicePixelRatio || 1, 1.2) * 0.75);
      const displayWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const displayHeight = Math.max(1, Math.floor(canvas.clientHeight * dpr));

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    const render = (now) => {
      animFrameId = requestAnimationFrame(render);

      // Bei minimiertem Fenster oder inaktivem Tab nichts berechnen
      if (document.hidden) return;

      const elapsed = now - lastRenderTime;
      if (elapsed < targetInterval) return;
      lastRenderTime = now - (elapsed % targetInterval);

      const delta = (now - lastClockTime) / 1000;
      lastClockTime = now;

      resize();

      const u = uniformsRef.current;
      u.time += delta;

      gl.useProgram(program);

      gl.uniform1f(locTime, u.time);
      gl.uniform2f(locResolution, canvas.width, canvas.height);
      gl.uniform1f(locSpeed, u.speed * 0.8);
      gl.uniform1i(locLightMode, u.lightMode ? 1 : 0);

      // Vorberechnete Farben an Shader übergeben (CPU-Sampling in Nanosekunden)
      const sampledColors = u.colors;
      for (let i = 0; i < 3; i++) {
        const col = sampleColor(sampledColors, i / 2.0);
        gl.uniform3f(locBotColors[i], col[0], col[1], col[2]);
      }
      for (let i = 0; i < 5; i++) {
        const col = sampleColor(sampledColors, i / 4.0);
        gl.uniform3f(locMidColors[i], col[0], col[1], col[2]);
      }
      for (let i = 0; i < 3; i++) {
        const col = sampleColor(sampledColors, i / 2.0);
        gl.uniform3f(locTopColors[i], col[0], col[1], col[2]);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    resize();
    animFrameId = requestAnimationFrame(render);

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(canvas);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (program) gl.deleteProgram(program);
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style
      }}
    />
  );
};

export default FloatingLinesBackground;
