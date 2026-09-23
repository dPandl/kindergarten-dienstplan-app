import React, { useEffect, useRef } from 'react';

function hexToRGB(hex) {
  if (!hex) return [0.2, 0.2, 0.2];
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0.2, 0.2, 0.2];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  ];
}

const VERTEX_SRC = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;

uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uBaseColor;
uniform float uAmplitude;
uniform float uFrequencyX;
uniform float uFrequencyY;
uniform float uSpeed;
uniform float uLightMode;

varying vec2 vUv;

vec4 renderChrome(vec2 uvCoord) {
  vec2 fragCoord = uvCoord * uResolution;
  float minRes = min(uResolution.x, uResolution.y);
  vec2 uv = (2.0 * fragCoord - uResolution) / max(minRes, 1.0);

  float t = uTime * uSpeed;

  // Autonome flüssige Verformung ohne Maus
  for (float i = 1.0; i < 7.0; i++) {
    uv.x += (uAmplitude / i) * cos(i * uFrequencyX * uv.y + t);
    uv.y += (uAmplitude / i) * cos(i * uFrequencyY * uv.x + t);
  }

  // Chromglanz-Reflexion
  float wave = abs(sin(t * 0.6 - uv.y - uv.x));
  vec3 color = uBaseColor / max(wave, 0.08);

  if (uLightMode > 0.5) {
    // Light Mode: Kühles, perlendes Silber-Chrom
    vec3 silver = vec3(0.92, 0.94, 0.96);
    color = mix(silver, color * 0.8 + vec3(0.2), 0.45);
    color = clamp(color, 0.0, 1.0);
  } else {
    // Dark Mode: Tiefes Titan/Metall
    color = clamp(color * 1.1, 0.0, 1.0);
  }

  return vec4(color, 1.0);
}

void main() {
  vec4 col = vec4(0.0);
  vec2 offset = 0.5 / uResolution;
  
  col += renderChrome(vUv);
  col += renderChrome(vUv + vec2(offset.x, 0.0));
  col += renderChrome(vUv + vec2(0.0, offset.y));
  col += renderChrome(vUv + offset);
  
  gl_FragColor = col * 0.25;
}
`;

/**
 * LiquidChromeBackground
 * ReactBits Liquid Chrome (Flüssig-Metall / Quecksilber)
 * 100% ohne Mausinteraktion.
 */
const LiquidChromeBackground = ({
  baseColor = '#3b82f6',
  speed = 0.35,
  amplitude = 0.25,
  frequencyX = 2.5,
  frequencyY = 2.5,
  lightMode = false
}) => {
  const canvasRef = useRef(null);
  const uniformsRef = useRef({
    baseColor,
    speed,
    amplitude,
    frequencyX,
    frequencyY,
    lightMode
  });

  useEffect(() => {
    uniformsRef.current = {
      baseColor,
      speed,
      amplitude,
      frequencyX,
      frequencyY,
      lightMode
    };
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, lightMode]);

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
    const locRes = gl.getUniformLocation(program, 'uResolution');
    const locBaseColor = gl.getUniformLocation(program, 'uBaseColor');
    const locAmp = gl.getUniformLocation(program, 'uAmplitude');
    const locFreqX = gl.getUniformLocation(program, 'uFrequencyX');
    const locFreqY = gl.getUniformLocation(program, 'uFrequencyY');
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
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform3fv(locBaseColor, new Float32Array(hexToRGB(u.baseColor)));
      gl.uniform1f(locAmp, u.amplitude);
      gl.uniform1f(locFreqX, u.frequencyX);
      gl.uniform1f(locFreqY, u.frequencyY);
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

export default React.memo(LiquidChromeBackground);
