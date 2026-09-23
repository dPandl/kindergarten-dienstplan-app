import React, { useEffect, useRef } from 'react';

function hexToRGB(hex) {
  if (!hex) return [1, 1, 1];
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [1, 1, 1];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  ];
}

const VERTEX_SRC = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;

uniform float uTime;
uniform vec3  uColor;
uniform vec3  uResolution;
uniform float uAmplitude;
uniform float uSpeed;
uniform float uLightMode;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / max(mr, 1.0);

  // Autonome sanfte Oszillation ohne Maus
  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;

  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;

  if (uLightMode > 0.5) {
    // Light Mode: Helles, perlmuttartiges Schillern
    float energy = max(max(col.r, col.g), col.b);
    vec3 hue = col / max(energy, 0.001);
    col = mix(vec3(0.96, 0.97, 0.98), clamp(hue * 0.65 + col * 0.25, 0.0, 1.0), 0.75);
  } else {
    // Dark Mode: Tiefes, irisierendes Farbenspiel
    col = clamp(col * 1.15, 0.0, 1.0);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * IridescenceBackground
 * ReactBits Iridescence (Schillernder Perlmutt- / Ölfilm-Effekt)
 * 100% ohne Mausinteraktion.
 */
const IridescenceBackground = ({
  color = '#8b5cf6',
  speed = 0.8,
  amplitude = 0.1,
  lightMode = false
}) => {
  const canvasRef = useRef(null);
  const uniformsRef = useRef({
    color,
    speed,
    amplitude,
    lightMode
  });

  useEffect(() => {
    uniformsRef.current = {
      color,
      speed,
      amplitude,
      lightMode
    };
  }, [color, speed, amplitude, lightMode]);

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

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }

    gl.useProgram(program);

    const locTime = gl.getUniformLocation(program, 'uTime');
    const locColor = gl.getUniformLocation(program, 'uColor');
    const locRes = gl.getUniformLocation(program, 'uResolution');
    const locAmplitude = gl.getUniformLocation(program, 'uAmplitude');
    const locSpeed = gl.getUniformLocation(program, 'uSpeed');
    const locLightMode = gl.getUniformLocation(program, 'uLightMode');

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    let animId = null;
    let lastTime = 0;
    let accumulatedTime = 0;
    const targetInterval = 1000 / 35;

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

      const elapsed = now - lastTime;
      if (elapsed < targetInterval) return;

      const delta = Math.min(elapsed / 1000, 0.1);
      lastTime = now;
      accumulatedTime += delta;

      resize();

      const u = uniformsRef.current;
      gl.useProgram(program);

      gl.uniform1f(locTime, accumulatedTime);
      gl.uniform3fv(locColor, new Float32Array(hexToRGB(u.color)));
      gl.uniform3f(locRes, canvas.width, canvas.height, canvas.width / Math.max(canvas.height, 1));
      gl.uniform1f(locAmplitude, u.amplitude);
      gl.uniform1f(locSpeed, u.speed);
      gl.uniform1f(locLightMode, u.lightMode ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      gl.deleteBuffer(buf);
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

export default React.memo(IridescenceBackground);
