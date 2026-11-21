/**
 * Soloberty Fullscreen Hero Shaders (WebGL1 / GLSL ES 1.00)
 *
 * Designed to be 100% mentor-walkthrough friendly: every block has a single
 * clear responsibility and uses the uv / time / mouse mental model.
 */

export const MAX_RIPPLES = 8;
export const MAX_TRAIL = 8;

export const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;

void main() {
  // a_position is a clip-space fullscreen quad from (-1, -1) to (1, 1)
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER_SOURCE = `
precision highp float;

// --- Block 1: Core Uniforms & Click-to-Ripple Buffer ---
uniform float u_time;        // Elapsed time in seconds
uniform vec2 u_resolution;   // Physical canvas size in pixels (capped at DPR <= 2)
uniform vec2 u_mouse;        // Smoothly lerped normalized cursor position (0.0 to 1.0)

// Ring buffer of click-triggered ripple waves:
// xy = aspect-corrected click position, z = click timestamp (seconds), w = active flag (1.0)
const int MAX_RIPPLES = 8;
uniform vec4 u_ripples[MAX_RIPPLES];

// Short chained-lerp trail (aspect-corrected xy) to stretch hoverGlow into a smooth tail
const int MAX_TRAIL = 8;
uniform vec2 u_trail[MAX_TRAIL];

// Simple deterministic 2D hash for the final film-grain pass
float hash21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

void main() {
  // --- Block 2: Normalized & Aspect-Corrected UV Coordinates ---
  // uv goes from (0,0) bottom-left to (1,1) top-right
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  // p and mousePos use aspect-corrected X so glow and click ripples are perfectly circular
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 mousePos = vec2(u_mouse.x * aspect, u_mouse.y);

  // --- Block 3: Lerped Hover Warp & Click-to-Ripple Waves ---
  // 3A. Gentle hover magnetic pull toward the smoothly lerped cursor + short glowing tail
  vec2 toMouse = p - mousePos;
  float mouseDist = length(toMouse);
  vec2 mouseDir = mouseDist > 0.0001 ? toMouse / mouseDist : vec2(0.0);
  vec2 hoverWarp = -mouseDir * exp(-mouseDist * 2.6) * 0.045;

  // Shape hoverGlow as a short tapering tail along the chained-lerp cursor trail
  float hoverGlow = 0.0;
  for (int i = 0; i < MAX_TRAIL; i++) {
    float frac = float(i) / float(MAX_TRAIL - 1); // 0.0 at head -> 1.0 at tail tip
    float d = length(p - u_trail[i]);
    float radiusFalloff = mix(3.2, 10.5, frac);   // Wider at head, narrower at tip
    float weight = pow(1.0 - frac, 1.5);          // Brighter at head, fades toward tip
    hoverGlow = max(hoverGlow, exp(-d * radiusFalloff) * weight * 0.34);
  }

  // 3B. Expanding water ripple rings spawned only on click
  vec2 clickDisplacement = vec2(0.0);
  float clickCaustic = 0.0;

  const float WAVE_SPEED = 0.28;
  const float WAVE_FREQ = 34.0;
  const float MAX_AGE = 2.4;

  for (int i = 0; i < MAX_RIPPLES; i++) {
    vec4 r = u_ripples[i];
    if (r.w > 0.5) {
      float age = u_time - r.z;
      if (age >= 0.0 && age < MAX_AGE) {
        vec2 toClick = p - r.xy;
        float dist = length(toClick);
        vec2 dir = dist > 0.0001 ? toClick / dist : vec2(0.0);

        // Expanding ring radius and localized Gaussian wave shell
        float radius = age * WAVE_SPEED;
        float delta = dist - radius;
        float shell = exp(-delta * delta * 200.0);

        // Smooth fade-in at click and natural decay as the ring expands outward
        float lifeFade = smoothstep(0.0, 0.06, age) * pow(1.0 - age / MAX_AGE, 1.5);
        float env = shell * lifeFade;

        // Crisp concentric wave inside the expanding shell
        float wave = sin(delta * WAVE_FREQ);
        clickDisplacement += dir * (wave * env);
        clickCaustic += smoothstep(0.1, 1.0, wave) * env;
      }
    }
  }

  // Combine gentle hover warp + expanding click ripple refraction
  vec2 warpedUv = uv + hoverWarp + clamp(clickDisplacement, vec2(-1.0), vec2(1.0)) * 0.042;
  float rippleCrest = clamp(clickCaustic * 0.85, 0.0, 1.0);

  // --- Block 4: Layered Aurora / Frequency Flow Field ---
  // Combine two domain-warped sine ribbons that drift smoothly over u_time
  float t = u_time * 0.35;
  float wave1 = sin(warpedUv.x * 3.8 + t + cos(warpedUv.y * 3.2 - t * 0.8));
  float wave2 = cos(warpedUv.y * 4.5 - t * 0.7 + sin(warpedUv.x * 4.2 + t * 1.1));
  float auroraRibbon = smoothstep(-0.8, 0.9, (wave1 + wave2) * 0.5);

  // Secondary high-frequency harmonic band for depth
  float harmonic = 0.5 + 0.5 * sin((warpedUv.x * 2.5 - warpedUv.y * 3.0) * 2.2 + u_time * 0.5 + length(clickDisplacement) * 2.0);

  // --- Block 5: Soloberty Brand Palette Mixing, Hover Glow & Ripple Caustics ---
  // Colors match Soloberty's design system: Deep Midnight -> Cerulean Blue -> Ice Cyan -> Warm Amber accent
  vec3 colMidnight = vec3(0.035, 0.051, 0.086); // #090D16 (Dark background base)
  vec3 colDeepBlue = vec3(0.000, 0.280, 0.460); // #004775 (Deep ocean midtone)
  vec3 colCerulean = vec3(0.000, 0.478, 0.733); // #007ABB (Primary Soloberty brand blue)
  vec3 colIceCyan  = vec3(0.722, 0.906, 1.000); // #B8E7FF (Soloberty dark-mode highlight cyan)
  vec3 colAmber    = vec3(0.800, 0.333, 0.000); // #CC5500 (Warm sunset accent)

  // Base gradient from midnight to deep cerulean driven by the aurora ribbon
  vec3 color = mix(colMidnight, colDeepBlue, auroraRibbon);
  color = mix(color, colCerulean, smoothstep(0.25, 0.85, auroraRibbon * harmonic));

  // Subtle warm amber undertone near the lower-right flow crest
  float warmMask = smoothstep(0.55, 1.0, wave1 * 0.5 + 0.5) * (1.0 - uv.y) * 0.22;
  color = mix(color, colAmber, warmMask);

  // Soft cerulean-cyan aura following the lerped cursor + bright caustic crests on click ripples
  color += colCerulean * hoverGlow * 0.65;
  color = mix(color, colIceCyan, rippleCrest * 0.7);

  // --- Block 6: Readability Contrast Pocket, Vignette & Film Grain ---
  // Darken the center slightly and vignette the edges so white hero typography on top stays high-contrast
  vec2 centered = uv - 0.5;
  float centerPocket = 1.0 - exp(-dot(centered, centered) * 7.5) * 0.28;
  float edgeVignette = 1.0 - dot(centered, centered) * 0.55;
  color *= centerPocket * clamp(edgeVignette, 0.4, 1.0);

  // Subtle animated film grain to prevent 8-bit gradient banding
  float grain = (hash21(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5) * 0.028;
  color += grain;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export const REDUCED_MOTION_ONE_LINER =
  'Caps WebGL canvas resolution at devicePixelRatio <= 2, pauses the requestAnimationFrame loop via Page Visibility API and IntersectionObserver when hidden or offscreen, and bypasses the WebGL loop under prefers-reduced-motion in favor of a zero-GPU static CSS aurora gradient in the exact same Soloberty palette.';
