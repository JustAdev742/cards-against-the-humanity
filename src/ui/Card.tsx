import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

import type { BlackCard } from "../game/types.ts";

/**
 * Card text is set the way the printed deck sets it: one size that fills the
 * card. Long copy steps down rather than overflowing, so a five-line card and
 * a one-word card both read as the same object.
 */
function sizeFor(text: string, scale: string): string {
  const n = text.length;
  const step =
    n > 150 ? 0.52 : n > 110 ? 0.62 : n > 75 ? 0.74 : n > 45 ? 0.86 : 1;
  return `calc(${scale} * ${step})`;
}

/** Strips the full stop off an answer that is being dropped into a sentence. */
function inline(answer: string): string {
  return answer.endsWith(".") && !answer.endsWith("..")
    ? answer.slice(0, -1)
    : answer;
}

/**
 * Renders a black card, filling its blanks with whatever has been played.
 * A card with no blank is a question: its answers are shown after the text.
 */
export function BlackCardText({
  card,
  fills,
}: {
  card: BlackCard;
  fills?: string[];
}) {
  const parts = card.t.split("_");
  const answers = fills ?? [];

  if (parts.length === 1) {
    return (
      <span>
        {card.t}
        {answers.length > 0 && (
          <>
            {" "}
            <span className="blank-filled">
              {answers.map(inline).join(" ")}
            </span>
          </>
        )}
      </span>
    );
  }

  return (
    <span>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 &&
            (answers[index] ? (
              <span className="blank-filled">{inline(answers[index])}</span>
            ) : (
              <span className="blank" aria-label="blank" />
            ))}
        </span>
      ))}
    </span>
  );
}

/** A plain-text version of a filled card, for screen readers and labels. */
export function blackCardSentence(
  card: BlackCard,
  fills: string[] = [],
): string {
  const parts = card.t.split("_");
  if (parts.length === 1) {
    return fills.length ? `${card.t} ${fills.map(inline).join(" ")}` : card.t;
  }
  return parts
    .map(
      (part, index) =>
        part +
        (index < parts.length - 1
          ? fills[index]
            ? inline(fills[index])
            : "…"
          : ""),
    )
    .join("");
}

interface CardProps {
  /** Base font size as a CSS length, before the length step is applied. */
  scale: string;
  className?: string;
  style?: CSSProperties;
  footer?: ReactNode;
}

export function WhiteCard({
  text,
  scale,
  className = "",
  style,
  footer,
}: CardProps & { text: string }) {
  return (
    <article
      className={`card-face card-white ${className}`}
      style={{ ...style, fontSize: sizeFor(text, scale) }}
    >
      <p className="m-0">{text}</p>
      {footer}
    </article>
  );
}

export function BlackCardFace({
  card,
  fills,
  scale,
  className = "",
  style,
  footer,
}: CardProps & { card: BlackCard; fills?: string[] }) {
  return (
    <article
      className={`card-face card-black ${className}`}
      style={{ ...style, fontSize: sizeFor(card.t, scale) }}
    >
      <p className="m-0">
        <BlackCardText card={card} fills={fills} />
      </p>
      <div className="flex items-end justify-between gap-4">
        {/* Always two children, so the Pick badge stays on the right. */}
        <span>{footer}</span>
        {card.p > 1 && (
          <span className="label flex shrink-0 items-center gap-[0.5em] text-[0.34em]! text-paper!">
            Pick
            <span
              className="grid aspect-square w-[1.6em] place-items-center rounded-full bg-paper text-ink"
              style={{ fontSize: "1.05em" }}
            >
              {card.p}
            </span>
          </span>
        )}
      </div>
    </article>
  );
}

/** The back of a card: the deck's own mark, nothing else. */
export function CardBack({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`card-back grid place-items-center ${className}`}
      style={style}
      aria-hidden
    >
      <CardMark className="w-[34%] opacity-70" />
    </div>
  );
}

/**
 * A card that actually turns over.
 *
 * Both faces are present the whole time and the element rotates in Z; the
 * hidden backface does the rest. Animating only the front, which is what this
 * used to do, shows a mirror-image white card swinging into place — the motion
 * of a flip without the object, which reads as a glitch rather than a reveal.
 *
 * The perspective belongs on the row rather than here, so that a whole hand of
 * these shares one vanishing point and reads as a table instead of a wall.
 */
export function FlipCard({
  faceUp,
  front,
  className = "",
  flipIn = false,
  delay = 0,
}: {
  faceUp: boolean;
  front: ReactNode;
  className?: string;
  /** Turn over on mount, for lists that arrive all at once rather than
   *  holding every slot open from the start. */
  flipIn?: boolean;
  /** Stagger, so a row of these turns over like a hand being laid out. */
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`relative ${className}`}
      style={{ transformStyle: "preserve-3d" }}
      initial={flipIn && !reduced ? { rotateY: 180 } : false}
      animate={
        reduced ? { opacity: faceUp ? 1 : 0.9 } : { rotateY: faceUp ? 0 : 180 }
      }
      transition={
        reduced
          ? { duration: 0.12 }
          : // Weighted rather than springy: a card has mass, and an overshoot
            // on a flip looks like the card is made of paper-thin plastic.
            { duration: 0.52, ease: [0.22, 1, 0.36, 1], delay }
      }
    >
      <div
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {faceUp || reduced ? front : null}
      </div>
      <div
        className="absolute inset-0"
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
        }}
        aria-hidden
      >
        <CardBack className="h-full w-full text-paper" />
      </div>
    </motion.div>
  );
}

/** Two cards, offset — the mark printed on the deck itself. */
export function CardMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" fill="none" className={className} aria-hidden>
      <path
        d="M13.4 5.2 3.6 8.1a2 2 0 0 0-1.4 2.5l8.3 28.2a2 2 0 0 0 2.5 1.4l3.3-1"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <rect
        x="14.5"
        y="4.2"
        width="22"
        height="37"
        rx="2.4"
        fill="currentColor"
      />
    </svg>
  );
}
