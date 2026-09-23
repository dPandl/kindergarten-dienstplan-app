import React, { useEffect, useRef } from 'react';

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

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision mediump float;

uniform float iTime;
uniform vec2  iResolution;
uniform float iSpeed;
uniform vec3  iRayColor1;
uniform vec3  iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;
uniform bool  lightMode;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.30 + 0.20 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0) *
    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);

  if (lightMode) {
    vec3 lightBg = vec3(0.96, 0.96, 0.98);
    vec3 rayInk = mix(color.rgb, clamp(color.rgb * 0.85, 0.0, 1.0), 0.3);
    float rayWeight = clamp(max(color.r, max(color.g, color.b)) * iOpacity * 0.82, 0.0, 1.0);
    gl_FragColor = vec4(mix(lightBg, rayInk, rayWeight), 1.0);
  } else {
    vec3 darkBg = vec3(0.06, 0.07, 0.10);
    vec3 finalCol = darkBg + color.rgb * iOpacity;
    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
  }
}
`;

/**
 * SideRaysBackground
 * 100% native WebGL-Komponente für atmosphärische Lichtstrahlen von der Seite.
 * - Keine externen Bibliotheken ('ogl' oder 'three' nicht erforderlich)
 * - Automatisch auf 40 FPS gedrosselt
 * - Native Hardware-Skalierung für flüsterleise GPU-Auslastung
 * - Pausiert automatisch bei inaktivem Tab
 */
const SideRaysBackground = ({
  color1 = '#f59e0b',
  color2 = '#38bdf8',
  speed = 1.0,
  lightMode = false,
  origin = 'top-right',
  intensity = 1.8,
  spread = 2.0,
  tilt = 0,
  saturation = 1.4,
  blend = 0.65,
  falloff = 1.4,
  opacity = 1.0,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef(null);

  const uniformsRef = useRef({
    color1: hexToNormalizedRGB(color1),
    color2: hexToNormalizedRGB(color2),
    speed,
    lightMode,
    time: 0
  });

  useEffect(() => {
    uniformsRef.current.color1 = hexToNormalizedRGB(color1);
    uniformsRef.current.color2 = hexToNormalizedRGB(color2);
    uniformsRef.current.speed = speed;
    uniformsRef.current.lightMode = lightMode;
  }, [color1, color2, speed, lightMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power'
    }) || canvas.getContext('experimental-webgl');

    if (!gl) {
      console.warn('WebGL wird von diesem Browser nicht unterstützt. SideRays inaktiv.');
      return;
    }

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader-Fehler (SideRays):', gl.getShaderInfoLog(shader));
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
      console.error('Program Link-Fehler (SideRays):', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Uniform Locations
    const locTime = gl.getUniformLocation(program, 'iTime');
    const locResolution = gl.getUniformLocation(program, 'iResolution');
    const locSpeed = gl.getUniformLocation(program, 'iSpeed');
    const locColor1 = gl.getUniformLocation(program, 'iRayColor1');
    const locColor2 = gl.getUniformLocation(program, 'iRayColor2');
    const locIntensity = gl.getUniformLocation(program, 'iIntensity');
    const locSpread = gl.getUniformLocation(program, 'iSpread');
    const locFlipX = gl.getUniformLocation(program, 'iFlipX');
    const locFlipY = gl.getUniformLocation(program, 'iFlipY');
    const locTilt = gl.getUniformLocation(program, 'iTilt');
    const locSaturation = gl.getUniformLocation(program, 'iSaturation');
    const locBlend = gl.getUniformLocation(program, 'iBlend');
    const locFalloff = gl.getUniformLocation(program, 'iFalloff');
    const locOpacity = gl.getUniformLocation(program, 'iOpacity');
    const locLightMode = gl.getUniformLocation(program, 'lightMode');

    // Statische Uniforms
    let flipX = 0;
    let flipY = 0;
    if (origin === 'top-left') { flipX = 1; flipY = 0; }
    else if (origin === 'bottom-right') { flipX = 0; flipY = 1; }
    else if (origin === 'bottom-left') { flipX = 1; flipY = 1; }

    gl.uniform1f(locIntensity, intensity);
    gl.uniform1f(locSpread, spread);
    gl.uniform1f(locFlipX, flipX);
    gl.uniform1f(locFlipY, flipY);
    gl.uniform1f(locTilt, tilt);
    gl.uniform1f(locSaturation, saturation);
    gl.uniform1f(locBlend, blend);
    gl.uniform1f(locFalloff, falloff);
    gl.uniform1f(locOpacity, opacity);

    // Fullscreen Quad
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

    let animFrameId = null;
    let lastRenderTime = 0;
    let lastClockTime = performance.now();
    const targetInterval = 1000 / 40; // 40 FPS

    const resize = () => {
      const dpr = Math.max(0.65, Math.min(window.devicePixelRatio || 1, 1.25) * 0.75);
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
      gl.uniform1f(locSpeed, u.speed * 2.2);
      gl.uniform3f(locColor1, u.color1[0], u.color1[1], u.color1[2]);
      gl.uniform3f(locColor2, u.color2[0], u.color2[1], u.color2[2]);
      gl.uniform1i(locLightMode, u.lightMode ? 1 : 0);

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
  }, [origin, intensity, spread, tilt, saturation, blend, falloff, opacity]);

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

export default SideRaysBackground;
