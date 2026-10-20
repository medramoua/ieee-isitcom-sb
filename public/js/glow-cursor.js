(() => {
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "glow-cursor-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    canvas.remove();
    console.error("Glow cursor could not create a 2D canvas context.");
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const trail = [];
  const bursts = [];
  const color = "#ff3b1f";
  const secondaryColor = "#b51220";
  const flameColor = "#ffb02e";
  const linger = 200;
  const maxTrailPoints = 48;
  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = true;
  let pointerInside = false;
  let pointerX = 0;
  let pointerY = 0;
  let pointerAngle = -Math.PI / 2;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const schedule = () => {
    if (!frame && visible && !document.hidden) frame = window.requestAnimationFrame(draw);
  };

  const drawRocket = () => {
    context.save();
    context.translate(pointerX, pointerY);
    context.rotate(pointerAngle);
    context.globalAlpha = 1;
    context.shadowColor = color;
    context.shadowBlur = 12;

    const flame = context.createLinearGradient(-19, 0, -5, 0);
    flame.addColorStop(0, "rgba(181, 18, 32, 0)");
    flame.addColorStop(0.45, flameColor);
    flame.addColorStop(1, "#fff0a6");
    context.fillStyle = flame;
    context.beginPath();
    context.moveTo(-7, -3.5);
    context.quadraticCurveTo(-13, -2, -20, 0);
    context.quadraticCurveTo(-13, 2, -7, 3.5);
    context.closePath();
    context.fill();

    const body = context.createLinearGradient(0, -7, 0, 7);
    body.addColorStop(0, "#ffd1a1");
    body.addColorStop(0.42, "#ff6538");
    body.addColorStop(1, "#c91d27");
    context.fillStyle = body;
    context.beginPath();
    context.moveTo(15, 0);
    context.quadraticCurveTo(6, -2, -6, -5);
    context.lineTo(-8, -3);
    context.lineTo(-8, 3);
    context.lineTo(-6, 5);
    context.quadraticCurveTo(6, 2, 15, 0);
    context.closePath();
    context.fill();

    context.shadowBlur = 0;
    context.fillStyle = "#ff9a61";
    context.beginPath();
    context.moveTo(-5, -4);
    context.lineTo(-11, -9);
    context.lineTo(-8, -2);
    context.closePath();
    context.moveTo(-5, 4);
    context.lineTo(-11, 9);
    context.lineTo(-8, 2);
    context.closePath();
    context.fill();

    context.fillStyle = "#ffd78a";
    context.beginPath();
    context.arc(5, 0, 1.7, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const draw = (now) => {
    frame = 0;
    if (!visible || document.hidden) return;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "screen";

    const activeTrail = trail.filter((point) => now - point.time < linger);
    trail.splice(0, trail.length, ...activeTrail);
    if (trail.length > 1) {
      const first = trail[0];
      const last = trail[trail.length - 1];
      const alpha = Math.max(0, 1 - (now - last.time) / linger);
      const gradient = context.createLinearGradient(first.x, first.y, last.x, last.y);
      gradient.addColorStop(0, `${secondaryColor}00`);
      gradient.addColorStop(0.45, `${secondaryColor}cc`);
      gradient.addColorStop(1, color);
      context.beginPath();
      context.moveTo(first.x, first.y);
      for (let i = 1; i < trail.length - 1; i++) {
        const current = trail[i];
        const next = trail[i + 1];
        context.quadraticCurveTo(
          current.x,
          current.y,
          (current.x + next.x) / 2,
          (current.y + next.y) / 2,
        );
      }
      context.lineTo(last.x, last.y);
      context.strokeStyle = gradient;
      context.lineWidth = reducedMotion.matches ? 2 : 3;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.shadowColor = color;
      context.shadowBlur = 18 * alpha;
      context.globalAlpha = alpha;
      context.stroke();

      const core = context.createRadialGradient(last.x, last.y, 0, last.x, last.y, 12);
      core.addColorStop(0, `rgba(255, 226, 163, ${alpha * 0.78})`);
      core.addColorStop(0.3, `rgba(255, 75, 31, ${alpha * 0.48})`);
      core.addColorStop(1, "rgba(255, 59, 31, 0)");
      context.fillStyle = core;
      context.beginPath();
      context.arc(last.x, last.y, 12, 0, Math.PI * 2);
      context.fill();
    }
    if (pointerInside) drawRocket();

    const aliveBursts = [];
    for (const burst of bursts) {
      const age = now - burst.time;
      const progress = age / 520;
      if (progress >= 1) continue;
      aliveBursts.push(burst);
      const alpha = 1 - progress;
      const distance = progress * burst.reach;
      context.globalAlpha = alpha;
      context.strokeStyle = color;
      context.lineWidth = 2 * alpha;
      context.shadowColor = color;
      context.shadowBlur = 14 * alpha;
      context.beginPath();
      context.moveTo(burst.x, burst.y);
      context.lineTo(
        burst.x + Math.cos(burst.angle) * distance,
        burst.y + Math.sin(burst.angle) * distance,
      );
      context.stroke();
    }
    bursts.splice(0, bursts.length, ...aliveBursts);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.shadowBlur = 0;
    if (trail.length > 1 || bursts.length) schedule();
  };

  const onPointerMove = (event) => {
    const now = performance.now();
    const previous = trail[trail.length - 1];
    if (previous) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (Math.hypot(dx, dy) > 1) pointerAngle = Math.atan2(dy, dx);
    }
    pointerInside = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    document.documentElement.classList.add("glow-cursor-enabled");
    if (!previous || Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 2) {
      trail.push({ x: event.clientX, y: event.clientY, time: now });
      if (trail.length > maxTrailPoints) trail.shift();
    }
    schedule();
  };

  const onPointerLeave = () => {
    pointerInside = false;
    document.documentElement.classList.remove("glow-cursor-enabled");
    schedule();
  };

  const onPointerDown = (event) => {
    if (reducedMotion.matches || !pointerInside || event.button !== 0) return;
    for (let i = 0; i < 8; i++) {
      bursts.push({
        x: event.clientX,
        y: event.clientY,
        angle: (Math.PI * 2 * i) / 8 + Math.random() * 0.25,
        reach: 24 + Math.random() * 16,
        time: performance.now(),
      });
    }
    schedule();
  };

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
    else if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  intersection.observe(document.documentElement);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(document.documentElement);
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  document.addEventListener("visibilitychange", schedule);
  resize();

  window.addEventListener("pagehide", () => {
    if (frame) window.cancelAnimationFrame(frame);
    intersection.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("visibilitychange", schedule);
    canvas.remove();
  }, { once: true });
})();
