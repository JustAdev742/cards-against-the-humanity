import type { BlackCard } from '../game/types.ts'
import {
  ABSTRACT_WORDS,
  CRUDE_WORDS,
  DOMAINS,
  DOMAIN_WORDS,
  FORMAL_WORDS,
  WHOLESOME_WORDS,
  GROSS_WORDS,
  contentWords,
  lexicalHits,
  type Domain,
} from './lexicon.ts'
import {
  expectationOf,
  kindsOf,
  leadsWithGerund,
  type Expectation,
  type KindVector,
} from './kinds.ts'

/** Everything a bot knows about one card, worked out once and kept. */
export interface CardFeatures {
  text: string
  words: string[]
  /** How strongly the card sits in each world, normalised to length 1. */
  domains: number[]
  /** Nothing in the lexicon matched, so the domain vector means nothing. */
  domainless: boolean
  gross: number
  crude: number
  formal: number
  /** Being nice in front of children. What a rude card ruins. */
  wholesome: number
  abstract: number
  /** Proper nouns and numbers: things you can point at. */
  concrete: number
  /** What sort of thing this is — a person, a place, a thing, a doing. */
  kinds: KindVector
  /** How easily you could picture it. Abstractions score near zero. */
  image: number
  /** Characters. Short answers land harder after a long setup. */
  length: number
  /** "Eating pasta out of my pants." — an action rather than a thing. */
  gerund: boolean
  /** Starts with a, an or the, which matters next to a blank. */
  article: 'a' | 'the' | null
}

/** Where a blank sits, which decides what can grammatically go in it. */
export interface Blank {
  /** The blank follows "a" or "an", so an answer starting with one reads badly. */
  afterArticle: 'a' | 'the' | null
  /** The blank opens the sentence, so the answer is the subject. */
  atStart: boolean
}

export interface SetupFeatures extends CardFeatures {
  blanks: Blank[]
  /** What the sentence around the blank is reaching for. */
  expect: Expectation
  /** No blank at all: the card is a question and the answer follows it. */
  isQuestion: boolean
}

function unit(values: number[]): number[] {
  const size = Math.hypot(...values)
  return size === 0 ? values : values.map((v) => v / size)
}

/** Capitalised words that are not sentence-initial, plus any digits. */
function concreteness(text: string): number {
  const tokens = text.split(/\s+/)
  let proper = 0
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i].replace(/[^A-Za-z0-9]/g, '')
    if (!token) continue
    if (/^[A-Z][a-z]/.test(token) || /^[A-Z]{2,}$/.test(token)) proper++
    if (/\d/.test(token)) proper++
  }
  return proper
}

/**
 * How much of a picture the card puts in your head. A named thing, a place or
 * an object all count; an abstraction counts against, because "Shame." is not
 * an image and almost never the funny answer.
 */
function imageOf(kinds: KindVector): number {
  const solid = kinds.object + kinds.person + kinds.place + kinds.event * 0.6 + kinds.activity * 0.5
  return Math.max(0, Math.min(1, solid / 2 - kinds.quality * 0.45))
}

function baseFeatures(text: string): CardFeatures {
  const words = contentWords(text)
  const kinds = kindsOf(text)
  const raw = DOMAINS.map((domain: Domain) => {
    let score = 0
    for (const stem of DOMAIN_WORDS[domain]) {
      if (text.toLowerCase().includes(stem)) score += 1
    }
    return score
  })
  const total = raw.reduce((a, b) => a + b, 0)
  const lead = text.trimStart().toLowerCase()

  return {
    text,
    words,
    domains: unit(raw),
    domainless: total === 0,
    gross: lexicalHits(text, GROSS_WORDS),
    crude: lexicalHits(text, CRUDE_WORDS),
    formal: lexicalHits(text, FORMAL_WORDS),
    wholesome: lexicalHits(text, WHOLESOME_WORDS),
    abstract: lexicalHits(text, ABSTRACT_WORDS),
    concrete: concreteness(text),
    kinds,
    image: imageOf(kinds),
    length: text.length,
    gerund: leadsWithGerund(text), // was /^[a-z]+ing\b/.test(lead),
    article: lead.startsWith('the ') ? 'the' : /^an? /.test(lead) ? 'a' : null,
  }
}

const answerCache = new Map<string, CardFeatures>()
const setupCache = new Map<string, SetupFeatures>()

export function answerFeatures(text: string): CardFeatures {
  let cached = answerCache.get(text)
  if (!cached) {
    cached = baseFeatures(text)
    answerCache.set(text, cached)
  }
  return cached
}

export function setupFeatures(card: BlackCard): SetupFeatures {
  let cached = setupCache.get(card.t)
  if (cached) return cached

  const blanks: Blank[] = []
  const parts = card.t.split('_')
  for (let i = 0; i < parts.length - 1; i++) {
    const before = parts[i]
    const trimmed = before.trimEnd()
    blanks.push({
      afterArticle: /\bthe$/i.test(trimmed) ? 'the' : /\ban?$/i.test(trimmed) ? 'a' : null,
      atStart: trimmed.length === 0 || /[.!?]\s*$/.test(trimmed),
    })
  }

  cached = {
    ...baseFeatures(card.t.replace(/_/g, ' ')),
    expect: expectationOf(card.t),
    blanks,
    isQuestion: blanks.length === 0,
  }
  setupCache.set(card.t, cached)
  return cached
}

/** 0 when two cards are about the same thing, 1 when they share no world. */
export function domainDistance(a: CardFeatures, b: CardFeatures): number {
  if (a.domainless || b.domainless) return 0.5 // nothing to go on; assume neutral
  let dot = 0
  for (let i = 0; i < a.domains.length; i++) dot += a.domains[i] * b.domains[i]
  return 1 - Math.max(0, Math.min(1, dot))
}

/** Words the answer borrows back from the setup. Usually it just reads flat. */
export function echo(setup: CardFeatures, answer: CardFeatures): number {
  if (answer.words.length === 0) return 0
  const inSetup = new Set(setup.words)
  let shared = 0
  for (const word of answer.words) if (inSetup.has(word)) shared++
  return shared / answer.words.length
}
