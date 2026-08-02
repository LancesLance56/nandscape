"use client";

import React, { useEffect, useRef } from "react";

export function SiteGradient() {
  const particlesRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        root.style.setProperty("--scroll-y", `${window.scrollY}px`);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const particleCount = 30;
    const timeouts: number[] = [];

    const resetParticle = (particle: HTMLDivElement) => {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      particle.style.left = `${x}%`;
      particle.style.top = `${y}%`;
      particle.style.opacity = "0";
      return { x, y };
    };

    const animateParticle = (particle: HTMLDivElement) => {
      const pos = resetParticle(particle);
      const duration = Math.random() * 15 + 15;
      const delay = Math.random() * 8;

      const timeout = window.setTimeout(() => {
        particle.style.transition = `all ${duration}s ease-in-out`;
        particle.style.opacity = `${Math.random() * 0.15 + 0.05}`;
        particle.style.left = `${pos.x + (Math.random() * 10 - 5)}%`;
        particle.style.top = `${pos.y - Math.random() * 15}%`;

        const loopTimeout = window.setTimeout(() => animateParticle(particle), duration * 1000);
        timeouts.push(loopTimeout);
      }, delay * 1000);

      timeouts.push(timeout);
    };

    const createParticle = () => {
      const particle = document.createElement("div");
      particle.className = "absolute rounded-full pointer-events-none opacity-0 bg-[var(--ink)]";
      const size = Math.random() * 1.5 + 0.5;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      resetParticle(particle);
      container.appendChild(particle);
      animateParticle(particle);
    };

    for (let i = 0; i < particleCount; i++) createParticle();

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      container.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden bg-surface transition-colors duration-500"
      style={{ "--scroll-y": "0px" } as React.CSSProperties}
    >
      <div
        className="absolute inset-0"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
        }}
      >
        {/*
        // aesthetic spheres but I find it a bit disturbing
        <div
          className="gradient-sphere sphere-1 absolute rounded-full blur-[100px]"
          style={{ transform: "translateY(calc(var(--scroll-y) * 0.06))", willChange: "transform" }}
        />
        <div
          className="gradient-sphere sphere-2 absolute rounded-full blur-[100px]"
          style={{ transform: "translateY(calc(var(--scroll-y) * 0.06))", willChange: "transform" }}
        />
        <div
          className="gradient-sphere sphere-3 absolute rounded-full blur-[100px]"
          style={{ transform: "translateY(calc(var(--scroll-y) * 0.05))", willChange: "transform" }}
        />*/}

        <div
          className="absolute inset-0 dark:opacity-[0.15] mix-blend-normal"
          style={{
            backgroundSize: "48px 48px",
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
          }}
        />

        <div
          ref={particlesRef}
          className="absolute inset-0 pointer-events-none mix-blend-multiply"
        />
      </div>

      <div className="absolute inset-x-0 top-[70vh] bottom-0 bg-linear-to-b from-transparent to-surface/40" />

      <style jsx>{`
        /* Anchored to corners, lower opacities */
        .sphere-1 {
          width: 45vw;
          height: 45vw;
          top: -10%;
          left: -10%;
          background: linear-gradient(
            45deg,
            var(--copper),
            var(--copper-bg)
          );
          animation: floatCorner1 15s ease-in-out infinite alternate;
        }

        .sphere-2 {
          width: 40vw;
          height: 40vw;
          bottom: -10%;
          right: -10%;
          background: linear-gradient(
            225deg,
            var(--signal-green),
            var(--signal-green-bg)
          );
          animation: floatCorner2 18s ease-in-out infinite alternate;
        }

        .sphere-3 {
          width: 30vw;
          height: 30vw;
          top: 10%;
          right: -5%;
          background: linear-gradient(
            135deg,
            var(--signal-coral),
            var(--signal-coral-bg)
          );
          animation: floatCorner3 17s ease-in-out infinite alternate;
        }

        @keyframes floatCorner1 {
          0% {
            transform: translate(0px, 0px) scale(1) rotate(0deg);
            opacity: 0.15;
          }
          50% {
            transform: translate(2vw, 2vh) scale(1.05) rotate(5deg);
            opacity: 0.25;
          }
          100% {
            transform: translate(-1vw, 3vh) scale(0.95) rotate(10deg);
            opacity: 0.15;
          }
        }

        @keyframes floatCorner2 {
          0% {
            transform: translate(0px, 0px) scale(1);
            opacity: 0.15;
          }
          50% {
            transform: translate(-2vw, -1vh) scale(1.05);
            opacity: 0.25;
          }
          100% {
            transform: translate(1vw, -2vh) scale(0.95);
            opacity: 0.15;
          }
        }

        @keyframes floatCorner3 {
          0% {
            transform: translate(0px, 0px) scale(0.95);
            opacity: 0.1;
          }
          100% {
            transform: translate(-2vw, 2vh) scale(1.05);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
