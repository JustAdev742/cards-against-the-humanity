import { test } from 'node:test'
import assert from 'node:assert/strict'

import blackCards from '../src/data/black.json' with { type: 'json' }
import whiteCards from '../src/data/white.json' with { type: 'json' }
import familyBlack from '../src/data/family-black.json' with { type: 'json' }
import familyWhite from '../src/data/family-white.json' with { type: 'json' }
import { PERSONALITIES, CONSENSUS, chooseCards, scoreWith, signalsFor } from '../src/bots/taste.ts'
import { answerFeatures, setupFeatures } from '../src/bots/features.ts'
import { FRAME_PATTERNS } from '../src/bots/kinds.ts'
import type { BlackCard } from '../src/game/types.ts'

/**
 * A held-out set of judgements, not a scoring rubric.
 *
 * Measuring a bot by how often it beats a random player is circular when the
 * judge is another bot running the same scorer — they agree by construction.
 * So these are pairings where a person's pick is not really in doubt: a real
 * setup, the card that obviously lands, and cards from the same deck that
 * obviously do not.
 *
 * The bar is top-1: the intended card must outscore every distractor. If a
 * change to the model drops one of these, the change was wrong. Nothing in
 * the model is allowed to special-case a card that appears here.
 */
interface Case {
  /** What makes this a test rather than an opinion. */
  why: string
  card: BlackCard
  best: string
  flat: string[]
  family?: true
}

const CASES: Case[] = [
  /* ── The hole asks for a kind of thing ──────────────────────── */
  {
    why: 'a question about a sound wants something that makes a noise',
    card: { t: 'What’s that sound?', p: 1 },
    best: 'A fart so powerful that it wakes the giants from their thousand-year slumber.',
    flat: ['The Pope.', 'Website.', 'White privilege.', 'Shame.'],
  },
  {
    why: 'a question about a smell wants something that has one',
    card: { t: 'What’s that smell?', p: 1 },
    best: 'Boogers.',
    flat: [
      'A live studio audience.',
      'The illusion of choice in a late-stage capitalist society.',
      'Magnets.',
    ],
  },
  {
    why: 'the same celebrity that answers nothing above is exactly right here',
    card: { t: 'Coming soon! Batman vs. _.', p: 1 },
    best: 'Former President George W. Bush.',
    flat: ['Shame.', 'Hope.', 'White privilege.', 'Complaining.'],
    family: true,
  },
  {
    why: '“Ask me anything” wants somebody, not something',
    card: { t: 'Hey Reddit! I’m _. Ask me anything.', p: 1 },
    best: 'The Hamburglar.',
    flat: ['Website.', 'Complaining.', 'Pretending to care.', 'Shame.'],
  },
  {
    why: '“and now I’m ___” wants what you have become',
    card: {
      t: 'My name is Peter Parker. I was bitten by a radioactive spider, and now I’m _.',
      p: 1,
    },
    best: 'A sorry excuse for a father.',
    flat: ['Website.', 'Magnets.', 'Hope.', 'Silence.'],
  },
  {
    why: 'a bathroom you are warned about contains a thing, not a concept',
    card: { t: 'Dude, do not go in that bathroom. There’s _ in there.', p: 1 },
    best: 'Many bats.',
    flat: [
      'Shame.',
      'White privilege.',
      'The illusion of choice in a late-stage capitalist society.',
      'Hope.',
    ],
  },
  {
    why: 'airport security confiscates objects, not attitudes',
    card: { t: 'TSA guidelines now prohibit _ on airplanes.', p: 1 },
    best: 'Many bats.',
    flat: ['Pretending to care.', 'Complaining.', 'Hope.', 'Shame.'],
  },
  {
    why: 'a snack slogan wants something you could put in your mouth',
    card: { t: '_. Betcha can’t have just one!', p: 1 },
    best: 'Boneless buffalo wings.',
    flat: [
      'White privilege.',
      'Crippling debt.',
      'The illusion of choice in a late-stage capitalist society.',
    ],
  },
  {
    why: '“high on ___” wants something you could be high on',
    card: { t: 'Kids, I don’t need drugs to get high. I’m high on _.', p: 1 },
    best: 'Hot cheese.',
    flat: ['Complaining.', 'A positive attitude!', 'Pretending to care.'],
  },
  {
    why: '“because of ___” wants a cause, not a noun you happen to hold',
    card: { t: 'I’m sorry, Professor, but I couldn’t complete my homework because of _.', p: 1 },
    best: 'A fart so powerful that it wakes the giants from their thousand-year slumber.',
    flat: ['Website.', 'Silence.', 'Hope.'],
  },
  {
    why: '“How did I ___” wants something that happened',
    card: { t: 'How did I lose my virginity?', p: 1 },
    best: 'Seeing what happens when you lock people in a room with hungry seagulls.',
    flat: ['Hope.', 'Shame.', 'Website.', 'Silence.'],
  },
  {
    why: 'an award is given for doing something',
    card: { t: 'And the Academy Award for _ goes to _.', p: 2 },
    best: 'Laying an egg.',
    flat: ['Shame.', 'Hope.', 'Website.', 'Magnets.'],
  },
  {
    why: 'a numbered plan is made of things you do',
    card: { t: 'Step 1: _. Step 2: _. Step 3: Profit.', p: 2 },
    best: 'Doing crimes.',
    flat: ['Shame.', 'Daddy issues.', 'White privilege.', 'Crippling debt.'],
  },

  /* ── Register clash is the engine of the joke ───────────────── */
  {
    why: 'a wholesome family frame wants the card that ruins it',
    card: { t: 'It’s a pity that kids these days are all getting involved with _.', p: 1 },
    best: 'Seeing Grandma naked.',
    flat: ['Website.', 'Magnets.', 'Complaining.', 'Hope.'],
  },
  {
    why: 'grandma finding it charming means it has to be undignified first',
    card: { t: 'What would grandma find disturbing, yet oddly charming?', p: 1 },
    best: 'Covering myself with Parmesan cheese and chili flakes because I am pizza.',
    flat: ['Crippling debt.', 'White privilege.', 'Shame.', 'Doing crimes.'],
  },
  {
    why: 'a superhero’s guilty pleasure is a specific embarrassing activity',
    card: { t: 'What is Batman’s guilty pleasure?', p: 1 },
    best: 'Getting naked and watching Nickelodeon.',
    flat: ['A crucifixion.', 'Shame.', 'Complaining.', 'Hope.'],
  },
  {
    why: 'a pun on a real object beats any abstraction',
    card: { t: 'Introducing X-treme Baseball! It’s like baseball, but with _!', p: 1 },
    best: 'Many bats.',
    flat: ['Complaining.', 'Shame.', 'Pretending to care.', 'White privilege.'],
  },

  /* ── The Family Edition plays by the same rules ─────────────── */
  {
    why: 'a kid’s question about where babies come from wants a picture',
    card: { t: 'Where do babies come from?', p: 1 },
    best: 'A cloud that rains diarrhea.',
    flat: ['Acting kinda sus.', 'Going night-night.', 'Beautiful Grandma.'],
    family: true,
  },
  {
    why: 'a gorilla who loves something loves a thing, not a feeling',
    card: { t: 'MY NAME CHUNGO. CHUNGO LOVE _.', p: 1 },
    best: 'Mom’s spaghetti.',
    flat: ['Acting kinda sus.', 'Going night-night.', 'Beautiful Grandma.'],
    family: true,
  },
  {
    why: 'what the aliens want should be something they could take away',
    card: { t: 'The aliens are here. They want _.', p: 1 },
    best: 'Butts of all shapes and sizes.',
    flat: ['Acting kinda sus.', 'Going night-night.', 'Beautiful Grandma.'],
    family: true,
  },
]

/* ── The benchmark has to be made of real cards ─────────────── */

test('every card in the benchmark is one that ships in a deck', () => {
  const black = new Set(
    [...(blackCards as BlackCard[]), ...(familyBlack as BlackCard[])].map((c) => c.t),
  )
  const white = new Set([...(whiteCards as string[]), ...(familyWhite as string[])])
  const missing: string[] = []
  for (const c of CASES) {
    if (!black.has(c.card.t)) missing.push(`black: ${c.card.t}`)
    for (const answer of [c.best, ...c.flat])
      if (!white.has(answer)) missing.push(`white: ${answer}`)
  }
  assert.deepEqual(missing, [], 'a benchmark made of invented cards proves nothing')
})

/* ── The measurement ────────────────────────────────────────── */

function rank(card: BlackCard, answers: string[], taste = CONSENSUS) {
  const setup = setupFeatures(card)
  return answers
    .map((text) => ({ text, score: scoreWith(signalsFor(setup, answerFeatures(text), 0), taste) }))
    .sort((a, b) => b.score - a.score)
}

test('the model picks the card a person would, on every held-out pairing', () => {
  const missed: string[] = []
  for (const { why, card, best, flat } of CASES) {
    const ranked = rank(card, [best, ...flat])
    if (ranked[0].text !== best) {
      missed.push(
        `  ${card.t}\n    wanted: ${best}\n    picked: ${ranked[0].text}\n    because: ${why}`,
      )
    }
  }
  assert.equal(
    missed.length,
    0,
    `${missed.length} of ${CASES.length} held-out pairings went the wrong way:\n${missed.join('\n')}`,
  )
})

test('the personalities broadly agree when the answer is obvious', () => {
  // They are entitled to their own taste, but not to the point of missing the
  // joke: on cases this clear, most of the table should land on the same card.
  const weak: string[] = []
  for (const { card, best, flat } of CASES) {
    const agree = PERSONALITIES.filter((p) => rank(card, [best, ...flat], p.taste)[0].text === best)
    if (agree.length < 4) {
      weak.push(
        `  ${card.t} — only ${agree.length}/6 (${agree.map((p) => p.name).join(', ') || 'nobody'})`,
      )
    }
  }
  assert.equal(weak.length, 0, `too much disagreement on obvious cards:\n${weak.join('\n')}`)
})

test('given a whole hand, a bot plays the card that lands', () => {
  // The ranking is one thing, what comes out of chooseCards is another: that
  // adds the softmax. Deterministic pick, so this is about belief not dice.
  const top = () => 0
  const missed: string[] = []
  for (const { card, best, flat } of CASES) {
    const played = chooseCards(card, [...flat, best], CONSENSUS, undefined, top)
    if (played[0] !== best) missed.push(`  ${card.t}\n    played: ${played[0]} (wanted ${best})`)
  }
  assert.equal(
    missed.length,
    0,
    `played the wrong card ${missed.length} times:\n${missed.join('\n')}`,
  )
})

/* ── Guarding against a lookup table in disguise ────────────── */

test('every frame is ordinary English, not a rule about one card', () => {
  // A frame that fires on a single printed card is not a frame, it is that
  // card's answer written into the model. Each one has to earn its place by
  // describing a shape the decks use more than once.
  const setups = [...(blackCards as BlackCard[]), ...(familyBlack as BlackCard[])].map((c) => c.t)
  const narrow = FRAME_PATTERNS.map(({ name, test: pattern }) => ({
    name,
    on: setups.filter((t) => pattern.test(t)).length,
  })).filter((f) => f.on < 2)
  assert.deepEqual(narrow, [], 'these frames match too few cards to be general')
})

test('the benchmark cards get no special treatment anywhere in the model', () => {
  // If the model recognised the test cards by name, paraphrasing one would
  // collapse its score. The wording changes, the judgement should not.
  const reworded: { from: BlackCard; to: BlackCard }[] = [
    {
      from: { t: 'What’s that sound?', p: 1 },
      to: { t: 'Hey, what is that noise coming from the basement?', p: 1 },
    },
    {
      from: { t: 'TSA guidelines now prohibit _ on airplanes.', p: 1 },
      to: { t: 'Airport security has banned _ from the terminal.', p: 1 },
    },
    {
      from: { t: 'How did I lose my virginity?', p: 1 },
      to: { t: 'How did I end up in the hospital?', p: 1 },
    },
  ]
  for (const { from, to } of reworded) {
    const original = CASES.find((c) => c.card.t === from.t)!
    const answers = [original.best, ...original.flat]
    assert.equal(
      rank(to, answers)[0].text,
      original.best,
      `rewording "${from.t}" as "${to.t}" changed the answer, so the model knew the card rather than the sentence`,
    )
  }
})
