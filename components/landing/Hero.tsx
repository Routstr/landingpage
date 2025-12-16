"use client";
import React, { useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Globe } from "@/components/ui/globe";
import FullScreenGlobeDialog from "@/components/client/FullScreenGlobeDialog";
import { MorphingText } from "@/components/MorphingText";

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const [globeOpen, setGlobeOpen] = useState(false);

  return (
    <div
      ref={parentRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20 md:px-8 md:py-32 bg-black"
    >
      <BackgroundGrids />

      {/* Desktop collision mechanisms - hidden on mobile */}
      <div className="hidden md:block">
        <CollisionMechanism
          beamOptions={{
            initialX: -200,
            translateX: 800,
            duration: 6,
            repeatDelay: 4,
          }}
          containerRef={containerRef}
          parentRef={parentRef}
        />
        <CollisionMechanism
          beamOptions={{
            initialX: 200,
            translateX: 1200,
            duration: 7,
            repeatDelay: 5,
          }}
          containerRef={containerRef}
          parentRef={parentRef}
        />
      </div>

      {/* Mobile collision mechanisms - optimized for smaller screens */}
      <div className="block md:hidden">
        <CollisionMechanism
          beamOptions={{
            initialX: -30,
            translateX: 100,
            initialY: -100,
            translateY: 400,
            duration: 5,
            delay: 0,
            repeatDelay: 3,
          }}
          containerRef={containerRef}
          parentRef={parentRef}
          isMobile={true}
          mobileOffset="left-[15%]"
        />
        <CollisionMechanism
          beamOptions={{
            initialX: -20,
            translateX: 90,
            initialY: -120,
            translateY: 450,
            duration: 6,
            delay: 2,
            repeatDelay: 3,
          }}
          containerRef={containerRef}
          parentRef={parentRef}
          isMobile={true}
          mobileOffset="left-[45%]"
        />
        <CollisionMechanism
          beamOptions={{
            initialX: -15,
            translateX: 70,
            initialY: -140,
            translateY: 420,
            duration: 5.5,
            delay: 4,
            repeatDelay: 3,
          }}
          containerRef={containerRef}
          parentRef={parentRef}
          isMobile={true}
          mobileOffset="left-[75%]"
        />
      </div>

      <div className="relative z-50 mx-auto mb-6 mt-10 w-full text-center px-4">
        <span className="mb-4 block font-mono text-xl text-gray-400">
          With Routstr
        </span>
        <h1 className="text-balance mx-auto mb-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Access to AI is Now
        </h1>
        <MorphingText
          texts={["Permissionless", "Decentralized", "Private"]}
          className="max-w-none"
          textClassName="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500"
        />
      </div>
      <p className="relative z-50 mx-auto mt-4 max-w-xl px-4 text-center text-base/6 text-gray-400 sm:text-lg md:text-xl">
        Pay-per-request AI APIs with Bitcoin micropayments. OpenAI-compatible,
        privacy-preserving, no account required.
      </p>
      <div className="mb-10 mt-8 flex w-full flex-col items-center justify-center gap-4 px-8 sm:flex-row md:mb-20">
        <Link
          href="/models"
          className="group relative z-20 flex h-10 w-full cursor-pointer items-center justify-center space-x-2 rounded-lg bg-white p-px px-4 py-2 text-center text-sm font-semibold leading-6 text-black no-underline transition duration-200 hover:bg-gray-200 sm:w-52"
        >
          Explore Models
        </Link>
        <Link
          href="https://docs.routstr.com"
          className="group relative z-20 flex h-10 w-full cursor-pointer items-center justify-center space-x-2 rounded-lg bg-black border border-white/20 p-px px-4 py-2 text-sm font-semibold leading-6 text-white no-underline shadow-input transition duration-200 hover:bg-white/10 sm:w-52"
        >
          Read Docs
        </Link>
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto max-w-5xl w-full rounded-[32px] border border-neutral-800 bg-neutral-900/50 p-2 backdrop-blur-lg md:p-4"
      >
        <div
          className="rounded-[24px] border border-neutral-800 bg-black p-2 h-[400px] md:h-[600px] relative overflow-hidden flex items-center justify-center cursor-pointer group"
          onClick={() => setGlobeOpen(true)}
        >
          <div className="absolute inset-0 w-full h-full">
            <Globe />
          </div>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-transparent z-10" />
          <div className="absolute bottom-8 left-0 right-0 z-20 text-center">
            <p className="text-sm text-gray-500 font-mono group-hover:text-gray-400 transition-colors">
              Click to explore • Live node activity
            </p>
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity z-5 pointer-events-none rounded-[24px]" />
        </div>
      </div>

      {/* Fullscreen Globe Dialog */}
      <FullScreenGlobeDialog open={globeOpen} onOpenChange={setGlobeOpen} />
    </div>
  );
}

const BackgroundGrids = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 grid h-full w-full -rotate-45 transform select-none grid-cols-2 gap-10 md:grid-cols-4">
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="left-auto right-0" />
      </div>
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="left-auto right-0" />
      </div>
      <div className="relative h-full w-full bg-gradient-to-b from-transparent via-neutral-900 to-transparent">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="left-auto right-0" />
      </div>
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="left-auto right-0" />
      </div>
    </div>
  );
};

const CollisionMechanism = ({
  parentRef,
  containerRef,
  beamOptions = {},
  isMobile = false,
  mobileOffset,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef: React.RefObject<HTMLDivElement | null>;
  isMobile?: boolean;
  mobileOffset?: string;
  beamOptions?: {
    initialX?: number;
    translateX?: number;
    initialY?: number;
    translateY?: number;
    rotate?: number;
    className?: string;
    duration?: number;
    delay?: number;
    repeatDelay?: number;
  };
}) => {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({
    detected: false,
    coordinates: null,
  });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);
  const [randomRotation, setRandomRotation] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Initialize random rotation only on client to avoid hydration mismatch
  useEffect(() => {
    setRandomRotation(Math.random() * 360);
    setHasMounted(true);
  }, []);

  // Track visibility using IntersectionObserver to pause RAF when not visible
  useEffect(() => {
    if (!parentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0]?.isIntersecting ?? false);
      },
      { threshold: 0.1 }
    );

    observer.observe(parentRef.current);
    return () => observer.disconnect();
  }, [parentRef]);

  useEffect(() => {
    // Don't run RAF loop if not visible - this is the main performance fix
    if (!isVisible) return;

    let rafId: number;
    let lastCheck = 0;
    const CHECK_INTERVAL = 200; // Check every 200ms instead of 50ms

    const checkCollision = (timestamp: number) => {
      if (timestamp - lastCheck >= CHECK_INTERVAL) {
        lastCheck = timestamp;
        if (
          beamRef.current &&
          containerRef.current &&
          parentRef.current &&
          !cycleCollisionDetected
        ) {
          const beamRect = beamRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          const parentRect = parentRef.current.getBoundingClientRect();

          if (beamRect.bottom >= containerRect.top) {
            const relativeX =
              beamRect.left - parentRect.left + beamRect.width / 2;
            const relativeY = beamRect.bottom - parentRect.top;

            setCollision({
              detected: true,
              coordinates: {
                x: relativeX,
                y: relativeY,
              },
            });
            setCycleCollisionDetected(true);
            if (beamRef.current) {
              beamRef.current.style.opacity = "0";
            }
          }
        }
      }
      rafId = requestAnimationFrame(checkCollision);
    };

    rafId = requestAnimationFrame(checkCollision);

    return () => cancelAnimationFrame(rafId);
  }, [cycleCollisionDetected, containerRef, parentRef, isVisible]);

  useEffect(() => {
    if (collision.detected && collision.coordinates) {
      setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        setCycleCollisionDetected(false);
        // Set beam opacity to 0
        if (beamRef.current) {
          beamRef.current.style.opacity = "1";
        }
      }, 2000);

      // Reset the beam animation after a delay
      setTimeout(() => {
        setBeamKey((prevKey) => prevKey + 1);
        setRandomRotation(Math.random() * 360);
      }, 2000);
    }
  }, [collision]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate="animate"
        initial={{
          translateY: beamOptions.initialY || "-200px",
          translateX: beamOptions.initialX || "0px",
          rotate: beamOptions.rotate || -45,
        }}
        variants={{
          animate: {
            translateY: beamOptions.translateY || "800px",
            translateX: beamOptions.translateX || "700px",
            rotate: beamOptions.rotate || -45,
          },
        }}
        transition={{
          duration: beamOptions.duration || 8,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          delay: beamOptions.delay || 0,
          repeatDelay: beamOptions.repeatDelay || 0,
        }}
        className={cn(
          "absolute top-20 m-auto h-10 w-10 z-20",
          isMobile ? mobileOffset || "left-1/3" : "left-96",
          beamOptions.className
        )}
      >
        <motion.div
          className="relative size-5"
          initial={{ rotate: 0 }}
          animate={
            hasMounted
              ? { rotate: [randomRotation, randomRotation + 720] }
              : { rotate: 0 }
          }
          transition={{
            duration: (beamOptions.duration || 8) * 2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Image
            src="/assets/cashu-token.png"
            alt="Cashu Token"
            fill
            className="object-contain"
          />
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            className=""
            style={{
              left: `${collision.coordinates.x + 20}px`,
              top: `${collision.coordinates.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const Explosion = ({ ...props }: React.HTMLProps<HTMLDivElement>) => {
  // Reduced from 20 to 8 particles for better performance
  const spans = Array.from({ length: 8 }, (_, index) => ({
    id: index,
    initialX: 0,
    initialY: 0,
    directionX: Math.floor(Math.random() * 80 - 40),
    directionY: Math.floor(Math.random() * -50 - 10),
  }));

  return (
    <div {...props} className={cn("absolute z-50 h-2 w-2", props.className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute -inset-x-10 top-0 m-auto h-[4px] w-10 rounded-full bg-gradient-to-r from-transparent via-orange-500 to-transparent blur-sm"
      ></motion.div>
      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: span.initialX, y: span.initialY, opacity: 1 }}
          animate={{
            x: span.directionX,
            y: span.directionY,
            opacity: 0,
          }}
          transition={{ duration: Math.random() * 1.5 + 0.5, ease: "easeOut" }}
          className="absolute h-1 w-1 rounded-full bg-gradient-to-b from-orange-500 to-yellow-500"
        />
      ))}
    </div>
  );
};

const GridLineVertical = ({
  className,
  offset,
}: {
  className?: string;
  offset?: string;
}) => {
  return (
    <div
      style={
        {
          "--background": "#000000",
          "--color": "rgba(255, 255, 255, 0.2)",
          "--height": "5px",
          "--width": "1px",
          "--fade-stop": "90%",
          "--offset": offset || "150px", //-100px if you want to keep the line inside
          "--color-dark": "rgba(255, 255, 255, 0.2)",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={cn(
        "absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(--width)]",
        "bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "[background-size:var(--width)_var(--height)]",
        "[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]",
        "[mask-composite:exclude]",
        "z-30",
        className
      )}
    ></div>
  );
};
