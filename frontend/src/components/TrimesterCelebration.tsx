"use client";

import { useEffect, useRef, useState } from "react";
import { Baby, Heart, X } from "lucide-react";

interface Props {
  babyNickname?: string;
  motherName?: string;
  trimester: "first" | "second" | "third";
  onDismiss: () => void;
}

const MESSAGES: Record<string, { title: string; subtitle: string; emoji: string }> = {
  first: {
    title: "You Completed Your First Trimester!",
    subtitle: "Your little one has grown from a tiny cell to a fully formed baby with fingers, toes, and a beating heart. You're amazing!",
    emoji: "🎉",
  },
  second: {
    title: "Second Trimester Complete!",
    subtitle: "You're two-thirds of the way there! Your baby can now hear your voice and is getting stronger every day.",
    emoji: "🌟",
  },
  third: {
    title: "You Made It — Almost There!",
    subtitle: "The final stretch! Your baby is fully developed and getting ready to meet you. Hang in there, mama!",
    emoji: "👶",
  },
};

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  shape: "star" | "circle" | "square" | "heart";
  opacity: number;
}

const COLORS = [
  "#FF69B4", "#FFD700", "#FF6B9D", "#C084FC", "#FB923C",
  "#34D399", "#60A5FA", "#F472B6", "#FBBF24", "#A78BFA",
  "#F87171", "#38BDF8", "#FCA5A1", "#BEF264", "#E879F9",
];

export default function TrimesterCelebration({ babyNickname, motherName, trimester, onDismiss }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const msg = MESSAGES[trimester];
  const name = babyNickname || motherName || "Mama";

  // Fade in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Canvas confetti animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Create initial burst of particles
    function spawnBurst(count: number) {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          id: Math.random(),
          x: Math.random() * canvas!.width,
          y: -20 - Math.random() * canvas!.height * 0.5,
          size: 4 + Math.random() * 8,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: Math.random() * 360,
          velocityX: (Math.random() - 0.5) * 4,
          velocityY: 1 + Math.random() * 3,
          rotationSpeed: (Math.random() - 0.5) * 6,
          shape: (["star", "circle", "square", "heart"] as const)[Math.floor(Math.random() * 4)],
          opacity: 1,
        });
      }
    }

    // Spawn bursts over time for continuous effect
    spawnBurst(120);
    const burstInterval = setInterval(() => spawnBurst(30), 1500);

    function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
      const spikes = 5;
      const outerRadius = size;
      const innerRadius = size * 0.4;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
      const s = size * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.4);
      ctx.bezierCurveTo(cx - s, cy - s * 0.4, cx - s * 0.5, cy - s, cx, cy - s * 0.4);
      ctx.bezierCurveTo(cx + s * 0.5, cy - s, cx + s, cy - s * 0.4, cx, cy + s * 0.4);
      ctx.closePath();
      ctx.fill();
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.rotation += p.rotationSpeed;
        p.velocityY += 0.03; // gravity
        p.velocityX *= 0.999; // air resistance

        // Fade near bottom
        if (p.y > canvas!.height * 0.8) {
          p.opacity -= 0.02;
        }

        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.globalAlpha = Math.max(0, p.opacity);
        ctx!.fillStyle = p.color;

        switch (p.shape) {
          case "star":
            drawStar(ctx!, 0, 0, p.size);
            break;
          case "heart":
            drawHeart(ctx!, 0, 0, p.size);
            break;
          case "circle":
            ctx!.beginPath();
            ctx!.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
            ctx!.fill();
            break;
          case "square":
            ctx!.fillRect(-p.size * 0.4, -p.size * 0.4, p.size * 0.8, p.size * 0.8);
            break;
        }

        ctx!.restore();
      });

      // Remove dead particles
      particlesRef.current = particlesRef.current.filter((p) => p.opacity > 0 && p.y < canvas!.height + 50);

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(burstInterval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  function handleDismiss() {
    setVisible(false);
    setTimeout(onDismiss, 400);
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-500/20 via-purple-500/20 to-transparent backdrop-blur-sm" />

      {/* Central card */}
      <div
        className={`relative z-10 mx-4 max-w-sm w-full bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center transform transition-all duration-700 ${
          visible ? "scale-100 translate-y-0" : "scale-75 translate-y-10"
        }`}
      >
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-2 text-gray-300 hover:text-gray-500 transition"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big emoji */}
        <div className="text-6xl mb-4 animate-bounce">{msg.emoji}</div>

        {/* Sparkle ring */}
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 via-purple-400 to-pink-300 flex items-center justify-center shadow-lg animate-pulse">
            <Baby className="w-10 h-10 text-white" />
          </div>
          {/* Sparkle dots */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <span
              key={deg}
              className="absolute w-2 h-2 rounded-full bg-yellow-300 animate-ping"
              style={{
                top: `${50 - 48 * Math.cos((deg * Math.PI) / 180)}%`,
                left: `${50 + 48 * Math.sin((deg * Math.PI) / 180)}%`,
                animationDelay: `${deg * 3}ms`,
                animationDuration: "1.5s",
              }}
            />
          ))}
        </div>

        <h2 className="text-xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-400 bg-clip-text text-transparent mb-1">
          🎊 CONGRATULATIONS 🎊
        </h2>
        <h3 className="text-lg font-bold text-primary-700 mb-2">
          {name ? `${name}, ` : ""}{msg.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          {msg.subtitle}
        </p>

        <div className="flex items-center justify-center gap-2 mb-4">
          {["💫", "⭐", "✨", "🌟", "💖"].map((e, i) => (
            <span
              key={i}
              className="text-2xl animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              {e}
            </span>
          ))}
        </div>

        <button
          onClick={handleDismiss}
          className="w-full py-3 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-400 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" /> Continue My Journey
        </button>
      </div>
    </div>
  );
}
