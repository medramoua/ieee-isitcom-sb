"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface WorksWheelItem {
  title: string;
  image: string;
  href?: string;
}

export interface WorksWheelProps extends Omit<
  React.ComponentPropsWithoutRef<"section">,
  "children"
> {
  items: WorksWheelItem[];
  onItemSelect?: (item: WorksWheelItem, index: number) => void;
  autoPlay?: boolean;
  label?: string;
}

const CARD_RATIO = 1.45;
const DRAG_UNITS = 420;
const WHEEL_UNITS = 900;
const SETTLE = 140;
const EASE = 0.075;
const AUTO_PLAY_SECONDS_PER_PHOTO = 5.5;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type Stage = { width: number; height: number };

export function WorksWheel({
  items,
  onItemSelect,
  autoPlay = false,
  label = "Photo gallery",
  className,
  ...props
}: WorksWheelProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);
  const wakeRef = React.useRef<() => void>(() => {});
  const dragY = React.useRef<number | null>(null);
  const settling = React.useRef(0);
  const turn = React.useRef(0);
  const target = React.useRef(0);
  const idPrefix = React.useId();
  const [active, setActive] = React.useState(0);
  const [stage, setStage] = React.useState<Stage>({ width: 0, height: 0 });
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const count = items.length;

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const update = () => setStage({
      width: element.clientWidth,
      height: element.clientHeight,
    });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const cardWidth = Math.min(stage.width * 0.62, stage.height * 0.72 * CARD_RATIO);
  const cardHeight = cardWidth / CARD_RATIO;

  React.useEffect(() => {
    if (!stage.height || !count) return;
    let frame = 0;
    let previousFrameTime = 0;

    const draw = (time: number) => {
      frame = 0;
      if (autoPlay && previousFrameTime) {
        const elapsed = Math.min(time - previousFrameTime, 50) / 1000;
        target.current += elapsed / AUTO_PLAY_SECONDS_PER_PHOTO;
      }
      previousFrameTime = time;
      const gap = target.current - turn.current;
      if (Math.abs(gap) < 0.0005) turn.current = target.current;
      else turn.current += gap * (reducedMotion && !autoPlay ? 1 : EASE);

      const position = turn.current;
      for (let index = 0; index < count; index += 1) {
        const rawDistance = index - position;
        const distance = ((rawDistance + count / 2) % count + count) % count - count / 2;
        const card = cardRefs.current[index];
        if (!card) continue;

        const distanceFromCenter = Math.abs(distance);
        const scale = clamp(1 - distanceFromCenter * 0.16, 0.52, 1);
        card.style.transform = [
          `translateX(${distance * cardWidth * 0.72}px)`,
          `translateZ(${-distanceFromCenter * cardWidth * 0.16}px)`,
          `rotateY(${-distance * 14}deg)`,
          `scale(${scale})`,
        ].join(" ");
        card.style.opacity = distanceFromCenter > 2.15 ? "0" : "1";
        card.style.zIndex = String(100 - Math.round(distanceFromCenter * 10));
        card.style.pointerEvents = distanceFromCenter > 1.6 ? "none" : "auto";
      }

      const nextActive = ((Math.round(position) % count) + count) % count;
      setActive((previous) => previous === nextActive ? previous : nextActive);
      if (autoPlay || Math.abs(target.current - turn.current) >= 0.0005) schedule();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    wakeRef.current = schedule;
    schedule();
    return () => {
      wakeRef.current = () => {};
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [autoPlay, cardWidth, count, reducedMotion, stage.height]);

  const to = React.useCallback((next: number) => {
    target.current = Math.max(0, next);
    wakeRef.current();
  }, []);

  React.useEffect(() => {
    const element = stageRef.current;
    if (!element || !count) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      to(target.current + event.deltaY / WHEEL_UNITS);
      window.clearTimeout(settling.current);
      settling.current = window.setTimeout(
        () => to(Math.round(target.current)),
        SETTLE,
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      window.clearTimeout(settling.current);
    };
  }, [count, to]);

  const endDrag = () => {
    dragY.current = null;
    to(Math.round(target.current));
  };

  return (
    <section
      aria-label={label}
      className={cn("relative h-full min-h-[24rem] w-full overflow-hidden select-none", className)}
      {...props}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`${idPrefix}-photo-${active}`}
        data-works-wheel-stage
        className="absolute inset-0 touch-pan-x outline-none focus-visible:outline-2 focus-visible:outline-cyan-300"
        style={{ perspective: `${Math.max(stage.width, cardWidth * 3)}px` }}
        onPointerDown={(event) => {
          dragY.current = event.clientY;
          const targetElement = event.target;
          if (
            targetElement instanceof Element &&
            !targetElement.closest("[data-gallery-card]")
          ) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          if (dragY.current === null) return;
          to(target.current + (dragY.current - event.clientY) / DRAG_UNITS);
          dragY.current = event.clientY;
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            to(Math.round(target.current) + 1);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            to(Math.max(0, Math.round(target.current) - 1));
          } else {
            return;
          }
          event.preventDefault();
        }}
      >
        {items.map((item, index) => {
          const commonProps = {
            id: `${idPrefix}-photo-${index}`,
            "data-gallery-card": "",
            role: "option" as const,
            "aria-label": `${label} ${index + 1}`,
            "aria-selected": index === active,
            ref: (node: HTMLElement | null) => {
              cardRefs.current[index] = node;
            },
            className: "absolute left-1/2 top-1/2 block overflow-hidden rounded-2xl border border-white/15 bg-[#071c2e] p-0 shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition-[border-color,box-shadow] duration-300 hover:border-cyan-300 hover:shadow-[0_0_0_2px_rgba(103,232,249,0.35),0_24px_70px_rgba(0,0,0,0.45)] focus-visible:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 [backface-visibility:hidden]",
            style: {
              width: cardWidth,
              height: cardHeight,
              marginLeft: -cardWidth / 2,
              marginTop: -cardHeight / 2,
            },
          };
          const image = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt=""
              draggable={false}
              className="pointer-events-none size-full object-cover"
            />
          );

          if (item.href) {
            return <a {...commonProps} href={item.href} key={`${index}-${item.image}`}>{image}</a>;
          }
          if (onItemSelect) {
            return (
              <button
                {...commonProps}
                key={`${index}-${item.image}`}
                type="button"
                className={`${commonProps.className} cursor-zoom-in`}
                onClick={() => onItemSelect(item, index)}
              >
                {image}
              </button>
            );
          }
          return <div {...commonProps} key={`${index}-${item.image}`}>{image}</div>;
        })}
      </div>
    </section>
  );
}

export default WorksWheel;
