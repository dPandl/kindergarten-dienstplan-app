import React, { useEffect, useRef } from 'react';

function hexToVec4(hex) {
  let hexStr = (hex || '#000000').replace('#', '').trim();
  if (hexStr.length === 3) {
    hexStr = hexStr.split('').map((c) => c + c).join('');
  }
  let r = 0, g = 0, b = 0, a = 1.0;
  if (hexStr.length >= 6) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
  }
  return [r, g, b, a];
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

#define PI 3.14159265359

uniform float iTime;
uniform vec3  iResolution;
uniform float uSpinRotation;
uniform float uSpinSpeed;
uniform vec2  uOffset;
uniform vec4  uColor1;
uniform vec4  uColor2;
uniform vec4  uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSpinAmount;
uniform float uPixelFilter;
uniform float uSpinEase;
uniform float uLightMode;

varying vec2 vUv;

vec4 effect(vec2 screenSize, vec2 screen_coords) {
  float pixel_size = length(screenSize.xy) / max(uPixelFilter, 1.0);
  vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize.xy) / max(length(screenSize.xy), 1.0) - uOffset;
  float uv_len = length(uv);
  
  // Ruhige, hypnotische Hintergrund-Drehung
  float speed = iTime * (uSpinRotation * 0.03) + 302.2;
  
  // Reiner autonomer Zeittakt ohne Mausinteraktion
  float new_pixel_angle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uv_len + (1.0 - uSpinAmount));
  vec2 mid = (screenSize.xy / max(length(screenSize.xy), 1.0)) * 0.5;
  uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);
  
  uv *= 30.0;
  // Sanfte Wirbel-Geschwindigkeit
  speed = iTime * (uSpinSpeed * 0.3);
  
  vec2 uv2 = vec2(uv.x + uv.y);
  
  for (int i = 0; i < 5; i++) {
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv += 0.5 * vec2(
      cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
      sin(uv2.x - 0.113 * speed)
    );
    uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
  }
  
  float contrast_mod = (0.25 * uContrast + 0.5 * uSpinAmount + 1.2);
  float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
  float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
  float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
  float c3p = 1.0 - min(1.0, c1p + c2p);
  float light = (uLighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + uLighting * max(c2p * 5.0 - 4.0, 0.0);
  
  vec4 result = (0.3 / uContrast) * uColor1 + (1.0 - 0.3 / uContrast) * (uColor1 * c1p + uColor2 * c2p + vec4(c3p * uColor3.rgb, c3p * uColor1.a)) + light;

  if (uLightMode > 0.5) {
    // Sanfte Aufhellung für helle Themes
    vec3 brightBase = vec3(0.95, 0.96, 0.97);
    result.rgb = mix(brightBase, result.rgb, 0.65);
  }

  return result;
}

void main() {
  gl_FragColor = effect(iResolution.xy, gl_FragCoord.xy);
}
`;

/**
 * BalatroBackground
 * ReactBits Balatro (Hypnotischer Spiral-Wirbel)
 * 100% ohne Mausinteraktion.
 */
const BalatroBackground = ({
  color1 = '#de3333',
  color2 = '#0055ff',
  color3 = '#111827',
  speed = 1.0,
  spinRotation = -2.0,
  spinSpeed = 5.0,
  contrast = 3.0,
  lighting = 0.4,
  spinAmount = 0.25,
  pixelFilter = 1400.0,
  spinEase = 1.0,
  lightMode = false
}) => {
  const canvasRef = useRef(null);
  const uniformsRef = useRef({
    color1,
    color2,
    color3,
    speed,
    spinRotation,
    spinSpeed,
    contrast,
    lighting,
    spinAmount,
    pixelFilter,
    spinEase,
    lightMode
  });

  useEffect(() => {
    uniformsRef.current = {
      color1,
      color2,
      color3,
      speed,
      spinRotation,
      spinSpeed,
      contrast,
      lighting,
      spinAmount,
      pixelFilter,
      spinEase,
      lightMode
    };
  }, [color1, color2, color3, speed, spinRotation, spinSpeed, contrast, lighting, spinAmount, pixelFilter, spinEase, lightMode]);

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

    const locTime = gl.getUniformLocation(program, 'iTime');
    const locRes = gl.getUniformLocation(program, 'iResolution');
    const locSpinRotation = gl.getUniformLocation(program, 'uSpinRotation');
    const locSpinSpeed = gl.getUniformLocation(program, 'uSpinSpeed');
    const locOffset = gl.getUniformLocation(program, 'uOffset');
    const locColor1 = gl.getUniformLocation(program, 'uColor1');
    const locColor2 = gl.getUniformLocation(program, 'uColor2');
    const locColor3 = gl.getUniformLocation(program, 'uColor3');
    const locContrast = gl.getUniformLocation(program, 'uContrast');
    const locLighting = gl.getUniformLocation(program, 'uLighting');
    const locSpinAmount = gl.getUniformLocation(program, 'uSpinAmount');
    const locPixelFilter = gl.getUniformLocation(program, 'uPixelFilter');
    const locSpinEase = gl.getUniformLocation(program, 'uSpinEase');
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
      const u = uniformsRef.current;
      accumulatedTime += delta * (u && u.speed !== undefined ? u.speed : 1.0);

      resize();

      gl.useProgram(program);

      gl.uniform1f(locTime, accumulatedTime);
      gl.uniform3f(locRes, canvas.width, canvas.height, canvas.width / Math.max(canvas.height, 1));
      gl.uniform1f(locSpinRotation, u.spinRotation);
      gl.uniform1f(locSpinSpeed, u.spinSpeed);
      gl.uniform2f(locOffset, 0.0, 0.0);
      gl.uniform4fv(locColor1, new Float32Array(hexToVec4(u.color1)));
      gl.uniform4fv(locColor2, new Float32Array(hexToVec4(u.color2)));
      gl.uniform4fv(locColor3, new Float32Array(hexToVec4(u.color3)));
      gl.uniform1f(locContrast, u.contrast);
      gl.uniform1f(locLighting, u.lighting);
      gl.uniform1f(locSpinAmount, u.spinAmount);
      gl.uniform1f(locPixelFilter, u.pixelFilter);
      gl.uniform1f(locSpinEase, u.spinEase);
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

export default React.memo(BalatroBackground);
