"use client";

import {
  AnimatePresence,
  motion,
  type Transition,
  type Variants,
} from "motion/react";
import { useRef, useState } from "react";
import type React from "react";
import { cn } from "@/lib/utils";

export type TextRevealPreset = "blur" | "fade-in-blur" | "scale" | "fade" | "slide";
export type TextRevealPer = "word" | "char" | "line";

export type TextRevealProps = {
  children: string;
  per?: TextRevealPer;
  as?: keyof React.JSX.IntrinsicElements;
  variants?: { container?: Variants; item?: Variants };
  className?: string;
  preset?: TextRevealPreset;
  delay?: number;
  speedReveal?: number;
  speedSegment?: number;
  trigger?: boolean;
  replayOnHover?: boolean;
  onAnimationComplete?: () => void;
  onAnimationStart?: () => void;
  segmentWrapperClassName?: string;
  containerTransition?: Transition;
  segmentTransition?: Transition;
  style?: React.CSSProperties;
};

const defaultStaggerTimes: Record<TextRevealPer, number> = {
  char: 0.03,
  line: 0.1,
  word: 0.05,
};

const defaultContainerVariants: Variants = {
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const presetVariants: Record<TextRevealPreset, { container: Variants; item: Variants }> = {
  blur: {
    container: defaultContainerVariants,
    item: {
      exit: { filter: "blur(12px)", opacity: 0 },
      hidden: { filter: "blur(12px)", opacity: 0 },
      visible: { filter: "blur(0px)", opacity: 1 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      exit: { opacity: 0 },
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  },
  "fade-in-blur": {
    container: defaultContainerVariants,
    item: {
      exit: { filter: "blur(12px)", opacity: 0, y: 20 },
      hidden: { filter: "blur(12px)", opacity: 0, y: 20 },
      visible: { filter: "blur(0px)", opacity: 1, y: 0 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      exit: { opacity: 0, scale: 0 },
      hidden: { opacity: 0, scale: 0 },
      visible: { opacity: 1, scale: 1 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      exit: { opacity: 0, y: 20 },
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
  },
};

function splitText(text: string, per: TextRevealPer) {
  if (per === "line") return text.split("\n");
  if (per === "char") return text.split("");
  return text.split(/(\s+)/);
}

function SegmentItem({
  segment,
  variants,
  per,
  wrapperClassName,
}: {
  segment: string;
  variants: Variants;
  per: TextRevealPer;
  wrapperClassName?: string;
}) {
  const content =
    per === "line" ? (
      <motion.span className="block" variants={variants}>
        {segment}
      </motion.span>
    ) : per === "word" ? (
      <motion.span
        aria-hidden="true"
        className="inline-block whitespace-pre"
        variants={variants}
      >
        {segment}
      </motion.span>
    ) : (
      <span className="inline-block whitespace-pre">
        <motion.span
          aria-hidden="true"
          className="inline-block whitespace-pre"
          variants={variants}
        >
          {segment}
        </motion.span>
      </span>
    );

  if (!wrapperClassName) return content;
  return (
    <span className={cn(per === "line" ? "block" : "inline-block", wrapperClassName)}>
      {content}
    </span>
  );
}

function AnimatedSegments({
  segments,
  per,
  variants,
  wrapperClassName,
  replayRef,
}: {
  segments: string[];
  per: TextRevealPer;
  variants: Variants;
  wrapperClassName?: string;
  replayRef: React.MutableRefObject<() => void>;
}) {
  const [replayKey, setReplayKey] = useState(0);
  replayRef.current = () => setReplayKey((key) => key + 1);

  return (
    <>
      {segments.map((segment, index) => (
        <SegmentItem
          key={`${replayKey}-${per}-${index}-${segment}`}
          per={per}
          segment={segment}
          variants={variants}
          wrapperClassName={wrapperClassName}
        />
      ))}
    </>
  );
}

export function TextReveal({
  children,
  per = "word",
  as = "p",
  variants,
  className,
  preset = "fade",
  delay = 0,
  speedReveal = 1,
  speedSegment = 1,
  trigger = true,
  replayOnHover = false,
  onAnimationComplete,
  onAnimationStart,
  segmentWrapperClassName,
  containerTransition,
  segmentTransition,
  style,
}: TextRevealProps) {
  const replayRef = useRef<() => void>(() => {});
  const segments = splitText(children, per);
  const MotionTag = motion.create(as) as typeof motion.div;
  const base = presetVariants[preset];
  const stagger = defaultStaggerTimes[per] / speedReveal;
  const baseDuration = 0.3 / speedSegment;

  const containerVars: Variants = {
    ...base.container,
    visible: {
      ...base.container.visible,
      transition: {
        delayChildren: delay,
        staggerChildren: stagger,
        ...containerTransition,
      },
    },
  };

  const itemVars: Variants = {
    ...base.item,
    visible: {
      ...base.item.visible,
      transition: { duration: baseDuration, ...segmentTransition },
    },
  };

  const computedVariants = variants
    ? {
        container: { ...containerVars, ...variants.container },
        item: { ...itemVars, ...variants.item },
      }
    : { container: containerVars, item: itemVars };

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <MotionTag
          animate="visible"
          className={className}
          exit="exit"
          initial="hidden"
          onMouseEnter={replayOnHover ? () => replayRef.current() : undefined}
          onAnimationComplete={onAnimationComplete}
          onAnimationStart={onAnimationStart}
          style={style}
          variants={computedVariants.container}
        >
          {per !== "line" && <span className="sr-only">{children}</span>}
          <AnimatedSegments
            per={per}
            replayRef={replayRef}
            segments={segments}
            variants={computedVariants.item}
            wrapperClassName={segmentWrapperClassName}
          />
        </MotionTag>
      )}
    </AnimatePresence>
  );
}

export default TextReveal;
