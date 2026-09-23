import React, { useEffect, useRef } from 'react';

/**
 * Wandelt einen Hex-Farbstring (#RRGGBB oder #RGB) in normalisierte RGB-Werte ([0..1, 0..1, 0..1]) um.
 */
function hexToRGB(hex) {
  if (!hex) return [0.5, 0.5, 0.5];
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0.5, 0.5, 0.5];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  ];
}

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
#define MAX_COLORS 8

varying vec2 vUv;

uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform float uNoise;
uniform float uIntensity;
uniform float uBandWidth;
uniform float uLightMode;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  
  // Rotationsmatrix anwenden
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / max(uCanvas.y, 1.0)), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;

  // Organische Wellen-Iterationen
  for (int j = 0; j < 3; j++) {
    vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
    q += (rr - q) * 0.15;
  }

  vec3 col = vec3(0.0);
  float cover = 0.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }
    col = clamp(sumCol, 0.0, 1.0);
  } else {
    col = vec3(0.5);
  }

  col *= uIntensity;

  if (uNoise > 0.0001) {
    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  if (uLightMode > 0.5) {
    // Sanfte Pastell-/Hintergrund-Aufhellung für den Light-Mode
    vec3 bgBase = vec3(0.96, 0.97, 0.98);
    col = mix(bgBase, col, clamp(cover * 0.75, 0.0, 1.0));
  } else {
    // Dunkler Hintergrund für den Dark-Mode
    vec3 bgDark = vec3(0.06, 0.07, 0.09);
    col = mix(bgDark, col, clamp(cover * 0.9, 0.0, 1.0));
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * ColorBendsBackground
 * Autonomer, fließender Farbbänder-Hintergrund (ReactBits Color Bends)
 * 100% ohne Mausinteraktion.
 */
const ColorBendsBackground = ({
  colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981'],
  speed = 0.3,
  rotation = 45,
  scale = 1.0,
  frequency = 1.2,
  warpStrength = 1.0,
  noise = 0.06,
  intensity = 1.2,
  bandWidth = 5.0,
  lightMode = false
}) => {
  const canvasRef = useRef(null);
  const uniformsRef = useRef({
    colors,
    speed,
    rotation,
    scale,
    frequency,
    warpStrength,
    noise,
    intensity,
    bandWidth,
    lightMode
  });

  useEffect(() => {
    uniformsRef.current = {
      colors,
      speed,
      rotation,
      scale,
      frequency,
      warpStrength,
      noise,
      intensity,
      bandWidth,
      lightMode
    };
  }, [colors, speed, rotation, scale, frequency, warpStrength, noise, intensity, bandWidth, lightMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: false,
      antialias: false,
      powerPreference: 'low-power'
    });

    if (!gl) return;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }

    gl.useProgram(program);

    // Uniform Locations
    const locCanvas = gl.getUniformLocation(program, 'uCanvas');
    const locTime = gl.getUniformLocation(program, 'uTime');
    const locSpeed = gl.getUniformLocation(program, 'uSpeed');
    const locRot = gl.getUniformLocation(program, 'uRot');
    const locColorCount = gl.getUniformLocation(program, 'uColorCount');
    const locColors = gl.getUniformLocation(program, 'uColors');
    const locScale = gl.getUniformLocation(program, 'uScale');
    const locFrequency = gl.getUniformLocation(program, 'uFrequency');
    const locWarpStrength = gl.getUniformLocation(program, 'uWarpStrength');
    const locNoise = gl.getUniformLocation(program, 'uNoise');
    const locIntensity = gl.getUniformLocation(program, 'uIntensity');
    const locBandWidth = gl.getUniformLocation(program, 'uBandWidth');
    const locLightMode = gl.getUniformLocation(program, 'uLightMode');

    // Quad Geometrie
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    let animId = null;
    let lastFrameTime = 0;
    let accumulatedTime = 0;
    const targetInterval = 1000 / 35; // ~35 FPS

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const render = (now) => {
      animId = requestAnimationFrame(render);
      if (document.hidden) return;

      const elapsed = now - lastFrameTime;
      if (elapsed < targetInterval) return;

      const delta = Math.min(elapsed / 1000, 0.1);
      lastFrameTime = now;
      accumulatedTime += delta;

      resize();

      const u = uniformsRef.current;
      gl.useProgram(program);

      gl.uniform2f(locCanvas, canvas.width, canvas.height);
      gl.uniform1f(locTime, accumulatedTime);
      gl.uniform1f(locSpeed, u.speed);

      const rad = (u.rotation * Math.PI) / 180;
      gl.uniform2f(locRot, Math.cos(rad), Math.sin(rad));

      const count = Math.min(u.colors.length, 8);
      gl.uniform1i(locColorCount, count);

      const flatColors = [];
      for (let i = 0; i < 8; i++) {
        if (i < count) {
          flatColors.push(...hexToRGB(u.colors[i]));
        } else {
          flatColors.push(0, 0, 0);
        }
      }
      gl.uniform3fv(locColors, new Float32Array(flatColors));

      gl.uniform1f(locScale, u.scale);
      gl.uniform1f(locFrequency, u.frequency);
      gl.uniform1f(locWarpStrength, u.warpStrength);
      gl.uniform1f(locNoise, u.noise);
      gl.uniform1f(locIntensity, u.intensity);
      gl.uniform1f(locBandWidth, u.bandWidth);
      gl.uniform1f(locLightMode, u.lightMode ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none"
      style={{ opacity: 0.95 }}
    />
  );
};

export default React.memo(ColorBendsBackground);
