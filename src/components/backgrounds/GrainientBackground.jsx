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

const VERTEX_SRC = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uLightMode;

out vec4 fragColor;

#define S(a,b,t) smoothstep(a,b,t)

mat2 Rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(2127.1, 81.17)), dot(p, vec2(1269.5, 283.37)));
  return fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
  return 0.5 + 0.5 * n;
}

void main() {
  float t = iTime * uTimeSpeed;
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float ratio = iResolution.x / max(iResolution.y, 1.0);
  vec2 tuv = uv - 0.5 + uCenterOffset;
  tuv /= max(uZoom, 0.001);

  float degree = noise(vec2(t * 0.35, tuv.x * tuv.y) * uNoiseScale);
  tuv.y *= 1.0 / ratio;
  tuv *= Rot(radians((degree - 0.5) * uRotationAmount + 180.0));
  tuv.y *= ratio;

  float frequency = uWarpFrequency;
  float ws = max(uWarpStrength, 0.001);
  float amplitude = uWarpAmplitude / ws;
  float warpTime = t * 1.8;
  tuv.x += sin(tuv.y * frequency + warpTime) / amplitude;
  tuv.y += sin(tuv.x * (frequency * 1.5) + warpTime) / (amplitude * 0.5);

  vec3 colLav = uColor1;
  vec3 colOrg = uColor2;
  vec3 colDark = uColor3;
  float b = uColorBalance;
  float s = max(uBlendSoftness, 0.0);
  mat2 blendRot = Rot(radians(uBlendAngle));
  float blendX = (tuv * blendRot).x;
  float edge0 = -0.3 - b - s;
  float edge1 = 0.2 - b + s;
  float v0 = 0.5 - b + s;
  float v1 = -0.3 - b - s;
  vec3 layer1 = mix(colDark, colOrg, S(edge0, edge1, blendX));
  vec3 layer2 = mix(colOrg, colLav, S(edge0, edge1, blendX));
  vec3 col = mix(layer1, layer2, S(v0, v1, tuv.y));

  vec2 grainUv = uv * max(uGrainScale, 0.001);
  if (uGrainAnimated > 0.5) {
    grainUv += vec2(iTime * 0.05);
  }
  float grain = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * uGrainAmount;

  col = (col - 0.5) * uContrast + 0.5;
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);
  col = pow(max(col, 0.0), vec3(1.0 / max(uGamma, 0.001)));
  col = clamp(col, 0.0, 1.0);

  if (uLightMode > 0.5) {
    float energy = max(max(col.r, col.g), col.b);
    vec3 hue = col / max(energy, 0.001);
    float chroma = length(col - vec3(dot(col, vec3(0.333333))));
    float coverage = clamp(0.12 + chroma * 1.15 + energy * 0.18, 0.0, 0.88);
    col = mix(vec3(0.96, 0.97, 0.98), clamp(hue * 0.58 + col * 0.18, 0.0, 1.0), coverage);
  }

  fragColor = vec4(col, 1.0);
}
`;

/**
 * GrainientBackground
 * ReactBits Grainient (Körniger, organischer Gradient)
 * 100% ohne Mausinteraktion.
 */
const GrainientBackground = ({
  color1 = '#FF9FFC',
  color2 = '#5227FF',
  color3 = '#1a0b36',
  speed = 0.25,
  grainAmount = 0.08,
  zoom = 0.9,
  lightMode = false
}) => {
  const canvasRef = useRef(null);
  const uniformsRef = useRef({
    color1,
    color2,
    color3,
    speed,
    grainAmount,
    zoom,
    lightMode
  });

  useEffect(() => {
    uniformsRef.current = {
      color1,
      color2,
      color3,
      speed,
      grainAmount,
      zoom,
      lightMode
    };
  }, [color1, color2, color3, speed, grainAmount, zoom, lightMode]);

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

    // Uniform Locations
    const locRes = gl.getUniformLocation(program, 'iResolution');
    const locTime = gl.getUniformLocation(program, 'iTime');
    const locSpeed = gl.getUniformLocation(program, 'uTimeSpeed');
    const locColorBalance = gl.getUniformLocation(program, 'uColorBalance');
    const locWarpStrength = gl.getUniformLocation(program, 'uWarpStrength');
    const locWarpFreq = gl.getUniformLocation(program, 'uWarpFrequency');
    const locWarpSpeed = gl.getUniformLocation(program, 'uWarpSpeed');
    const locWarpAmp = gl.getUniformLocation(program, 'uWarpAmplitude');
    const locBlendAngle = gl.getUniformLocation(program, 'uBlendAngle');
    const locBlendSoft = gl.getUniformLocation(program, 'uBlendSoftness');
    const locRotAmount = gl.getUniformLocation(program, 'uRotationAmount');
    const locNoiseScale = gl.getUniformLocation(program, 'uNoiseScale');
    const locGrainAmount = gl.getUniformLocation(program, 'uGrainAmount');
    const locGrainScale = gl.getUniformLocation(program, 'uGrainScale');
    const locGrainAnim = gl.getUniformLocation(program, 'uGrainAnimated');
    const locContrast = gl.getUniformLocation(program, 'uContrast');
    const locGamma = gl.getUniformLocation(program, 'uGamma');
    const locSaturation = gl.getUniformLocation(program, 'uSaturation');
    const locCenterOffset = gl.getUniformLocation(program, 'uCenterOffset');
    const locZoom = gl.getUniformLocation(program, 'uZoom');
    const locColor1 = gl.getUniformLocation(program, 'uColor1');
    const locColor2 = gl.getUniformLocation(program, 'uColor2');
    const locColor3 = gl.getUniformLocation(program, 'uColor3');
    const locLightMode = gl.getUniformLocation(program, 'uLightMode');

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

      const elapsed = now - lastTime;
      if (elapsed < targetInterval) return;

      const delta = Math.min(elapsed / 1000, 0.1);
      lastTime = now;
      accumulatedTime += delta;

      resize();

      const u = uniformsRef.current;
      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locTime, accumulatedTime);
      gl.uniform1f(locSpeed, u.speed);
      gl.uniform1f(locColorBalance, 0.0);
      gl.uniform1f(locWarpStrength, 1.0);
      gl.uniform1f(locWarpFreq, 5.0);
      gl.uniform1f(locWarpSpeed, 2.0);
      gl.uniform1f(locWarpAmp, 50.0);
      gl.uniform1f(locBlendAngle, 0.0);
      gl.uniform1f(locBlendSoft, 0.05);
      gl.uniform1f(locRotAmount, 500.0);
      gl.uniform1f(locNoiseScale, 2.0);
      gl.uniform1f(locGrainAmount, u.grainAmount);
      gl.uniform1f(locGrainScale, 2.0);
      gl.uniform1f(locGrainAnim, 0.0);
      gl.uniform1f(locContrast, 1.4);
      gl.uniform1f(locGamma, 1.0);
      gl.uniform1f(locSaturation, 1.05);
      gl.uniform2f(locCenterOffset, 0.0, 0.0);
      gl.uniform1f(locZoom, u.zoom);
      gl.uniform3fv(locColor1, new Float32Array(hexToRGB(u.color1)));
      gl.uniform3fv(locColor2, new Float32Array(hexToRGB(u.color2)));
      gl.uniform3fv(locColor3, new Float32Array(hexToRGB(u.color3)));
      gl.uniform1f(locLightMode, u.lightMode ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
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

export default React.memo(GrainientBackground);
