"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const morphTime = 1.5;
const cooldownTime = 0.5;

const useMorphingText = (
  texts: string[],
  containerRef: React.RefObject<HTMLDivElement | null>
) => {
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(0);
  const timeRef = useRef(new Date());

  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const setStyles = useCallback(
    (fraction: number) => {
      const [current1, current2] = [text1Ref.current, text2Ref.current];
      if (!current1 || !current2) return;

      // Apply filter to container during morphing
      if (containerRef.current) {
        containerRef.current.style.filter = "url(#threshold) blur(0.6px)";
      }

      current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      const invertedFraction = 1 - fraction;
      current1.style.filter = `blur(${Math.min(
        8 / invertedFraction - 8,
        100
      )}px)`;
      current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`;

      current1.textContent = texts[textIndexRef.current % texts.length];
      current2.textContent = texts[(textIndexRef.current + 1) % texts.length];
    },
    [texts, containerRef]
  );

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;

    let fraction = morphRef.current / morphTime;

    if (fraction > 1) {
      cooldownRef.current = cooldownTime;
      fraction = 1;
    }

    setStyles(fraction);

    if (fraction === 1) {
      textIndexRef.current++;
    }
  }, [setStyles]);

  const doCooldown = useCallback(() => {
    morphRef.current = 0;
    const [current1, current2] = [text1Ref.current, text2Ref.current];

    // Calculate cooldown progress (1 = just started cooldown, 0 = cooldown complete)
    const cooldownProgress = cooldownRef.current / cooldownTime;

    if (current1 && current2) {
      current2.style.filter = "none";
      current2.style.opacity = "100%";
      current1.style.filter = "none";
      current1.style.opacity = "0%";
    }

    // Gradually reduce blur during cooldown for smooth transition to crisp
    if (containerRef.current) {
      if (cooldownProgress <= 0) {
        // Cooldown complete - fully crisp
        containerRef.current.style.filter = "none";
      } else {
        // Gradually reduce blur as cooldown progresses
        const blurAmount = 0.6 * cooldownProgress;
        containerRef.current.style.filter = `url(#threshold) blur(${blurAmount}px)`;
      }
    }
  }, [containerRef]);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const newTime = new Date();
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
      timeRef.current = newTime;

      cooldownRef.current -= dt;

      if (cooldownRef.current <= 0) doMorph();
      else doCooldown();
    };

    animate();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [doMorph, doCooldown]);

  return { text1Ref, text2Ref };
};

interface MorphingTextProps {
  className?: string;
  texts: string[];
  textClassName?: string;
}

interface TextsProps {
  texts: string[];
  textClassName?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const Texts: React.FC<TextsProps> = ({
  texts,
  textClassName,
  containerRef,
}) => {
  const { text1Ref, text2Ref } = useMorphingText(texts, containerRef);
  return (
    <>
      <span
        className={cn(
          "absolute inset-x-0 top-0 m-auto inline-block w-full",
          textClassName
        )}
        ref={text1Ref}
      />
      <span
        className={cn(
          "absolute inset-x-0 top-0 m-auto inline-block w-full",
          textClassName
        )}
        ref={text2Ref}
      />
    </>
  );
};

const SvgFilters: React.FC = () => (
  <svg
    id="filters"
    className="fixed h-0 w-0"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <filter id="threshold">
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 255 -140"
        />
      </filter>
    </defs>
  </svg>
);

export const MorphingText: React.FC<MorphingTextProps> = ({
  texts,
  className,
  textClassName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto h-16 w-full text-center font-sans text-[40pt] leading-none font-bold md:h-24 lg:text-[6rem] overflow-visible",
        className
      )}
    >
      <Texts
        texts={texts}
        textClassName={textClassName}
        containerRef={containerRef}
      />
      <SvgFilters />
    </div>
  );
};
