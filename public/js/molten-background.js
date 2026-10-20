(() => {
  const ROOT = "molten-background";
  const MAX_COLORS = 6;
  const TRAIL = 16;
  const MAX_FLARES = 8;
  const SAMPLE_SECONDS = 0.06;
  const TRAIL_SECONDS = 0.9;
  const FLARE_SECONDS = 1.8;
  const INTRO_SECONDS = 2.4;
  const FLOW_START = 0.4;
  const colors = ["#071a2b", "#092b52", "#0b4a7d", "#4c8dff"];
  const settings = {
    speed: 1.3,
    scale: 4,
    detail: 3,
    glow: 1.6,
    thickness: 1,
    swirl: 1,
    fold: -0.2,
    blackPoint: 0.05,
    brightness: 1.3,
    balance: 0.5,
    grain: 0.05,
    opacity: 1,
    offset: [0, 0],
    rotation: 0,
    drift: 0.3,
    mouseInteraction: true,
    mouseStrength: 0.5,
    flareOnClick: true,
  };

  const vertexSource = `#version 300 es
    in vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`;
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uClock;
    uniform float uScale;
    uniform float uDetail;
    uniform float uGlow;
    uniform float uThickness;
    uniform float uSwirl;
    uniform float uFold;
    uniform float uBlackPoint;
    uniform float uBrightness;
    uniform float uBalance;
    uniform float uGrain;
    uniform float uOpacity;
    uniform vec2 uOffset;
    uniform vec2 uRotation;
    uniform vec2 uDrift;
    uniform vec3 uColors[${MAX_COLORS}];
    uniform int uColorCount;
    uniform vec3 uBackground;
    uniform float uOpaque;
    uniform float uLight;
    uniform vec3 uReveal;
    uniform vec4 uTrail[${TRAIL}];
    uniform float uTrailWeight[${TRAIL}];
    uniform int uTrailCount;
    uniform vec4 uFlares[${MAX_FLARES}];
    uniform int uFlareCount;
    uniform vec4 uHeat;
    out vec4 outColor;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec3 palette(float g) {
      if (uColorCount <= 1) return uColors[0];
      float t = g < uBalance ? 0.5 * g / uBalance : 0.5 + 0.5 * (g - uBalance) / (1.0 - uBalance);
      float scaled = t * float(uColorCount - 1);
      int index = int(min(floor(scaled), float(uColorCount - 2)));
      return mix(uColors[index], uColors[index + 1], smoothstep(0.0, 1.0, scaled - float(index)));
    }

    float warmth(float age, float weight, vec2 offset) {
      float life = clamp(age / ${TRAIL_SECONDS.toFixed(2)}, 0.0, 1.0);
      vec2 spread = offset / (uHeat.z * (1.0 + 0.8 * life));
      return weight * (1.0 - life) * (1.0 - life) * exp(-dot(spread, spread));
    }

    float trailHeat(vec2 q) {
      float heat = 0.0;
      for (int k = 0; k < ${TRAIL}; k++) {
        if (k >= uTrailCount) break;
        vec4 a = uTrail[k];
        float weight = uTrailWeight[k];
        heat = max(heat, warmth(a.z, weight, q - a.xy));
        int next = min(k + 1, ${TRAIL - 1});
        if (next == k || next >= uTrailCount) continue;
        vec4 b = uTrail[next];
        float older = uTrailWeight[next];
        vec2 ab = b.xy - a.xy;
        float span = dot(ab, ab);
        float t = span > 1e-10 ? clamp(dot(q - a.xy, ab) / span, 0.0, 1.0) : 0.0;
        float even = smoothstep(0.0, uHeat.z, sqrt(span));
        float age = mix(min(a.w, b.z), mix(a.w, b.z, t), even);
        float strength = mix(max(weight, older), mix(weight, older, t), even);
        heat = max(heat, warmth(age, strength, q - a.xy - ab * t));
      }
      return heat;
    }

    float flareHeat(vec2 q) {
      float heat = 0.0;
      for (int k = 0; k < ${MAX_FLARES}; k++) {
        if (k >= uFlareCount) break;
        vec4 f = uFlares[k];
        float life = clamp(f.z / ${FLARE_SECONDS.toFixed(2)}, 0.0, 1.0);
        float rise = 1.0 - exp(-f.z / 0.07);
        float fall = exp(-3.0 * life) * (1.0 - life) * (1.0 - life);
        vec2 offset = (q - f.xy) / (uHeat.z * (0.9 + 1.6 * sqrt(life)));
        heat += rise * fall * exp(-dot(offset, offset));
      }
      return heat;
    }

    void main() {
      float time = uTime;
      vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
      vec2 q = uv - uOffset;
      vec2 view = vec2(q.x * uRotation.x - q.y * uRotation.y, q.x * uRotation.y + q.y * uRotation.x);
      vec2 p = uScale * view - 0.5;
      p += uDrift;

      float heat = 0.0;
      float flare = 0.0;
      if (uHeat.w > 0.5) {
        heat = trailHeat(uv) * uHeat.x;
        flare = flareHeat(uv) * uHeat.y;
      }
      float power = uThickness * (1.0 + (heat + flare) * 0.45);

      vec2 i = p;
      float c = 0.0;
      float blurred = 0.0;
      float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
      float d = length(p);
      float rot = d + time + p.x * uSwirl;
      float cosRot = cos(rot);
      mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;
      float layers = ceil(uDetail);

      for (float n = 0.0; n < 8.0; n++) {
        if (n >= layers) break;
        p *= warp;
        float t = r - time / (n + 3.0);
        i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
        float l = length(vec2(sin(i.x + t), cos(i.y + t)));
        float footprint = 0.5 * length(vec2(dFdx(l), dFdy(l)));
        l = sqrt(l * l + footprint * footprint);
        float weight = clamp(uDetail - n, 0.0, 1.0);
        c += weight * uGlow / (power == 1.0 ? l : pow(max(l, 1e-6), power));
        if (uReveal.y > 0.5) blurred += weight * uGlow / sqrt(l * l + 0.0025);
      }

      c /= 6.0;
      c *= 1.0 + heat * 0.25 + flare * 0.6;

      float reveal = 1.0;
      float front = 0.0;
      if (uReveal.y > 0.5) {
        float level = log(max(blurred / 6.0, 1e-5)) - uReveal.x;
        reveal = smoothstep(-1.0, 1.0, level) * smoothstep(0.0, 0.08, uReveal.z);
        front = 0.2 * exp(-level * level * 1.5) * smoothstep(-2.6, -0.6, uReveal.x);
      }

      float g = clamp(max(c - uBlackPoint, 0.0) * uBrightness + front, 0.0, 1.0);
      vec3 col = palette(g);
      float noise = hash(gl_FragCoord.xy + fract(uClock) * 97.0) - 0.5;
      float a;
      if (uLight < 0.5) {
        a = g + noise * uGrain;
      } else {
        float lift = max(g - 0.03, 0.0) / 0.97;
        a = (1.0 - exp(-6.0 * lift)) / (1.0 - exp(-6.0)) + noise * uGrain * g;
      }
      a = clamp(a + noise / 255.0, 0.0, 1.0) * reveal * uOpacity;

      if (uOpaque > 0.5) {
        outColor = vec4(mix(uBackground, col, a), 1.0);
      } else {
        outColor = vec4(col * a, a);
      }
    }`;

  const host = document.createElement("div");
  host.className = ROOT;
  host.setAttribute("aria-hidden", "true");
  document.body.prepend(host);

  const canvas = document.createElement("canvas");
  canvas.className = "molten-background-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  if (!gl) {
    console.error("The MoltenMetal background requires WebGL 2.");
    host.remove();
    return;
  }

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("MoltenMetal shader compilation failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    console.error("MoltenMetal background could not initialize its shaders.");
    host.remove();
    return;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("MoltenMetal shader linking failed:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    host.remove();
    return;
  }

  const uniformNames = [
    "uResolution", "uTime", "uClock", "uScale", "uDetail", "uGlow", "uThickness",
    "uSwirl", "uFold", "uBlackPoint", "uBrightness", "uBalance", "uGrain",
    "uOpacity", "uOffset", "uRotation", "uDrift", "uColors", "uColorCount",
    "uBackground", "uOpaque", "uLight", "uReveal", "uTrail", "uTrailWeight",
    "uTrailCount", "uFlares", "uFlareCount", "uHeat",
  ];
  const uniforms = Object.fromEntries(uniformNames.map((name) => [name, gl.getUniformLocation(program, name)]));
  const vertexArray = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vertexArray || !buffer) {
    console.error("MoltenMetal background could not create its graphics buffers.");
    gl.deleteProgram(program);
    host.remove();
    return;
  }
  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);

  const colorProbe = document.createElement("canvas").getContext("2d");
  const palette = colors.map((color) => {
    colorProbe.fillStyle = color;
    const value = colorProbe.fillStyle;
    const hex = Number.parseInt(value.slice(1), 16);
    return [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];
  });
  const colorData = new Float32Array(MAX_COLORS * 3);
  palette.forEach((color, index) => colorData.set(color, index * 3));
  const trailData = new Float32Array(TRAIL * 4);
  const trailWeights = new Float32Array(TRAIL);
  const flareData = new Float32Array(MAX_FLARES * 4);
  const state = {
    width: 1,
    height: 1,
    time: FLOW_START,
    clock: 0,
    last: 0,
    frame: 0,
    visible: false,
    introAt: -1,
    pointer: [0.5, 0.5],
    inside: false,
    presence: 0,
    drift: [0, 0],
    trail: [],
    flares: [],
  };
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(host.clientWidth * ratio));
    const height = Math.max(1, Math.round(host.clientHeight * ratio));
    if (width === state.width && height === state.height) return;
    state.width = width;
    state.height = height;
    canvas.width = width;
    canvas.height = height;
  };

  const toView = ([x, y]) => [
    (x - 0.5) * (state.width / Math.max(state.height, 1)),
    0.5 - y,
  ];
  const introProgress = (reduced) => {
    if (reduced || state.introAt < 0) return 1;
    return clamp((state.clock - state.introAt) / INTRO_SECONDS, 0, 1);
  };

  const render = (reduced) => {
    const progress = introProgress(reduced);
    const aspect = state.width / Math.max(state.height, 1);
    gl.viewport(0, 0, state.width, state.height);
    gl.uniform2f(uniforms.uResolution, state.width, state.height);
    gl.uniform1f(uniforms.uTime, state.time);
    gl.uniform1f(uniforms.uClock, state.clock);
    gl.uniform1f(uniforms.uScale, settings.scale);
    gl.uniform1f(uniforms.uDetail, settings.detail);
    gl.uniform1f(uniforms.uGlow, settings.glow * 0.1);
    gl.uniform1f(uniforms.uThickness, settings.thickness);
    gl.uniform1f(uniforms.uSwirl, settings.swirl);
    gl.uniform1f(uniforms.uFold, settings.fold);
    gl.uniform1f(uniforms.uBlackPoint, settings.blackPoint);
    gl.uniform1f(uniforms.uBrightness, settings.brightness);
    gl.uniform1f(uniforms.uBalance, settings.balance);
    gl.uniform1f(uniforms.uGrain, settings.grain);
    gl.uniform1f(uniforms.uOpacity, settings.opacity);
    gl.uniform2f(uniforms.uOffset, settings.offset[0] * aspect, -settings.offset[1]);
    gl.uniform2f(uniforms.uRotation, Math.cos(settings.rotation), Math.sin(settings.rotation));
    const motionScale = reduced ? 0.45 : 1;
    const ambientX = Math.sin(state.clock * 0.42) * 0.55 * motionScale;
    const ambientY = Math.cos(state.clock * 0.31) * 0.36 * motionScale;
    gl.uniform2f(uniforms.uDrift, state.drift[0] + ambientX, state.drift[1] + ambientY);
    gl.uniform3fv(uniforms.uColors, colorData);
    gl.uniform1i(uniforms.uColorCount, palette.length);
    gl.uniform3f(uniforms.uBackground, 0, 0, 0);
    gl.uniform1f(uniforms.uOpaque, 0);
    gl.uniform1f(uniforms.uLight, 0);
    gl.uniform3f(
      uniforms.uReveal,
      Math.log(1.6) + Math.log(0.01 / 1.6) * progress,
      progress < 1 ? 1 : 0,
      progress,
    );
    trailData.fill(0);
    trailWeights.fill(0);
    state.trail.forEach((point, index) => {
      const [x, y] = toView(point.at);
      trailData.set([x, y, state.clock - point.time, state.clock - point.arrive], index * 4);
      trailWeights[index] = point.weight;
    });
    gl.uniform4fv(uniforms.uTrail, trailData);
    gl.uniform1fv(uniforms.uTrailWeight, trailWeights);
    gl.uniform1i(uniforms.uTrailCount, state.trail.length);
    flareData.fill(0);
    state.flares.forEach((flare, index) => {
      const [x, y] = toView(flare.at);
      flareData.set([x, y, state.clock - flare.time, 1], index * 4);
    });
    gl.uniform4fv(uniforms.uFlares, flareData);
    gl.uniform1i(uniforms.uFlareCount, state.flares.length);
    const heating = state.trail.length > 0 || state.flares.length > 0;
    gl.uniform4f(uniforms.uHeat, settings.mouseStrength * 2, 3.2, 0.2, heating ? 1 : 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const updateTrail = (delta) => {
    const wanted = settings.mouseInteraction && state.inside && settings.mouseStrength > 0;
    state.presence += ((wanted ? 1 : 0) - state.presence) * (1 - Math.exp(-delta / 0.25));
    state.trail = state.trail.filter((point) => point.live || state.clock - point.time < TRAIL_SECONDS);
    const head = state.trail[0];
    if (!wanted) {
      if (head?.live) head.live = false;
      return state.trail.length > 0;
    }
    if (!head?.live) {
      state.trail.unshift({
        at: [...state.pointer],
        time: state.clock,
        arrive: state.clock,
        weight: state.presence,
        live: true,
      });
    } else {
      if (head.at[0] !== state.pointer[0] || head.at[1] !== state.pointer[1]) {
        const last = state.trail[1];
        const gap = last ? Math.hypot(last.at[0] - head.at[0], last.at[1] - head.at[1]) : Infinity;
        const settled = state.clock - head.arrive > SAMPLE_SECONDS;
        if (gap > 0.004 && (!last || settled || state.clock - last.time >= SAMPLE_SECONDS)) {
          state.trail.splice(1, 0, { ...head, at: [...head.at], time: state.clock, live: false });
        }
        head.at = [...state.pointer];
        head.arrive = state.clock;
      }
      head.time = state.clock;
      head.weight = state.presence;
    }
    if (state.trail.length > TRAIL) state.trail.length = TRAIL;
    return state.trail.length > 0;
  };

  const tick = (now) => {
    state.frame = window.requestAnimationFrame(tick);
    if (!state.visible || document.hidden) {
      state.last = now;
      return;
    }
    const delta = state.last ? Math.min((now - state.last) / 1000, 0.1) : 0;
    state.last = now;
    const reduced = prefersReduced.matches;
    state.clock += delta;
    if (state.introAt < 0) state.introAt = state.clock;
    state.time += delta * settings.speed * (reduced ? 0.4 : 1);
    const leaning = settings.mouseInteraction && state.inside && !reduced;
    const goalX = leaning ? (state.pointer[0] - 0.5) * settings.drift * 2 : 0;
    const goalY = leaning ? (0.5 - state.pointer[1]) * settings.drift * 2 : 0;
    const ease = 1 - Math.exp(-delta / 0.33);
    state.drift[0] += (goalX - state.drift[0]) * ease;
    state.drift[1] += (goalY - state.drift[1]) * ease;
    updateTrail(delta);
    state.flares = state.flares.filter((flare) => state.clock - flare.time < FLARE_SECONDS);
    resize();
    render(reduced);
  };

  const localPoint = (event) => {
    const rect = host.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(rect.width, 1),
      y: (event.clientY - rect.top) / Math.max(rect.height, 1),
      inside: event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom,
    };
  };
  const onMove = (event) => {
    const point = localPoint(event);
    state.inside = point.inside;
    if (point.inside) state.pointer = [point.x, point.y];
  };
  const onLeave = () => { state.inside = false; };
  const onDown = (event) => {
    if (!settings.flareOnClick || event.button !== 0 || prefersReduced.matches) return;
    if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select, label, [role='button']")) return;
    const point = localPoint(event);
    if (!point.inside) return;
    state.flares.push({ at: [point.x, point.y], time: state.clock });
    if (state.flares.length > MAX_FLARES) state.flares.shift();
  };

  const visibility = new IntersectionObserver((entries) => {
    state.visible = entries.some((entry) => entry.isIntersecting);
  });
  visibility.observe(host);
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  resize();
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown);
  document.documentElement.addEventListener("pointerleave", onLeave);
  state.frame = window.requestAnimationFrame(tick);

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(state.frame);
    visibility.disconnect();
    sizes.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vertexArray);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }, { once: true });
})();
