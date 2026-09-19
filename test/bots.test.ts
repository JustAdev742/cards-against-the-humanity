import { test } from 'node:test'
import assert from 'node:assert/strict'

import blackCards from '../src/data/black.json' with { type: 'json' }
import whiteCards from '../src/data/white.json' with { type: 'json' }
import familyBlack from '../src/data/family-black.json' with { type: 'json' }
import familyWhite from '../src/data/family-white.json' with { type: 'json' }
import { answerFeatures, setupFeatures, domainDistance } from '../src/bots/features.ts'
import {
  PERSONALITIES,
  chooseCards,
  judge,
  learnFrom,
  personalityFor,
  scoreWith,
  signalsFor,
  tasteForJudge,
} from '../src/bots/taste.ts'
import type { BlackCard } from '../src/game/types.ts'

const BLACK = blackCards as BlackCard[]
const WHITE = whiteCards as string[]
const FAMILY_BLACK = familyBlack as BlackCard[]
const FAMILY_WHITE = familyWhite as string[]

/** A fixed pseudo-random source, so a flaky bot cannot make a flaky test. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const deal = (deck: string[], n: number, rand: () => number) =>
  Array.from({ length: n }, () => deck[Math.floor(rand() * deck.length)])

/* ── It always plays a legal card ───────────────────────────── */

test('a bot plays cards it actually holds, the right number of them', () => {
  const rand = seeded(7)
  for (const personality of PERSONALITIES) {
    for (let i = 0; i < 60; i++) {
      const card = BLACK[Math.floor(rand() * BLACK.length)]
      const hand = deal(WHITE, 10, rand)
      const played = chooseCards(card, hand, personality.taste, undefined, rand)

      assert.equal(played.length, card.p, `${personality.name} played the wrong number`)
      assert.equal(new Set(played).size, played.length, 'the same card cannot fill two holes')
      const pool = hand.slice()
      for (const c of played) {
        const at = pool.indexOf(c)
        assert.notEqual(at, -1, `${personality.name} played a card it does not hold: ${c}`)
        pool.splice(at, 1)
      }
    }
  }
})

test('a bot copes with both decks and with a nearly empty hand', () => {
  const rand = seeded(11)
  for (const card of [...BLACK.slice(0, 20), ...FAMILY_BLACK.slice(0, 20)]) {
    const deck = FAMILY_BLACK.includes(card) ? FAMILY_WHITE : WHITE
    for (const size of [1, 2, 3]) {
      const hand = deal(deck, size, rand)
      const played = chooseCards(card, hand, PERSONALITIES[0].taste, undefined, rand)
      assert.equal(played.length, Math.min(card.p, size))
      assert.ok(played.every((c) => hand.includes(c)))
    }
  }
})

/* ── It reads the sentence ──────────────────────────────────── */

test('it avoids answers that would read "a a bear"', () => {
  // "I was bitten by a _____" wants "Bear", not "A bear."
  const card: BlackCard = { t: 'I was bitten by a _.', p: 1 }
  const setup = setupFeatures(card)
  const doubled = scoreWith(signalsFor(setup, answerFeatures('A bear.'), 0), PERSONALITIES[4].taste)
  const clean = scoreWith(signalsFor(setup, answerFeatures('Bees?'), 0), PERSONALITIES[4].taste)
  assert.ok(clean > doubled, 'the grammatical one should win on a taste that cares about fit')
})

test('it prefers an answer from a different world to the setup', () => {
  const card: BlackCard = { t: 'This season at the school science fair: _.', p: 1 }
  const setup = setupFeatures(card)
  const sameWorld = answerFeatures('My homework.')
  const otherWorld = answerFeatures('A cloud that rains diarrhea.')
  assert.ok(
    domainDistance(setup, otherWorld) > domainDistance(setup, sameWorld),
    'a card about school is closer to a school setup than a card about bodily disaster',
  )
})

test('it does not just parrot the setup back', () => {
  const card: BlackCard = { t: 'What is Batman’s guilty pleasure?', p: 1 }
  const setup = setupFeatures(card)
  const taste = PERSONALITIES[4].taste
  const parrot = scoreWith(signalsFor(setup, answerFeatures('Batman.'), 0), taste)
  const notParrot = scoreWith(signalsFor(setup, answerFeatures('Boneless buffalo wings.'), 0), taste)
  assert.ok(notParrot > parrot, 'echoing the setup should cost something')
})

/* ── They are not the same bot ──────────────────────────────── */

test('different personalities reach for different cards', () => {
  const card: BlackCard = { t: 'What ended my last relationship? _', p: 1 }
  const hand = [
    'My genitals.',
    'Bees?',
    'A supportive touch on the lower back.',
    'The Hamburglar.',
    'Crippling debt.',
    'Fiery poops.',
    'Object permanence.',
    'Nicolas Cage.',
    'Hope.',
    'A really cool hat.',
  ]
  const picks = new Map<string, string>()
  for (const p of PERSONALITIES) {
    picks.set(p.name, chooseCards(card, hand, p.taste, undefined, seeded(3))[0])
  }
  assert.ok(new Set(picks.values()).size >= 3, `too much agreement: ${[...picks.values()]}`)

  // And the rude one should go for the rude card more often than the deadpan one.
  const rude = (kind: string) => {
    let hits = 0
    for (let i = 0; i < 40; i++) {
      const played = chooseCards(card, hand, personalityFor(kind).taste, undefined, seeded(i))
      if (played[0] === 'My genitals.') hits++
    }
    return hits
  }
  assert.ok(rude('bex') > rude('wendell'), 'Bex should reach for it more often than Wendell')
})

test('a bot does not play the identical card every single round', () => {
  const card: BlackCard = { t: 'Why am I sticky? _', p: 1 }
  const hand = deal(WHITE, 10, seeded(5))
  const seen = new Set<string>()
  for (let i = 0; i < 30; i++) {
    seen.add(chooseCards(card, hand, personalityFor('pip').taste, undefined, seeded(i))[0])
  }
  assert.ok(seen.size > 1, 'a chaotic bot should vary')
})

/* ── Pick 2 and Pick 3 ──────────────────────────────────────── */

test('a Pick 2 gets two different cards, in the order they are read', () => {
  const rand = seeded(21)
  const card = BLACK.find((c) => c.p === 2)!
  for (let i = 0; i < 30; i++) {
    const hand = deal(WHITE, 10, rand)
    const played = chooseCards(card, hand, PERSONALITIES[2].taste, undefined, rand)
    assert.equal(played.length, 2)
    assert.notEqual(played[0], played[1])
  }
})

/* ── Judging ────────────────────────────────────────────────── */

test('a bot judge picks one of the cards actually in front of it', () => {
  const rand = seeded(31)
  for (let i = 0; i < 40; i++) {
    const card = BLACK[Math.floor(rand() * BLACK.length)]
    const submissions = ['a', 'b', 'c', 'd'].map((playerId) => ({
      playerId,
      cards: deal(WHITE, card.p, rand),
    }))
    const winner = judge(card, submissions, PERSONALITIES[1].taste, rand)
    assert.ok(submissions.some((s) => s.playerId === winner), 'the winner has to be at the table')
  }
})

/* ── It learns who it is playing with ───────────────────────── */

test('a bot works out that a judge keeps picking the gross card', () => {
  const card: BlackCard = { t: 'What is that smell? _', p: 1 }
  let model = {}
  // This judge rewards the bodily answer, four rounds running.
  for (let round = 0; round < 4; round++) {
    model = learnFrom(model, card, ['Fiery poops.'], [['Hope.'], ['Object permanence.']])
  }
  // Wendell dislikes the bodily card by default, which makes him the one to
  // watch: if he changes his mind, it is the evidence that did it.
  const wendell = personalityFor('wendell').taste
  const learned = tasteForJudge(wendell, model)
  assert.ok(learned.gross > wendell.gross, 'it should have noticed what this judge likes')

  // Take the top of each ranking rather than a sample, so this is about what
  // it now believes and not about which way the dice fell.
  const top = () => 0
  const hand = ['Hope.', 'Object permanence.', 'Fiery poops.', 'A really cool hat.']
  const naive = chooseCards(card, hand, wendell, undefined, top)
  const taught = chooseCards(card, hand, wendell, model, top)

  assert.notEqual(naive[0], 'Fiery poops.', 'Wendell would not have played it unprompted')
  assert.equal(taught[0], 'Fiery poops.', 'having watched this judge, now he would')
})

test('learning stays inside its bounds however lopsided the evidence', () => {
  const card: BlackCard = { t: 'What is that smell? _', p: 1 }
  let model = {}
  for (let round = 0; round < 200; round++) {
    model = learnFrom(model, card, ['Fiery poops.'], [['Hope.']])
  }
  for (const [key, value] of Object.entries(model)) {
    assert.ok(Math.abs(value as number) <= 1.2001, `${key} ran away to ${value}`)
  }
})

test('a bot learns nothing from a round it has no losers to compare against', () => {
  const card: BlackCard = { t: 'What is that smell? _', p: 1 }
  assert.deepEqual(learnFrom({}, card, ['Fiery poops.'], []), {})
})

/* ── The table has to disagree with itself ──────────────────── */

test('six bots dealt the same hand do not all play the same card', () => {
  // A heavily weighted signal can quietly make every bot deterministic, and
  // then the table stops being a game. This is the guard against that.
  const rand = seeded(2024)
  const rounds = 400
  let distinct = 0
  let unanimous = 0
  for (let i = 0; i < rounds; i++) {
    const card = BLACK[Math.floor(rand() * BLACK.length)]
    const hand = deal(WHITE, 10, rand)
    const picks = new Set(
      PERSONALITIES.map((p) => chooseCards(card, hand, p.taste, undefined, rand).join('|')),
    )
    distinct += picks.size
    if (picks.size === 1) unanimous++
  }
  const average = distinct / rounds
  assert.ok(average >= 2.4, `the table only found ${average.toFixed(2)} different cards out of 6`)
  assert.ok(unanimous / rounds < 0.1, `all six agreed ${((100 * unanimous) / rounds).toFixed(1)}% of the time`)
})

test('a bot still knows the difference between a good card and a bad one', () => {
  // Variety is not the same as guessing: given one obviously right answer and
  // nine abstractions, it should still find it nearly every time.
  const card: BlackCard = { t: 'What’s that smell?', p: 1 }
  const duds = ['Hope.', 'Shame.', 'Silence.', 'White privilege.', 'Complaining.',
    'Pretending to care.', 'Crippling debt.', 'Daddy issues.', 'A positive attitude!']
  let found = 0
  for (let i = 0; i < 100; i++) {
    const played = chooseCards(card, ['Boogers.', ...duds], personalityFor('hutch').taste, undefined, seeded(i))
    if (played[0] === 'Boogers.') found++
  }
  assert.ok(found >= 85, `only found the one real answer ${found} times in 100`)
})
