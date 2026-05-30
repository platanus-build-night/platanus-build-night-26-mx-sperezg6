"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

interface TypewriterProps {
  words: string[];
  speed?: number;
  delayBetweenWords?: number;
  cursor?: boolean;
  cursorChar?: string;
  className?: string;
}

export function Typewriter({
  words,
  speed = 100,
  delayBetweenWords = 2000,
  cursor = true,
  cursorChar = "|",
  className,
}: TypewriterProps) {
  const reduceMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  const currentWord = words[wordIndex] ?? "";

  // Typing / deleting loop. Skipped entirely when the user prefers reduced motion.
  useEffect(() => {
    if (reduceMotion) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < currentWord.length) {
            setDisplayText(currentWord.substring(0, charIndex + 1));
            setCharIndex(charIndex + 1);
          } else {
            const pause = setTimeout(() => setIsDeleting(true), delayBetweenWords);
            return () => clearTimeout(pause);
          }
        } else {
          if (charIndex > 0) {
            setDisplayText(currentWord.substring(0, charIndex - 1));
            setCharIndex(charIndex - 1);
          } else {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length);
          }
        }
      },
      isDeleting ? speed / 2 : speed,
    );

    return () => clearTimeout(timeout);
  }, [charIndex, currentWord, isDeleting, speed, delayBetweenWords, wordIndex, words, reduceMotion]);

  // Cursor blink.
  useEffect(() => {
    if (!cursor || reduceMotion) return;
    const cursorInterval = setInterval(() => setShowCursor((prev) => !prev), 500);
    return () => clearInterval(cursorInterval);
  }, [cursor, reduceMotion]);

  // Reduced motion: show the first phrase statically, no cursor animation.
  if (reduceMotion) {
    return <span className={className}>{words[0] ?? ""}</span>;
  }

  return (
    <span className={className}>
      {displayText}
      {cursor && (
        <span
          aria-hidden
          className="ml-0.5 inline-block font-normal text-mute transition-opacity duration-75"
          style={{ opacity: showCursor ? 1 : 0 }}
        >
          {cursorChar}
        </span>
      )}
    </span>
  );
}
