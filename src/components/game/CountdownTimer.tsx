'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  isRunning: boolean;
  onTick?: (secondsLeft: number) => void;
  onComplete?: () => void;
  className?: string;
  textClassName?: string;
}

export function CountdownTimer({
  initialSeconds,
  isRunning,
  onTick,
  onComplete,
  className,
  textClassName
}: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) {
      if (isRunning && secondsLeft <= 0 && onComplete) {
        onComplete();
      }
      return;
    }

    const timerId = setInterval(() => {
      setSecondsLeft((prevSeconds) => {
        const newSeconds = prevSeconds - 1;
        if (onTick) {
          onTick(newSeconds);
        }
        if (newSeconds <= 0) {
          clearInterval(timerId);
          if (onComplete) {
            onComplete();
          }
          return 0;
        }
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isRunning, secondsLeft, onTick, onComplete]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`text-center p-2 rounded-lg shadow-md bg-card ${className}`}>
      <p className={`text-4xl font-mono font-bold text-primary ${textClassName}`}>
        {formatTime(secondsLeft)}
      </p>
    </div>
  );
}
