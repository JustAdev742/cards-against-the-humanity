import { test } from 'node:test'
import assert from 'node:assert/strict'

import blackCards from '../src/data/black.json' with { type: 'json' }
import whiteCards from '../src/data/white.json' with { type: 'json' }
import { PERSONALITIES, judge, personalityFor } from '../src/bots/taste.ts'
import type { BlackCard } from '../src/game/types.ts'

/**
 * Judging, measured on its own.
 *
 * The other benchmarks all test what a bot plays. Nothing tested what a bot
 * does with the Czar's job, which is the half that decides everybody else's
 * score — a bot that plays well and judges at random is worse for the table
 * than one that does neither, because it hands out points for nothing.
 */

const BLACK = blackCards as BlackCard[]
const WHITE = whiteCards as string[]

function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The same pairings the funniness benchmark uses, put in front of a judge. */
const ROUNDS: { card: BlackCard; funny: string; flat: string }[] = [
  {
    card: { t: 'TSA guidelines now prohibit _ on airplanes.', p: 1 },
    funny: 'Sperm whales.',
    flat: 'Magnets.',
  },
  {
    card: { t: 'Dude, do not go in that bathroom. There’s _ in there.', p: 1 },
    funny: 'A live studio audience.',
    flat: 'Magnets.',
  },
  {
    card: { t: 'What’s that smell?', p: 1 },
    funny: 'A fart so powerful that it wakes the giants from their thousand-year slumber.',
    flat: 'Boogers.',
  },
  {
    card: { t: 'Hey Reddit! I’m _. Ask me anything.', p: 1 },
    funny: 'An old guy who’s almost dead.',
    flat: 'A narc.',
  },
  {
    card: { t: 'How did I lose my virginity?', p: 1 },
    funny: 'An octopus giving seven handjobs and smoking a cigarette.',
    flat: 'Soft, kissy missionary sex.',
  },
  {
    card: { t: 'I’m sorry, Professor, but I couldn’t complete my homework because of _.', p: 1 },
    funny: 'Emerging from the sea and rampaging through Tokyo.',
    flat: 'Crippling debt.',
  },
  {
    card: { t: 'What would grandma find disturbing, yet oddly charming?', p: 1 },
    funny: 'Pac-Man uncontrollably guzzling cum.',
    flat: 'Full frontal nudity.',
  },
  {
    card: { t: 'What ended my last relationship?', p: 1 },
    funny: 'Floating down the Hudson River with the other garbage.',
    flat: 'A mistake.',
  },
]

/** How often a judge of this kind gives the point to the better card. */
function accuracy(kind: string, samples = 60): number {
  const taste = personalityFor(kind).taste
  let right = 0
  let total = 0
  for (const { card, funny, flat } of ROUNDS) {
    for (let i = 0; i < samples; i++) {
      const rand = seeded(i * 7919 + 13)
      // Both orders, so a judge cannot be right by always taking the first.
      const order =
        i % 2 === 0
          ? [{ playerId: 'funny', cards: [funny] }, { playerId: 'flat', cards: [flat] }]
          : [{ playerId: 'flat', cards: [flat] }, { playerId: 'funny', cards: [funny] }]
      if (judge(card, order, taste, rand) === 'funny') right++
      total++
    }
  }
  return right / total
}

test('a bot judge gives the point to the better card far more often than not', () => {
  const weak: string[] = []
  for (const p of PERSONALITIES) {
    // Pip is chaotic on purpose and is allowed to be the worst judge at the
    // table, but even he has to beat a coin toss by a clear margin.
    const floor = p.kind === 'pip' ? 0.6 : 0.75
    const score = accuracy(p.kind)
    if (score < floor) weak.push(`  ${p.name}: ${(100 * score).toFixed(0)}% (needs ${100 * floor}%)`)
  }
  assert.equal(weak.length, 0, `these judges are handing out points for nothing:\n${weak.join('\n')}`)
})

test('a judge does not just reward whoever went first', () => {
  const rand = seeded(5)
  let first = 0
  const runs = 400
  for (let i = 0; i < runs; i++) {
    const card = BLACK[Math.floor(rand() * BLACK.length)]
    const subs = ['a', 'b', 'c', 'd'].map((playerId) => ({
      playerId,
      cards: [WHITE[Math.floor(rand() * WHITE.length)]],
    }))
    if (judge(card, subs, personalityFor('hutch').taste, rand) === 'a') first++
  }
  // Four submissions, so position alone should win about a quarter of the time.
  assert.ok(first / runs < 0.4, `the first submission won ${((100 * first) / runs).toFixed(0)}% of rounds`)
})

test('the table does not have one shared verdict', () => {
  // If every Czar would pick the same winner, who is judging stops meaning
  // anything — and the learning that watches judges has nothing to watch.
  const rand = seeded(11)
  const rounds = Array.from({ length: 300 }, () => ({
    card: BLACK[Math.floor(rand() * BLACK.length)],
    subs: ['a', 'b', 'c', 'd'].map((playerId) => ({
      playerId,
      cards: [WHITE[Math.floor(rand() * WHITE.length)]],
    })),
  }))

  const pairs: { pair: string; agree: number }[] = []
  for (let i = 0; i < PERSONALITIES.length; i++) {
    for (let j = i + 1; j < PERSONALITIES.length; j++) {
      const a = PERSONALITIES[i]
      const b = PERSONALITIES[j]
      let same = 0
      rounds.forEach((r, n) => {
        if (
          judge(r.card, r.subs, a.taste, seeded(n)) === judge(r.card, r.subs, b.taste, seeded(n))
        ) {
          same++
        }
      })
      pairs.push({ pair: `${a.name} and ${b.name}`, agree: same / rounds.length })
    }
  }

  const mean = pairs.reduce((sum, p) => sum + p.agree, 0) / pairs.length
  const worst = pairs.reduce((a, b) => (a.agree > b.agree ? a : b))
  assert.ok(mean < 0.62, `judges agree on ${(100 * mean).toFixed(0)}% of rounds on average`)
  assert.ok(
    worst.agree < 0.8,
    `${worst.pair} agree on ${(100 * worst.agree).toFixed(0)}% of rounds, which makes one of them redundant`,
  )
})
