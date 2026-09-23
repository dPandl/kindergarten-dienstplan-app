import React, { useEffect, useRef } from 'react';

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

varying vec2 vUv;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSpeed;
uniform vec3  uBeamColor;
uniform vec3  uLightColor;
uniform vec3  uBgColor;
uniform float uNoiseIntensity;
uniform float uScale;
uniform float uRotation;
uniform float uLightMode;

// Simplex / Perlin 2D Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

mat2 rotate(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
  
  // Rotation anwenden
  uv = rotate(radians(uRotation)) * uv;

  float t = uTime * uSpeed;
  
  // Berechnung mehrerer Lichtstrahlen (Beams)
  float totalBeam = 0.0;
  float totalSpecular = 0.0;
  
  const int BEAM_COUNT = 9;
  for (int i = 0; i < BEAM_COUNT; i++) {
    float fi = float(i);
    float beamOffset = (fi - float(BEAM_COUNT - 1) * 0.5) * 0.28;
    
    // Organische Welle pro Strahl
    float wave = snoise(vec2(fi * 1.7 + t * 0.4, uv.y * (1.5 * uScale) - t * 0.8)) * (0.12 * uNoiseIntensity);
    wave += snoise(vec2(fi * 3.1 - t * 0.2, uv.y * (3.0 * uScale) + t * 0.5)) * (0.05 * uNoiseIntensity);
    
    float dist = abs(uv.x - beamOffset - wave);
    
    // Kern des Strahls mit weichem Abfall
    float beamWidth = 0.035;
    float core = smoothstep(beamWidth, 0.0, dist);
    float glow = exp(-dist * 18.0) * 0.65;
    
    // Tiefen-Dämpfung an den Enden
    float fadeY = smoothstep(1.2, 0.0, abs(uv.y));
    
    float intensity = (core + glow) * fadeY;
    totalBeam += intensity;
    
    // Glanzlicht
    float spec = pow(core, 2.5) * fadeY;
    totalSpecular += spec;
  }

  // Dithering gegen Farbabrisse
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.015;

  vec3 col = uBgColor;
  vec3 beamRgb = mix(uBeamColor, uLightColor, clamp(totalSpecular * 0.7, 0.0, 1.0));
  
  if (uLightMode > 0.5) {
    // Light Mode: Helle Strahlen auf hellem Hintergrund
    col = mix(uBgColor, beamRgb, clamp(totalBeam * 0.35, 0.0, 0.85));
    col += uLightColor * (totalSpecular * 0.2);
  } else {
    // Dark Mode: Leuchtende Strahlen auf dunklem Hintergrund
    col += beamRgb * (totalBeam * 0.6);
    col += uLightColor * (totalSpecular * 0.4);
  }

  col += vec3(dither);

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * BeamsBackground
 * ReactBits Beams (Organische 3D-Lichtstrahlen)
 * 100% ohne Mausinteraktion.
 */
const BeamsBackground = ({
  beamColor = '#a855f7',
  lightColor = '#ec4899',
  speed = 0.5,
  noiseIntensity = 1.4,
  scale = 1.0,
  rotation = 15,
  lightMode = false
}) => {
  const canvasRef = useRef(null);
  const uniformsRef = useRef({
    beamColor,
    lightColor,
    speed,
    noiseIntensity,
    scale,
    rotation,
    lightMode
  });

  useEffect(() => {
    uniformsRef.current = {
      beamColor,
      lightColor,
      speed,
      noiseIntensity,
      scale,
      rotation,
      lightMode
    };
  }, [beamColor, lightColor, speed, noiseIntensity, scale, rotation, lightMode]);

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

    const locRes = gl.getUniformLocation(program, 'uResolution');
    const locTime = gl.getUniformLocation(program, 'uTime');
    const locSpeed = gl.getUniformLocation(program, 'uSpeed');
    const locBeamColor = gl.getUniformLocation(program, 'uBeamColor');
    const locLightColor = gl.getUniformLocation(program, 'uLightColor');
    const locBgColor = gl.getUniformLocation(program, 'uBgColor');
    const locNoise = gl.getUniformLocation(program, 'uNoiseIntensity');
    const locScale = gl.getUniformLocation(program, 'uScale');
    const locRot = gl.getUniformLocation(program, 'uRotation');
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
    const targetInterval = 1000 / 35; // 35 FPS

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

      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locTime, accumulatedTime);
      gl.uniform1f(locSpeed, u.speed);
      gl.uniform3fv(locBeamColor, new Float32Array(hexToRGB(u.beamColor)));
      gl.uniform3fv(locLightColor, new Float32Array(hexToRGB(u.lightColor)));

      const bg = u.lightMode ? [0.96, 0.97, 0.98] : [0.06, 0.07, 0.09];
      gl.uniform3fv(locBgColor, new Float32Array(bg));

      gl.uniform1f(locNoise, u.noiseIntensity);
      gl.uniform1f(locScale, u.scale);
      gl.uniform1f(locRot, u.rotation);
      gl.uniform1f(locLightMode, u.lightMode ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let lastFrameTime = 0;
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

export default React.memo(BeamsBackground);
