import { test } from 'node:test'
import assert from 'node:assert/strict'

import blackCards from '../src/data/black.json' with { type: 'json' }
import whiteCards from '../src/data/white.json' with { type: 'json' }
import { PERSONALITIES, CONSENSUS, scoreWith, signalsFor } from '../src/bots/taste.ts'
import { answerFeatures, setupFeatures } from '../src/bots/features.ts'
import type { BlackCard } from '../src/game/types.ts'

/**
 * The second benchmark, and the harder one.
 *
 * humour.test.ts asks whether a bot is answering the question at all — whether
 * it knows a sound is not a head of state. Passing it only makes a bot
 * literal-minded, and a literal-minded player is the worst one at this table:
 * "Betcha can't have just one! — Boneless buffalo wings." is exactly the right
 * kind of thing and not a joke at all.
 *
 * So every pairing here is between cards that are *both* the right kind of
 * thing for the hole. The only thing separating them is that one of them is
 * funny. If the model cannot tell these apart it is not playing the game, it
 * is filling in a form.
 */
interface Pair {
  why: string
  card: BlackCard
  funny: string
  /** Right kind of thing, right grammar, no joke. */
  correctButFlat: string
}

const PAIRS: Pair[] = [
  {
    why: 'a whale is contraband; a magnet is just a thing that is not allowed',
    card: { t: 'TSA guidelines now prohibit _ on airplanes.', p: 1 },
    funny: 'Sperm whales.',
    correctButFlat: 'Magnets.',
  },
  {
    why: 'a snack slogan is funny about something that is not a snack',
    card: { t: '_. Betcha can’t have just one!', p: 1 },
    funny: 'A crucifixion.',
    correctButFlat: 'Boneless buffalo wings.',
  },
  {
    why: 'an audience in the bathroom is a scene; a magnet is an object',
    card: { t: 'Dude, do not go in that bathroom. There’s _ in there.', p: 1 },
    funny: 'A live studio audience.',
    correctButFlat: 'Magnets.',
  },
  {
    why: 'both of these smell, but only one of them is doing anything',
    card: { t: 'What’s that smell?', p: 1 },
    funny: 'A fart so powerful that it wakes the giants from their thousand-year slumber.',
    correctButFlat: 'Boogers.',
  },
  {
    why: 'both are people; one of them is a picture',
    card: { t: 'Hey Reddit! I’m _. Ask me anything.', p: 1 },
    funny: 'An old guy who’s almost dead.',
    correctButFlat: 'A narc.',
  },
  {
    why: 'both are things you do; one of them is also a joke about awards',
    card: { t: 'And the Academy Award for _ goes to _.', p: 2 },
    funny: 'Laying an egg.',
    correctButFlat: 'Complaining.',
  },
  {
    why: 'both are objects; only one of them is a pun on the setup',
    card: { t: 'Introducing X-treme Baseball! It’s like baseball, but with _!', p: 1 },
    funny: 'Many bats.',
    correctButFlat: 'Magnets.',
  },
  {
    why: 'an anti-drug lecture is funnier ruined by scripture than by dairy',
    card: { t: 'Kids, I don’t need drugs to get high. I’m high on _.', p: 1 },
    funny: 'The Blood of Christ.',
    correctButFlat: 'Hot cheese.',
  },
  {
    why: 'a guilty pleasure has to be specific enough to be embarrassing',
    card: { t: 'What is Batman’s guilty pleasure?', p: 1 },
    funny: 'Getting naked and watching Nickelodeon.',
    correctButFlat: 'Complaining.',
  },
  {
    why: 'both answer the question; one of them paints the whole scene',
    card: { t: 'How did I lose my virginity?', p: 1 },
    funny: 'An octopus giving seven handjobs and smoking a cigarette.',
    correctButFlat: 'Soft, kissy missionary sex.',
  },
  {
    why: 'a homework excuse should be an excuse nobody could check',
    card: { t: 'I’m sorry, Professor, but I couldn’t complete my homework because of _.', p: 1 },
    funny: 'Emerging from the sea and rampaging through Tokyo.',
    correctButFlat: 'Crippling debt.',
  },
  {
    why: 'moral panic about kids is funnier when it is about something absurd',
    card: { t: 'It’s a pity that kids these days are all getting involved with _.', p: 1 },
    funny: 'Eating a hard boiled egg out of my husband’s asshole.',
    correctButFlat: 'Complaining.',
  },
  {
    why: 'grandma needs something bizarre to be charmed by, not just nudity',
    card: { t: 'What would grandma find disturbing, yet oddly charming?', p: 1 },
    funny: 'Pac-Man uncontrollably guzzling cum.',
    correctButFlat: 'Full frontal nudity.',
  },
  {
    why: 'what Peter Parker became should be a person, and a sad one',
    card: {
      t: 'My name is Peter Parker. I was bitten by a radioactive spider, and now I’m _.',
      p: 1,
    },
    funny: 'A sorry excuse for a father.',
    correctButFlat: 'A narc.',
  },
  {
    why: 'a thing that ends a relationship is funnier as an image than a label',
    card: { t: 'What ended my last relationship?', p: 1 },
    funny: 'Floating down the Hudson River with the other garbage.',
    correctButFlat: 'A mistake.',
  },
  {
    why: 'a moon-landing speech wants something absurd up there, not a concept',
    card: {
      t: 'My fellow Americans: Before this decade is out, we will have _ on the moon!',
      p: 1,
    },
    funny: 'An octopus giving seven handjobs and smoking a cigarette.',
    correctButFlat: 'Natural selection.',
  },
]

test('every card in the funniness benchmark ships in the deck', () => {
  const black = new Set((blackCards as BlackCard[]).map((c) => c.t))
  const white = new Set(whiteCards as string[])
  const missing: string[] = []
  for (const p of PAIRS) {
    if (!black.has(p.card.t)) missing.push(`black: ${p.card.t}`)
    for (const a of [p.funny, p.correctButFlat]) if (!white.has(a)) missing.push(`white: ${a}`)
  }
  assert.deepEqual(missing, [])
})

function score(card: BlackCard, answer: string, taste = CONSENSUS) {
  return scoreWith(signalsFor(setupFeatures(card), answerFeatures(answer), 0), taste)
}

test('between two cards that both fit, it picks the funny one', () => {
  const missed: string[] = []
  for (const { why, card, funny, correctButFlat } of PAIRS) {
    const a = score(card, funny)
    const b = score(card, correctButFlat)
    if (a <= b) {
      missed.push(
        `  ${card.t}\n    funny:  ${funny} (${a.toFixed(2)})\n` +
          `    flat:   ${correctButFlat} (${b.toFixed(2)})\n    because: ${why}`,
      )
    }
  }
  assert.equal(
    missed.length,
    0,
    `${missed.length} of ${PAIRS.length} times it chose the card that is not a joke:\n${missed.join('\n')}`,
  )
})

test('most of the table finds the funny one funnier', () => {
  // Wendell is deadpan by design and is allowed to prefer the flat card — that
  // is his whole character. Nobody else should be making his mistake.
  const weak: string[] = []
  for (const { card, funny, correctButFlat } of PAIRS) {
    const agree = PERSONALITIES.filter(
      (p) => score(card, funny, p.taste) > score(card, correctButFlat, p.taste),
    )
    if (agree.length < 4) weak.push(`  ${card.t} — only ${agree.length}/6`)
  }
  assert.equal(weak.length, 0, `the table missed the joke:\n${weak.join('\n')}`)
})
