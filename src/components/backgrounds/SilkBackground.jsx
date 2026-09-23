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

const VERTEX_SHADER_SRC = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;
uniform float uLightMode;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  float grain = rnd / 15.0 * uNoiseIntensity;
  vec3 result = uColor * pattern - vec3(grain);

  if (uLightMode > 0.5) {
    float fold = smoothstep(0.28, 0.9, pattern);
    float specular = smoothstep(0.72, 0.98, pattern);
    vec3 shadowColor = uColor * 0.72;
    vec3 bodyColor = min(uColor * 1.18, vec3(1.0));
    vec3 lightBase = mix(shadowColor, bodyColor, fold);
    lightBase = mix(lightBase, vec3(1.0), specular * 0.92);
    float fineNoise = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
    float grainSignal = (rnd + fineNoise - 1.0);
    float grainStrength = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
    result = lightBase + grainSignal * grainStrength;
  }

  gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}
`;

/**
 * SilkBackground
 * Native WebGL-Komponente für fließende Seideneffekte.
 * Inspiriert von ReactBits Silk, jedoch 100% autark ohne externe Bibliotheken.
 */
const SilkBackground = ({
  color = '#7B7481',
  speed = 1.0,
  scale = 1.0,
  noiseIntensity = 1.2,
  rotation = 0.0,
  lightMode = false,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef(null);

  // Halte aktuelle Uniform-Werte in Refs für die Render-Schleife bereit
  const uniformsRef = useRef({
    color: hexToNormalizedRGB(color),
    speed,
    scale,
    noiseIntensity,
    rotation,
    lightMode: lightMode ? 1.0 : 0.0,
    time: 0
  });

  // Aktualisiere Uniforms bei Prop-Änderungen ohne den WebGL-Kontext neu zu initialisieren
  useEffect(() => {
    uniformsRef.current.color = hexToNormalizedRGB(color);
    uniformsRef.current.speed = speed;
    uniformsRef.current.scale = scale;
    uniformsRef.current.noiseIntensity = noiseIntensity;
    uniformsRef.current.rotation = rotation;
    uniformsRef.current.lightMode = lightMode ? 1.0 : 0.0;
  }, [color, speed, scale, noiseIntensity, rotation, lightMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance'
    }) || canvas.getContext('experimental-webgl');

    if (!gl) {
      console.warn('WebGL wird von diesem Browser nicht unterstützt. Seiden-Hintergrund inaktiv.');
      return;
    }

    // Shader kompilieren Hilfsfunktion
    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader-Fehler:', gl.getShaderInfoLog(shader));
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
      console.error('Program Link-Fehler:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Uniform Locations
    const locTime = gl.getUniformLocation(program, 'uTime');
    const locColor = gl.getUniformLocation(program, 'uColor');
    const locSpeed = gl.getUniformLocation(program, 'uSpeed');
    const locScale = gl.getUniformLocation(program, 'uScale');
    const locRotation = gl.getUniformLocation(program, 'uRotation');
    const locNoiseIntensity = gl.getUniformLocation(program, 'uNoiseIntensity');
    const locLightMode = gl.getUniformLocation(program, 'uLightMode');

    // Quad Geometrie (2 Dreiecke als Strip)
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

    // Resize Handler
    let animFrameId = null;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = Math.floor(canvas.clientWidth * dpr);
      const displayHeight = Math.floor(canvas.clientHeight * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    // Render-Schleife
    const render = (now) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      resize();

      // Zeit fortschreiben
      uniformsRef.current.time += delta * 0.1;

      const u = uniformsRef.current;
      gl.useProgram(program);

      gl.uniform1f(locTime, u.time);
      gl.uniform3f(locColor, u.color[0], u.color[1], u.color[2]);
      gl.uniform1f(locSpeed, u.speed);
      gl.uniform1f(locScale, u.scale);
      gl.uniform1f(locRotation, u.rotation);
      gl.uniform1f(locNoiseIntensity, u.noiseIntensity);
      gl.uniform1f(locLightMode, u.lightMode);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animFrameId = requestAnimationFrame(render);
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

export default SilkBackground;
