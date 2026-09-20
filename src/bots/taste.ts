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
  /** Is it even the kind of thing the question asked for. A floor, not a
   *  target: see the gate in signalsFor for why that distinction matters. */
  kind: number
  /** A prim setup with an indecent answer. The other engine of the joke. */
  clash: number
  /** How much of a picture it paints. Detail is an asset, not a cost. */
  vivid: number
  /** How far the answer travels inside itself. An octopus smoking a cigarette
   *  is two ideas colliding; "A mistake." is none. */
  twist: number
  /** Something alive turning up where a thing was expected. */
  alive: number
  /** How far the answer is from the setup's world. The engine of the joke. */
  contrast: number
  /** Bodily, childish. The whole register of the Family Edition. */
  gross: number
  /** Transgressive. Only the adult deck has much of it. */
  crude: number
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
  kind: 1.5,
  clash: 1.8,
  vivid: 1.9,
  twist: 1.2,
  alive: 0.35,
  contrast: 0.7,
  gross: 0.4,
  crude: 0.4,
  abstract: -1.3,
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
    taste: mix({ crude: 1.4, gross: 1.1, clash: 2.4, vivid: 1.5, contrast: 0.5, chaos: 0.3 }),
  },
  {
    kind: 'wendell',
    name: 'Wendell',
    blurb: 'Deadpan. Answers a lurid question with something painfully ordinary.',
    taste: mix({
      kind: 2.2, contrast: 1.5, clash: 0.2, crude: -0.4, gross: -0.2,
      vivid: 1.2, twist: 0.5, chaos: 0.2,
    }),
  },
  {
    kind: 'nadia',
    name: 'Nadia',
    blurb: 'Absurdist. The stranger and more specific, the better.',
    taste: mix({ vivid: 2.8, twist: 2.4, contrast: 1.4, kind: 1.1, abstract: -1.6, chaos: 0.5 }),
  },
  {
    kind: 'ozzy',
    name: 'Ozzy',
    blurb: 'Likes a name, a number, a brand. Something you can picture.',
    taste: mix({ vivid: 2.9, twist: 1, contrast: 0.6, abstract: -1.7, chaos: 0.25 }),
  },
  {
    kind: 'hutch',
    name: 'Hutch',
    blurb: 'Plays it straight. Whatever reads best in the sentence.',
    taste: mix({ fit: 2.4, kind: 2.4, vivid: 1.4, contrast: 0.35, echo: -1, chaos: 0.15 }),
  },
  {
    kind: 'pip',
    name: 'Pip',
    blurb: 'Chaotic. Often wrong, occasionally perfect.',
    taste: mix({ kind: 1, twist: 1.8, gross: 0.9, clash: 1.3, vivid: 1.6, chaos: 1.1 }),
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
  vivid: number
  twist: number
  alive: number
  contrast: number
  gross: number
  crude: number
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
  // Answering the question is a floor to clear, not a prize to maximise. Left
  // as a straight score it makes the blandest card that fits win every round —
  // "Betcha can't have just one! — Boneless buffalo wings." is the right sort
  // of thing and no joke at all. So it saturates: past the gate, being even
  // more on-topic earns nothing, and the funny signals decide.
  const clears = clamp01((kind - 0.15) / 0.35)

  // A prim setup and an indecent answer. The stiffer the frame, the harder
  // the card lands — which is the whole trick the printed deck runs on.
  // An advert is a voice putting on a smile, which makes it every bit as
  // ruinable as a school assembly — so a promotional frame counts as prim.
  const prim = clamp01(
    setup.formal * 0.45 + setup.wholesome * 0.35 + (setup.expect.promotional ? 0.55 : 0),
  )
  // Rude is not only bodily. A crucifixion in a snack advert does the same
  // work as a fart in one, and the deck uses both.
  const rude = clamp01((answer.crude * 0.6 + answer.gross * 0.5 + answer.taboo * 0.8) / 1.2)

  return {
    fit: clamp01(fit),
    kind: clears,
    clash: prim * rude,
    vivid: answer.image,
    twist: clamp01((answer.domainsTouched - 1) / 2),
    // Something with a pulse, where the sentence was expecting an object.
    // An audience in the bathroom and a sperm whale on an aeroplane are the
    // same joke, and it is not one the other signals can see.
    alive: clamp01(answer.kinds.person / 1.1) * clamp01(setup.expect.want.object / 2),
    contrast: domainDistance(setup, answer),
    gross: clamp01(answer.gross / 2),
    crude: clamp01(answer.crude / 2),
    abstract: clamp01(answer.kinds.quality / 1.5),
    echo: echo(setup, answer),
  }
}

export function scoreWith(signals: Signals, taste: Taste): number {
  return (
    signals.fit * taste.fit +
    signals.kind * taste.kind +
    signals.clash * taste.clash +
    signals.vivid * taste.vivid +
    signals.twist * taste.twist +
    signals.alive * taste.alive +
    signals.contrast * taste.contrast +
    signals.gross * taste.gross +
    signals.crude * taste.crude +
    signals.abstract * taste.abstract +
    signals.echo * taste.echo
  )
}

/* ── Learning who likes what ────────────────────────────────── */

const LEARNED_KEYS = [
  'kind', 'clash', 'vivid', 'twist', 'alive', 'contrast', 'gross', 'crude', 'abstract', 'echo',
] as const
type LearnedKey = (typeof LEARNED_KEYS)[number]

/**
 * What a bot has worked out about one judge, from the cards that judge has
 * actually picked. Starts empty and stays small — it nudges a taste rather
 * than replacing it, so a bot never entirely stops being itself.
 */
export type JudgeModel = Partial<Record<LearnedKey, number>>

const LEARNING_RATE = 0.55
/**
 * How far watching a judge can bend a bot's taste. It has to stay in
 * proportion to the weights in BASE — set too low next to a heavily weighted
 * signal, a bot's own preferences drown out everything it has learned.
 */
export const LEARNING_LIMIT = 1.9

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
    next[key] = Math.max(-LEARNING_LIMIT, Math.min(LEARNING_LIMIT, current + LEARNING_RATE * gap))
  }
  return next
}

/**
 * A taste bent towards what one particular judge has been rewarding.
 *
 * A flat offset, deliberately: scaling the nudge by how much the bot already
 * cares about that dimension was measured against this and made no difference
 * worth the extra moving part.
 */
export function tasteForJudge(taste: Taste, model: JudgeModel | undefined): Taste {
  if (!model) return taste
  const bent = { ...taste }
  for (const key of LEARNED_KEYS) {
    const learned = model[key]
    if (learned === undefined) continue
    bent[key] = bent[key] + learned
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
