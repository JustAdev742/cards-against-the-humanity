import type { BlackCard } from '../game/types.ts'
import {
  answerFeatures,
  domainDistance,
  echo,
  setupFeatures,
  type CardFeatures,
  type SetupFeatures,
} from './features.ts'
import { asksASense, kindFit, senseFit } from './kinds.ts'

/**
 * What a bot finds funny, as a set of weights over things that can actually
 * be measured about a pairing. Nothing here is a lookup table of pre-scored
 * combinations: the same weights work on cards nobody has seen, including
 * both printed decks and anything added later.
 */
export interface Taste {
  /** Does the answer fit the hole grammatically. */
  fit: number
  /** Is it even the kind of thing the question asked for. */
  kind: number
  /** A prim setup with an indecent answer. The other engine of the joke. */
  clash: number
  /** Can you picture it. A named thing beats a concept nearly every time. */
  image: number
  /** How far the answer is from the setup's world. The engine of the joke. */
  contrast: number
  /** Bodily, childish. The whole register of the Family Edition. */
  gross: number
  /** Transgressive. Only the adult deck has much of it. */
  crude: number
  /** Things you can point at beat things you cannot. */
  concrete: number
  /** Short answers land harder. */
  punch: number
  /** Abstractions. Usually a negative weight. */
  abstract: number
  /** Repeating the setup's own words back at it. Usually a negative weight. */
  echo: number
  /** How much this bot wanders off the top of its own ranking. */
  chaos: number
}

export interface Personality {
  kind: string
  name: string
  /** One line, shown in the lobby so the table knows who it is playing. */
  blurb: string
  taste: Taste
}

const BASE: Taste = {
  fit: 1.1,
  kind: 2.4,
  clash: 0.9,
  image: 1.3,
  contrast: 0.7,
  gross: 0.4,
  crude: 0.35,
  concrete: 0.3,
  punch: 0.12,
  abstract: -1.1,
  echo: -0.8,
  chaos: 0.3,
}

/** The table's shared sense of humour, before anyone's personality bends it. */
export const CONSENSUS: Taste = BASE

const mix = (over: Partial<Taste>): Taste => ({ ...BASE, ...over })

/**
 * Six guests with different senses of humour. They disagree, which is the
 * point: a table where every bot plays the same card is not a game.
 */
export const PERSONALITIES: Personality[] = [
  {
    kind: 'bex',
    name: 'Bex',
    blurb: 'Goes straight for the rudest thing in her hand.',
    taste: mix({ crude: 1.2, gross: 1, clash: 2.2, contrast: 0.5, abstract: -1.2, chaos: 0.3 }),
  },
  {
    kind: 'wendell',
    name: 'Wendell',
    blurb: 'Deadpan. Answers a lurid question with something painfully ordinary.',
    taste: mix({
      kind: 2.8, contrast: 1.4, clash: 0.1, crude: -0.5, gross: -0.2,
      punch: 0.45, image: 1.1, chaos: 0.2,
    }),
  },
  {
    kind: 'nadia',
    name: 'Nadia',
    blurb: 'Absurdist. The stranger and more specific, the better.',
    taste: mix({
      kind: 1.7, contrast: 1.5, image: 1.9, punch: -0.25, abstract: -1.4, chaos: 0.5,
    }),
  },
  {
    kind: 'ozzy',
    name: 'Ozzy',
    blurb: 'Likes a name, a number, a brand. Something you can picture.',
    taste: mix({ image: 2.1, concrete: 1.2, contrast: 0.6, punch: 0.3, abstract: -1.5, chaos: 0.25 }),
  },
  {
    kind: 'hutch',
    name: 'Hutch',
    blurb: 'Plays it straight. Whatever reads best in the sentence.',
    taste: mix({ fit: 2.4, kind: 3.2, contrast: 0.35, clash: 0.4, echo: -1, chaos: 0.15 }),
  },
  {
    kind: 'pip',
    name: 'Pip',
    blurb: 'Chaotic. Often wrong, occasionally perfect.',
    taste: mix({ kind: 1.4, contrast: 1, gross: 0.8, clash: 1.2, chaos: 1.1 }),
  },
]


export const personalityFor = (kind: string): Personality =>
  PERSONALITIES.find((p) => p.kind === kind) ?? PERSONALITIES[0]

/* ── Scoring one card in one hole ───────────────────────────── */

/** The measurable qualities of a pairing, before anybody's taste is applied. */
export interface Signals {
  fit: number
  kind: number
  clash: number
  image: number
  contrast: number
  gross: number
  crude: number
  concrete: number
  punch: number
  abstract: number
  echo: number
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export function signalsFor(setup: SetupFeatures, answer: CardFeatures, slot: number): Signals {
  const blank = setup.blanks[slot]

  // Grammar. "I was bitten by a _____" plus "A bear." reads "a a bear".
  let fit = 1
  if (blank?.afterArticle && answer.article === blank.afterArticle) fit -= 0.9
  else if (blank?.afterArticle && answer.article) fit -= 0.35
  if (blank?.afterArticle && answer.gerund) fit -= 0.3
  if (setup.isQuestion && answer.gerund) fit -= 0.1

  // Is it the right sort of thing at all? When the setup asked about a sense,
  // that answer counts for more than the general shape of the noun phrase.
  let kind = kindFit(setup.expect.want, answer.kinds)
  if (asksASense(setup.expect)) {
    kind = Math.max(kind * 0.55, senseFit(setup.expect, answer.text))
  }

  // A prim setup and an indecent answer. The stiffer the frame, the harder
  // the card lands — which is the whole trick the printed deck runs on.
  const prim = clamp01(setup.formal * 0.45 + setup.wholesome * 0.35)
  const rude = clamp01((answer.crude * 0.6 + answer.gross * 0.5) / 1.5)

  return {
    fit: clamp01(fit),
    kind,
    clash: prim * rude,
    image: answer.image,
    contrast: domainDistance(setup, answer),
    gross: clamp01(answer.gross / 2),
    crude: clamp01(answer.crude / 2),
    concrete: clamp01(answer.concrete / 2),
    punch: clamp01(1 - answer.length / 110),
    abstract: clamp01(answer.kinds.quality / 1.5),
    echo: echo(setup, answer),
  }
}

export function scoreWith(signals: Signals, taste: Taste): number {
  return (
    signals.fit * taste.fit +
    signals.kind * taste.kind +
    signals.clash * taste.clash +
    signals.image * taste.image +
    signals.contrast * taste.contrast +
    signals.gross * taste.gross +
    signals.crude * taste.crude +
    signals.concrete * taste.concrete +
    signals.punch * taste.punch +
    signals.abstract * taste.abstract +
    signals.echo * taste.echo
  )
}

/* ── Learning who likes what ────────────────────────────────── */

const LEARNED_KEYS = [
  'kind', 'clash', 'image', 'contrast', 'gross', 'crude', 'concrete', 'punch', 'abstract', 'echo',
] as const
type LearnedKey = (typeof LEARNED_KEYS)[number]

/**
 * What a bot has worked out about one judge, from the cards that judge has
 * actually picked. Starts empty and stays small — it nudges a taste rather
 * than replacing it, so a bot never entirely stops being itself.
 */
export type JudgeModel = Partial<Record<LearnedKey, number>>

const LEARNING_RATE = 0.5
const LIMIT = 1.2

/**
 * Folds one result into what we think a judge likes. The winning card is
 * compared with the cards that lost, so the update is about what set the
 * winner apart rather than what every card happened to have.
 */
export function learnFrom(
  model: JudgeModel,
  card: BlackCard,
  winner: string[],
  losers: string[][],
): JudgeModel {
  if (losers.length === 0) return model
  const setup = setupFeatures(card)
  const of = (cards: string[]) => {
    const parts = cards.map((c, i) => signalsFor(setup, answerFeatures(c), i))
    const mean = (key: LearnedKey) =>
      parts.reduce((sum, s) => sum + s[key], 0) / Math.max(1, parts.length)
    return mean
  }

  const won = of(winner)
  const lostMeans = losers.map(of)
  const next: JudgeModel = { ...model }

  for (const key of LEARNED_KEYS) {
    const lost = lostMeans.reduce((sum, m) => sum + m(key), 0) / lostMeans.length
    const gap = won(key) - lost
    const current = next[key] ?? 0
    next[key] = Math.max(-LIMIT, Math.min(LIMIT, current + LEARNING_RATE * gap))
  }
  return next
}

/** A taste bent towards what one particular judge has been rewarding. */
export function tasteForJudge(taste: Taste, model: JudgeModel | undefined): Taste {
  if (!model) return taste
  const bent = { ...taste }
  for (const key of LEARNED_KEYS) {
    const learned = model[key]
    if (learned !== undefined) bent[key] = bent[key] + learned
  }
  return bent
}

/* ── Choosing what to play ──────────────────────────────────── */

/** Softmax pick over the best few, so a bot is not the same every round. */
function pick<T>(ranked: { item: T; score: number }[], chaos: number, rand: () => number): T {
  const top = ranked.slice(0, Math.max(2, Math.min(5, ranked.length)))
  if (chaos <= 0.01 || top.length === 1) return top[0].item
  // Chaos is a share of the spread, not an absolute number of points. Without
  // that, adding a heavily weighted signal quietly turns every bot deterministic
  // and the whole table plays the same card.
  const spread = top[0].score - top[top.length - 1].score
  const temp = Math.max(0.05, chaos * Math.max(0.15, spread))
  const weights = top.map((r) => Math.exp((r.score - top[0].score) / temp))
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rand() * total
  for (let i = 0; i < top.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return top[i].item
  }
  return top[0].item
}

/**
 * Picks the cards to play, in the order the Czar will read them.
 *
 * For a Pick 2 or Pick 3 the holes are filled together rather than one at a
 * time, because the joke is the combination: two answers from the same world
 * usually read as one flat idea, so a spread is worth points.
 */
export function chooseCards(
  card: BlackCard,
  hand: string[],
  taste: Taste,
  model: JudgeModel | undefined,
  rand: () => number = Math.random,
): string[] {
  const need = Math.min(card.p, hand.length)
  if (need === 0) return []
  const setup = setupFeatures(card)
  const bent = tasteForJudge(taste, model)

  const rankFor = (slot: number) =>
    hand
      .map((text) => ({
        item: text,
        score: scoreWith(signalsFor(setup, answerFeatures(text), slot), bent),
      }))
      .sort((a, b) => b.score - a.score)

  if (need === 1) return [pick(rankFor(0), bent.chaos, rand)]

  // Fill the first hole, then the rest from what is left, rewarding answers
  // that do not come from the same world as the ones already down.
  const chosen: string[] = []
  for (let slot = 0; slot < need; slot++) {
    const remaining = hand.filter((c) => !chosen.includes(c))
    if (remaining.length === 0) break
    const ranked = remaining
      .map((text) => {
        const features = answerFeatures(text)
        const base = scoreWith(signalsFor(setup, features, slot), bent)
        const spread = chosen.length
          ? Math.min(...chosen.map((c) => domainDistance(answerFeatures(c), features)))
          : 0
        return { item: text, score: base + spread * 0.6 }
      })
      .sort((a, b) => b.score - a.score)
    chosen.push(pick(ranked, bent.chaos, rand))
  }
  return chosen
}

/** Which submission a bot laughs at most. */
export function judge(
  card: BlackCard,
  submissions: { playerId: string; cards: string[] }[],
  taste: Taste,
  rand: () => number = Math.random,
): string {
  const setup = setupFeatures(card)
  const ranked = submissions
    .map((submission) => {
      const scores = submission.cards.map((text, slot) =>
        scoreWith(signalsFor(setup, answerFeatures(text), slot), taste),
      )
      const mean = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)
      // A Pick 2 whose halves are unrelated is doing something on purpose.
      const spread =
        submission.cards.length > 1
          ? domainDistance(answerFeatures(submission.cards[0]), answerFeatures(submission.cards[1]))
          : 0
      return { item: submission.playerId, score: mean + spread * 0.4 }
    })
    .sort((a, b) => b.score - a.score)

  return pick(ranked, taste.chaos * 0.6, rand)
}
