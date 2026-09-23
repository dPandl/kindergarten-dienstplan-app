import React, { useEffect, useRef } from 'react';

function hexToRgb01(hex) {
  if (!hex) return [0.5, 0.5, 0.5];
  let h = hex.trim().replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const intVal = parseInt(h.slice(0, 6), 16);
  if (isNaN(intVal)) return [0.5, 0.5, 0.5];
  return [
    ((intVal >> 16) & 255) / 255,
    ((intVal >> 8) & 255) / 255,
    (intVal & 255) / 255
  ];
}

const VERTEX_SRC = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uDistort;
uniform float uNoiseAmount;
uniform int   uRayCount;
uniform float uLightMode;
uniform int   uColorCount;
uniform sampler2D uGradient;

float hash21(vec2 p) {
  p = floor(p);
  float f = 52.9829189 * fract(dot(p, vec2(0.065, 0.005)));
  return fract(f);
}

mat2 rot30() { return mat2(0.8, -0.5, 0.5, 0.8); }

float layeredNoise(vec2 fragPx) {
  vec2 p = mod(fragPx + vec2(uTime * uSpeed * 2.0, -uTime * uSpeed * 1.5), 1024.0);
  vec2 q = rot30() * p;
  float n = 0.0;
  n += 0.40 * hash21(q);
  n += 0.25 * hash21(q * 2.0 + 17.0);
  n += 0.20 * hash21(q * 4.0 + 47.0);
  n += 0.10 * hash21(q * 8.0 + 113.0);
  n += 0.05 * hash21(q * 16.0 + 191.0);
  return n;
}

vec3 rayDir(vec2 frag, vec2 res) {
  float focal = res.y * 1.0;
  return normalize(vec3(2.0 * frag - res, focal));
}

float edgeFade(vec2 frag, vec2 res) {
  vec2 toC = frag - 0.5 * res;
  float r = length(toC) / (0.5 * min(res.x, res.y));
  float x = clamp(r, 0.0, 1.0);
  float q = x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  float s = q * 0.5;
  s = pow(s, 1.5);
  float tail = 1.0 - pow(1.0 - s, 2.0);
  s = mix(s, tail, 0.2);
  float dn = (layeredNoise(frag * 0.15) - 0.5) * 0.0015 * s;
  return clamp(s + dn, 0.0, 1.0);
}

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0); }

vec2 rot2(vec2 v, float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c) * v;
}

float bendAngle(vec3 q, float t) {
  return 0.8 * sin(q.x * 0.55 + t * 0.6)
       + 0.7 * sin(q.y * 0.50 - t * 0.5)
       + 0.6 * sin(q.z * 0.60 + t * 0.7);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float t = uTime * uSpeed;
  float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
  vec3 dir = rayDir(frag, uResolution);
  float marchT = 0.0;
  vec3 col = vec3(0.0);
  float n = layeredNoise(frag);
  float amp = clamp(uDistort, 0.0, 50.0) * 0.15;

  // Autonome 3D-Rotation
  vec3 ang = vec3(t * 0.25, t * 0.18, t * 0.14);
  mat3 rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);

  for (int i = 0; i < 36; ++i) {
    vec3 P = marchT * dir;
    P.z -= 2.0;
    float rad = length(P);
    vec3 Pl = P * (10.0 / max(rad, 1e-6));
    Pl = rot3dMat * Pl;

    float stepLen = min(rad - 0.3, n * jitterAmp) + 0.12;

    float grow = smoothstep(0.35, 3.0, marchT);
    float a1 = amp * grow * bendAngle(Pl * 0.6, t);
    float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + 3.1, t * 0.9);
    vec3 Pb = Pl;
    Pb.xz = rot2(Pb.xz, a1);
    Pb.xy = rot2(Pb.xy, a2);

    float rayPattern = smoothstep(
      0.5, 0.7,
      sin(Pb.x + cos(Pb.y) * cos(Pb.z)) *
      sin(Pb.z + sin(Pb.y) * cos(Pb.x + t))
    );

    if (uRayCount > 0) {
      float angRay = atan(Pb.y, Pb.x);
      float comb = 0.5 + 0.5 * cos(float(uRayCount) * angRay);
      comb = pow(comb, 3.0);
      rayPattern *= smoothstep(0.15, 0.95, comb);
    }

    vec3 spectralDefault = 1.0 + vec3(
      cos(marchT * 3.0 + 0.0),
      cos(marchT * 3.0 + 1.0),
      cos(marchT * 3.0 + 2.0)
    );

    float saw = fract(marchT * 0.25);
    float tRay = saw * saw * (3.0 - 2.0 * saw);
    vec3 userGradient = 2.0 * texture(uGradient, vec2(tRay, 0.5)).rgb;
    vec3 spectral = (uColorCount > 0) ? userGradient : spectralDefault;

    vec3 base = (0.05 / (0.4 + stepLen))
              * smoothstep(5.0, 0.0, rad)
              * spectral;

    col += base * rayPattern;
    marchT += stepLen;
  }

  col *= edgeFade(frag, uResolution);
  col *= uIntensity;
  col = clamp(col, 0.0, 1.0);

  if (uLightMode > 0.5) {
    float energy = max(max(col.r, col.g), col.b);
    vec3 hue = col / max(energy, 0.0001);
    float neutral = min(hue.r, min(hue.g, hue.b));
    hue = max(hue - vec3(neutral * 0.68), vec3(0.0));
    hue /= max(max(hue.r, max(hue.g, hue.b)), 0.0001);
    vec3 pigment = mix(hue, hue * hue, 0.24) * 0.64;
    float coverage = smoothstep(0.001, 0.32, energy);
    coverage = pow(coverage, 0.72) * 0.92;
    col = mix(vec3(0.96, 0.97, 0.98), pigment, coverage);
  }

  fragColor = vec4(col, 1.0);
}
`;

/**
 * PrismaticBurstBackground
 * ReactBits Prismatic Burst (Spektrale Prisma-Lichtstrahlen)
 * 100% ohne Mausinteraktion.
 */
const PrismaticBurstBackground = ({
  colors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981'],
  intensity = 1.5,
  speed = 0.4,
  distort = 5.0,
  noiseAmount = 0.2,
  rayCount = 12,
  lightMode = false
}) => {
  const canvasRef = useRef(null);
  const uniformsRef = useRef({
    colors,
    intensity,
    speed,
    distort,
    noiseAmount,
    rayCount,
    lightMode
  });

  useEffect(() => {
    uniformsRef.current = {
      colors,
      intensity,
      speed,
      distort,
      noiseAmount,
      rayCount,
      lightMode
    };
  }, [colors, intensity, speed, distort, noiseAmount, rayCount, lightMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
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
    const locIntensity = gl.getUniformLocation(program, 'uIntensity');
    const locDistort = gl.getUniformLocation(program, 'uDistort');
    const locNoise = gl.getUniformLocation(program, 'uNoiseAmount');
    const locRayCount = gl.getUniformLocation(program, 'uRayCount');
    const locLightMode = gl.getUniformLocation(program, 'uLightMode');
    const locColorCount = gl.getUniformLocation(program, 'uColorCount');
    const locGrad = gl.getUniformLocation(program, 'uGradient');

    // Erzeuge 1D Gradient-Textur
    const gradTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gradTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const updateGradientTexture = (cols) => {
      const width = 256;
      const data = new Uint8Array(width * 4);
      if (!cols || cols.length === 0) {
        cols = ['#ec4899', '#8b5cf6', '#06b6d4'];
      }
      const stops = cols.map(c => hexToRgb01(c));
      for (let i = 0; i < width; i++) {
        const t = i / (width - 1);
        const pos = t * (stops.length - 1);
        const idx = Math.min(Math.floor(pos), stops.length - 2);
        const frac = pos - idx;
        const c1 = stops[idx];
        const c2 = stops[idx + 1] || stops[idx];
        data[i * 4 + 0] = Math.round((c1[0] + (c2[0] - c1[0]) * frac) * 255);
        data[i * 4 + 1] = Math.round((c1[1] + (c2[1] - c1[1]) * frac) * 255);
        data[i * 4 + 2] = Math.round((c1[2] + (c2[2] - c1[2]) * frac) * 255);
        data[i * 4 + 3] = 255;
      }
      gl.bindTexture(gl.TEXTURE_2D, gradTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    };

    updateGradientTexture(colors);

    // Fullscreen Triangle
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
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
      gl.bindVertexArray(vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, gradTex);
      gl.uniform1i(locGrad, 0);

      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locTime, accumulatedTime);
      gl.uniform1f(locSpeed, u.speed);
      gl.uniform1f(locIntensity, u.intensity);
      gl.uniform1f(locDistort, u.distort);
      gl.uniform1f(locNoise, u.noiseAmount);
      gl.uniform1i(locRayCount, u.rayCount);
      gl.uniform1f(locLightMode, u.lightMode ? 1.0 : 0.0);
      gl.uniform1i(locColorCount, u.colors ? u.colors.length : 0);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(gradTex);
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

export default React.memo(PrismaticBurstBackground);
