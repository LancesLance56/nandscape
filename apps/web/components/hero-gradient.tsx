// this file is not used but its good baseline and used for testing

"use client";

import {useEffect, useRef} from "react";

export function HeroGradient() {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;

    const particleCount = 25;
    const timeouts: number[] = [];

    const resetParticle = (particle: HTMLDivElement) => {
      const x = Math.random() * 100;
      const y = Math.random() * 100;

      particle.style.left = `${x}%`;
      particle.style.top = `${y}%`;
      particle.style.opacity = "0";

      return {x, y};
    };

    const animateParticle = (particle: HTMLDivElement) => {
      const pos = resetParticle(particle);

      const duration = Math.random() * 15 + 15; // Slower animations
      const delay = Math.random() * 8;

      const timeout = window.setTimeout(() => {
        particle.style.transition = `all ${duration}s ease-in-out`;
        particle.style.opacity = `${Math.random() * 0.15 + 0.05}`;

        particle.style.left = `${pos.x + (Math.random() * 10 - 5)}%`;
        particle.style.top = `${pos.y - Math.random() * 15}%`;

        const loopTimeout = window.setTimeout(
          () => animateParticle(particle),
          duration * 1000
        );
        timeouts.push(loopTimeout);
      }, delay * 1000);

      timeouts.push(timeout);
    };

    const createParticle = () => {
      const particle = document.createElement("div");
      particle.className =
        "absolute rounded-full pointer-events-none opacity-0 bg-[var(--ink)]";

      // Smaller particles
      const size = Math.random() * 1.5 + 0.5;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;

      resetParticle(particle);
      container.appendChild(particle);

      animateParticle(particle);
    };

    for (let i = 0; i < particleCount; i++) {
      createParticle();
    }

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      if (container) container.innerHTML = "";
    };
  }, []);

  return (
    <>
      <div className="absolute inset-0 overflow-hidden bg-surface transition-colors duration-500 -z-10">

        <div
          className="absolute inset-0"
          style={{
            WebkitMaskImage: "radial-gradient(ellipse at center, transparent 15%, black 80%)",
            maskImage: "radial-gradient(ellipse at center, transparent 15%, black 80%)",
          }}
        >
          <div className="gradient-sphere sphere-1 absolute rounded-full blur-[100px]"/>
          <div className="gradient-sphere sphere-2 absolute rounded-full blur-[100px]"/>
          <div className="gradient-sphere sphere-3 absolute rounded-full blur-[100px]"/>

          <div
            className="absolute inset-0 opacity-[0.80] dark:opacity-[0.15] mix-blend-normal"
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
            className="absolute inset-0 pointer-events-none mix-blend-multiply dark:mix-blend-screen"
          />
        </div>
      </div>

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
          animation: floatCorner1 25s ease-in-out infinite alternate;
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
          animation: floatCorner2 28s ease-in-out infinite alternate;
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
          animation: floatCorner3 22s ease-in-out infinite alternate;
        }

        /* Subtle ambient movement rather than sweeping translations */
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
    </>
  );
}