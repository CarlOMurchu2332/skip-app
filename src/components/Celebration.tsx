'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CELEBRATION_MESSAGES = [
  { text: "Amazing work! 🌟", emoji: "🌟" },
  { text: "You smashed it! 🚛💪", emoji: "🚛" },
  { text: "Brilliant job today! 🏆", emoji: "🏆" },
  { text: "Fantastic work! ⭐", emoji: "⭐" },
  { text: "You're a superstar! 🌠", emoji: "🌠" },
  { text: "Top class work! 👏", emoji: "👏" },
  { text: "Excellent job! 🎯", emoji: "🎯" },
  { text: "You crushed it! 💪", emoji: "💪" },
  { text: "Outstanding! 🎉", emoji: "🎉" },
  { text: "Perfect work! ✨", emoji: "✨" },
  { text: "You're on fire! 🔥", emoji: "🔥" },
  { text: "Incredible job! 🚀", emoji: "🚀" },
  { text: "Champion work! 🥇", emoji: "🥇" },
  { text: "Absolutely brilliant! 💎", emoji: "💎" },
  { text: "You nailed it! 🎪", emoji: "🎪" },
  { text: "Awesome job! 🎊", emoji: "🎊" },
  { text: "Keep it up! 🌈", emoji: "🌈" },
  { text: "Legendary work! ⚡", emoji: "⚡" },
  { text: "You're the best! 👑", emoji: "👑" },
  { text: "Mission accomplished! 🎖️", emoji: "🎖️" }
];

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  duration: number;
  delay: number;
}

export default function Celebration() {
  const [message] = useState(() => 
    CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)]
  );
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    // Generate confetti pieces
    const pieces: ConfettiPiece[] = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 0.5,
      });
    }
    setConfetti(pieces);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-4 relative overflow-hidden">
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 rounded-sm animate-fall"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
            animation: `fall ${piece.duration}s linear ${piece.delay}s infinite`,
          }}
        />
      ))}

      {/* Content */}
      <div className="text-center relative z-10">
        <div className="text-9xl mb-6 animate-bounce">
          {message.emoji}
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 animate-pulse">
          Job Completed!
        </h1>
        <p className="text-3xl text-green-200 mb-2 font-semibold">
          {message.text}
        </p>
        <p className="text-xl text-green-300 mb-8">
          Docket sent to office ✅
        </p>
        
        <Link 
          href="/driver/jobs"
          className="inline-block px-8 py-4 bg-white text-green-900 rounded-xl text-xl font-bold hover:bg-green-100 transition-all transform hover:scale-105 shadow-lg"
        >
          Back to Jobs
        </Link>

        {/* Decoration */}
        <div className="mt-8 text-6xl animate-pulse">
          🎉 🎊 🎉
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
