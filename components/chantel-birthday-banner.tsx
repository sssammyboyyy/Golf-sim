'use client';
import { useState, useEffect } from 'react';

export function ChantelBirthdayBanner() {
  const [isBirthday, setIsBirthday] = useState(false);

  useEffect(() => {
    const today = new Date();
    // JavaScript months are 0-indexed: 3 = April
    if (today.getMonth() === 3 && today.getDate() === 2) {
      setIsBirthday(true);
    }
  }, []);

  if (!isBirthday) return null;

  return (
    <div className="bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500 py-3 px-8 text-white text-center font-bold text-sm md:text-base animate-in slide-in-from-top duration-700 shadow-lg shadow-rose-900/10 border-b border-rose-400/20">
      <div className="max-w-[1600px] mx-auto flex items-center justify-center gap-3">
        <span className="text-xl md:text-2xl animate-bounce">🎉</span>
        <span className="tracking-wide drop-shadow-sm">
          Happy Birthday Chantel! 🎂 Wishing you the absolute best day today!
        </span>
        <span className="text-xl md:text-2xl animate-pulse">✨</span>
      </div>
    </div>
  );
}
