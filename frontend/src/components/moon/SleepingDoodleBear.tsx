"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface SleepingDoodleBearProps {
  onSettled?: () => void;
}

export default function SleepingDoodleBear({ onSettled }: SleepingDoodleBearProps) {
  const shouldReduceMotion = useReducedMotion();
  const [animationStep, setAnimationStep] = useState<
    "appear" | "blanket" | "curled" | "sleeping" | "zzz" | "settling" | "faded"
  >(() => (shouldReduceMotion ? "zzz" : "appear"));

  useEffect(() => {
    if (shouldReduceMotion) {
      const timer = setTimeout(() => {
        setAnimationStep("faded");
        onSettled?.();
      }, 4000);
      return () => clearTimeout(timer);
    }

    // Progression of original doodle bear falling asleep
    const t1 = setTimeout(() => setAnimationStep("blanket"), 700);
    const t2 = setTimeout(() => setAnimationStep("curled"), 1600);
    const t3 = setTimeout(() => setAnimationStep("sleeping"), 2400);
    const t4 = setTimeout(() => setAnimationStep("zzz"), 3100);
    const t5 = setTimeout(() => setAnimationStep("settling"), 4800);
    const t6 = setTimeout(() => {
      setAnimationStep("faded");
      onSettled?.();
    }, 5800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [shouldReduceMotion, onSettled]);

  if (animationStep === "faded") {
    return null;
  }

  const isBlanketPulled =
    animationStep === "blanket" ||
    animationStep === "curled" ||
    animationStep === "sleeping" ||
    animationStep === "zzz" ||
    animationStep === "settling";

  const isSleeping =
    animationStep === "sleeping" || animationStep === "zzz" || animationStep === "settling";

  const showZzz = animationStep === "zzz" || animationStep === "settling";
  const isSettling = animationStep === "settling";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{
        opacity: isSettling ? 0 : 1,
        y: isSettling ? -4 : 0,
      }}
      transition={{ duration: shouldReduceMotion ? 0.2 : 0.8 }}
      className="flex flex-col items-center justify-center my-3 py-2 text-[#EAE6DF] select-none"
      role="status"
      aria-label="A small doodle bear pulling a blanket over itself and falling asleep peacefully"
    >
      <div className="relative w-44 h-28 flex items-center justify-center">
        {/* Floating "Zzz..." */}
        {showZzz && (
          <div className="absolute -top-1 right-6 flex flex-col items-end pointer-events-none">
            <motion.span
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4, scale: 0.8 }}
              animate={shouldReduceMotion ? {} : { opacity: [0, 1, 0], y: [-2, -14], x: [0, 4] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.3 }}
              className="text-xs font-doodle text-[#CCCCCC] font-bold"
            >
              z
            </motion.span>
            <motion.span
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4, scale: 0.8 }}
              animate={shouldReduceMotion ? {} : { opacity: [0, 1, 0], y: [-1, -18], x: [0, 6] }}
              transition={{ duration: 2.2, delay: 0.4, repeat: Infinity, repeatDelay: 0.2 }}
              className="text-sm font-doodle text-[#FFFFFF] font-bold"
            >
              Z
            </motion.span>
            <motion.span
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4, scale: 0.8 }}
              animate={shouldReduceMotion ? {} : { opacity: [0, 1, 0], y: [0, -22], x: [0, 8] }}
              transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, repeatDelay: 0.1 }}
              className="text-base font-doodle text-[#E0E0E0] font-bold"
            >
              Zzz...
            </motion.span>
          </div>
        )}

        {/* Hand-drawn Doodle Bear SVG (Original Black & White / Dark Gray) */}
        <svg
          viewBox="0 0 170 110"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle floor / bed sketch doodle line */}
          <path
            d="M 15 95 C 45 94, 85 96, 125 94 C 145 95, 155 94, 160 95"
            stroke="#444448"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />

          {/* Bear Body resting */}
          <motion.g
            animate={
              isSleeping && !shouldReduceMotion
                ? {
                    y: [0, 1, 0],
                  }
                : {}
            }
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Curled back/body outline */}
            <path
              d="M 45 88 C 30 85, 24 70, 32 54 C 38 42, 54 40, 72 44 C 90 48, 108 55, 115 68 C 120 78, 116 88, 102 90 Z"
              fill="#121214"
              stroke="#D8D8D8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Little rounded tail */}
            <path
              d="M 28 66 C 22 66, 20 72, 24 76 C 27 79, 31 77, 32 73"
              fill="#121214"
              stroke="#D8D8D8"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Bear Head */}
            <g transform="translate(90, 42)">
              {/* Back Ear */}
              <path
                d="M 12 5 C 10 -4, 22 -6, 25 3"
                fill="#121214"
                stroke="#D8D8D8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 14 3 C 14 -1, 20 -2, 22 2"
                stroke="#666666"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* Head shape */}
              <path
                d="M 6 18 C 4 8, 16 -1, 30 2 C 42 5, 48 18, 44 30 C 40 40, 26 44, 14 38 C 7 34, 4 26, 6 18 Z"
                fill="#121214"
                stroke="#D8D8D8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Front Ear */}
              <path
                d="M 28 4 C 28 -5, 40 -4, 40 6"
                fill="#121214"
                stroke="#D8D8D8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 31 3 C 32 0, 37 0, 37 5"
                stroke="#666666"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* Eyes */}
              {isSleeping ? (
                /* Curled sleeping closed eyes (doodle arches) */
                <g>
                  <path
                    d="M 26 21 C 28 24, 32 24, 34 21"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 38 23 C 40 26, 43 25, 44 23"
                    stroke="#FFFFFF"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </g>
              ) : (
                /* Drowsy blinking eyes */
                <g>
                  <ellipse cx="30" cy="22" rx="2" ry="1.2" fill="#FFFFFF" />
                  <ellipse cx="41" cy="23" rx="1.8" ry="1" fill="#FFFFFF" />
                </g>
              )}

              {/* Snout & Nose */}
              <ellipse
                cx="37"
                cy="29"
                rx="6"
                ry="4.5"
                fill="#18181C"
                stroke="#888888"
                strokeWidth="1.2"
              />
              <ellipse cx="38" cy="28" rx="2" ry="1.4" fill="#FFFFFF" />
              <path
                d="M 38 29.5 L 38 31.5"
                stroke="#D8D8D8"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          </motion.g>

          {/* Tiny Hand-drawn Doodle Blanket */}
          {/* Animated pull-up */}
          <motion.g
            initial={shouldReduceMotion ? { y: 0 } : { y: 18, opacity: 0.6 }}
            animate={
              isBlanketPulled || shouldReduceMotion
                ? { y: 0, opacity: 1 }
                : { y: 16, opacity: 0.6 }
            }
            transition={{ duration: shouldReduceMotion ? 0 : 0.9, ease: "easeOut" }}
          >
            {/* Blanket Body */}
            <path
              d="M 34 88 C 42 66, 68 62, 106 66 C 118 67, 126 73, 128 88 C 110 94, 60 95, 34 88 Z"
              fill="#1C1C20"
              stroke="#D8D8D8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Blanket folded top hem with hand-drawn stitches */}
            <path
              d="M 40 70 C 60 63, 85 64, 114 67"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Hand-drawn dashed stitch details on blanket */}
            <path
              d="M 45 74 C 65 67, 85 68, 110 71"
              stroke="#888888"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />

            {/* Tiny bear paws holding the edge of the blanket */}
            <path
              d="M 78 63 C 76 59, 82 58, 84 62 C 84 65, 79 66, 78 63 Z"
              fill="#121214"
              stroke="#D8D8D8"
              strokeWidth="1.6"
            />
            <path
              d="M 94 65 C 92 61, 98 60, 100 64 C 100 67, 95 68, 94 65 Z"
              fill="#121214"
              stroke="#D8D8D8"
              strokeWidth="1.6"
            />
          </motion.g>
        </svg>
      </div>

      {/* Gentle caption */}
      <span className="text-[11px] font-doodle text-[#A0A0A0] tracking-wider mt-0.5">
        thoughts tucked away under the night...
      </span>
    </motion.div>
  );
}
