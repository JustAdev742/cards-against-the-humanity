/**
 * What kind of thing a card is, and what kind of thing a hole is asking for.
 *
 * This is the part that stops a bot answering "What's that sound?" with a
 * head of state. Domain distance alone cannot tell you that: the Pope and a
 * fart are both a long way from "sound", but only one of them makes a noise.
 *
 * Nothing here knows about any particular card. The frames below are ordinary
 * English — "because of X" wants a cause whatever card it appears in — and
 * every one of them fires on more than one card in the printed decks, which
 * a test checks, so this cannot quietly become a lookup table.
 */

import { CRUDE_WORDS, GROSS_WORDS, lexicalHits } from './lexicon.ts'

export const KINDS = ['person', 'place', 'object', 'activity', 'event', 'quality'] as const
export type Kind = (typeof KINDS)[number]

export type KindVector = Record<Kind, number>

export const noKinds = (): KindVector => ({
  person: 0,
  place: 0,
  object: 0,
  activity: 0,
  event: 0,
  quality: 0,
})

/* ── Telling one kind from another ──────────────────────────── */

/** Somebody, rather than something. */
const PERSON_WORDS = [
  'pope',
  'president',
  'senator',
  'mayor',
  'king',
  'queen',
  'prince',
  'princess',
  'priest',
  'nun',
  'rabbi',
  'jesus',
  'christ',
  'santa',
  'god ',
  'wizard',
  'witch',
  'doctor',
  'dentist',
  'nurse',
  'teacher',
  'principal',
  'professor',
  'sensei',
  'coach',
  'captain',
  'officer',
  'police',
  'cop ',
  'soldier',
  'clown',
  'chef',
  'waiter',
  'driver',
  'pilot',
  'janitor',
  'mom',
  'mum',
  'dad',
  'mother',
  'father',
  'grandma',
  'grandpa',
  'grandmother',
  'grandfather',
  'aunt',
  'uncle',
  'cousin',
  'sister',
  'brother',
  'son',
  'daughter',
  'baby',
  'child',
  'kid',
  'boy',
  'girl',
  'man',
  'woman',
  'men',
  'women',
  'lady',
  'gentleman',
  'guy',
  'dude',
  'friend',
  'boss',
  'neighbor',
  'neighbour',
  'stranger',
  'boyfriend',
  'girlfriend',
  'wife',
  'husband',
  'celebrity',
  'hamburglar',
  'batman',
  'superman',
  'spider-man',
  'narc',
  'bully',
  'twin',
  'hero',
  'villain',
  'ghost',
  'vampire',
  'zombie',
  'alien',
  'caveperson',
  'cavemen',
  'caveman',
  'audience',
  'crowd',
  'mob ',
  'choir',
  'band',
  'team',
  'gang',
  'army',
  'class of',
  'everyone',
  'people',
  'person',
  'children',
  'parents',
  'folks',
  'everybody',
  'somebody',
  'anybody',
]

/** Somewhere you could stand. */
const PLACE_WORDS = [
  'bathroom',
  'kitchen',
  'bedroom',
  'basement',
  'attic',
  'garage',
  'garden',
  'yard',
  'lawn',
  'house',
  'home',
  'apartment',
  'room',
  'hall',
  'school',
  'classroom',
  'church',
  'temple',
  'hospital',
  'prison',
  'jail',
  'office',
  'warehouse',
  'factory',
  'store',
  'shop',
  'mall',
  'restaurant',
  'bar ',
  'club',
  'gym',
  'library',
  'museum',
  'zoo',
  'park',
  'beach',
  'forest',
  'mountain',
  'ocean',
  'island',
  'desert',
  'city',
  'town',
  'village',
  'country',
  'heaven',
  'hell',
  'space',
  'moon',
  'mars',
  'tokyo',
  'america',
  'europe',
  'canada',
  'australia',
]

/** Things with edges: you could photograph one. */
const OBJECT_WORDS = [
  'magnet',
  'key',
  'hat',
  'shirt',
  'sock',
  'shoe',
  'pants',
  'coat',
  'glove',
  'belt',
  'bag',
  'box',
  'jar',
  'can ',
  'bottle',
  'cup',
  'plate',
  'bowl',
  'spoon',
  'fork',
  'knife',
  'gun',
  'bomb',
  'sword',
  'rope',
  'chain',
  'ladder',
  'hammer',
  'nail',
  'screw',
  'brick',
  'rock',
  'stone',
  'stick',
  'ball',
  'toy',
  'doll',
  'book',
  'paper',
  'pen ',
  'pencil',
  'card',
  'phone',
  'computer',
  'laptop',
  'camera',
  'car ',
  'truck',
  'bus ',
  'train',
  'plane',
  'boat',
  'bike',
  'chair',
  'table',
  'bed ',
  'door',
  'window',
  'wall',
  'floor',
  'mirror',
  'lamp',
  'flag',
  'sign',
  'tooth',
  'teeth',
  'bone',
  'hair',
  'blood',
  'skin',
  'butt',
  'nose',
  'eye',
  'cannon',
  'trumpet',
  'balloon',
  'pringles',
  'spaghetti',
  'meatloaf',
  'panties',
  'turd',
  'booger',
  'barf',
  'poop',
  'tampon',
  'cheese',
  'wing',
  'sandwich',
  'pizza',
  'taco',
  'egg',
  'banana',
  'broccoli',
  'corn',
  'soup',
  'nacho',
  'wine',
  'beer',
  'milk',
  'candy',
  'cake',
  'bat',
  'spider',
  'seagull',
  'goose',
  'geese',
  'bird',
  'dog',
  'cat',
  'horse',
  'monkey',
  'gorilla',
  'bear',
  'shark',
  'rat ',
  'mouse',
  'snake',
  'tarantula',
  'cow ',
  'pig ',
  'fish',
  'whale',
  'octopus',
  'squid',
  'dolphin',
  'crab',
  'owl',
  'moose',
  'llama',
  'sloth',
  'otter',
  'hog ',
  'goat',
  'lizard',
  'frog',
  'beetle',
  'wasp',
  'hornet',
  'swarm',
  'giant',
  'dragon',
]

/** Something that happens to you rather than something you do. */
const EVENT_WORDS = [
  'accident',
  'crash',
  'explosion',
  'earthquake',
  'flood',
  'storm',
  'fire ',
  'war ',
  'apocalypse',
  'funeral',
  'wedding',
  'divorce',
  'birth',
  'childbirth',
  'death',
  'murder',
  'crucifixion',
  'stroke',
  'heart attack',
  'surgery',
  'miracle',
  'disaster',
  'emergency',
  'recession',
  'pandemic',
  'outbreak',
  'accident',
  'collapse',
  'meltdown',
  'breakup',
]

/** Nothing you can point at. */
const QUALITY_WORDS = [
  'privilege',
  'debt',
  'shame',
  'hope',
  'silence',
  'justice',
  'freedom',
  'truth',
  'respect',
  'honor',
  'honour',
  'peace',
  'chaos',
  'destiny',
  'meaning',
  'existence',
  'reality',
  'choice',
  'capitalis',
  'socialis',
  'racism',
  'sexism',
  'anxiety',
  'depression',
  'confidence',
  'issues',
  'illusion',
  'attitude',
  'feeling',
  'emotion',
  'memory',
  'dream',
  'consequence',
  'potential',
  'stuff',
  'life',
  'world',
  'time',
  'money',
  'work',
  'thing',
  'way ',
  'love',
  'forever',
  'whatever',
  'past',
  'future',
  'mistake',
  'poverty',
  'selection',
  'theory',
  'penalty',
  'policy',
  'system',
  'boomer',
  'millennial',
  'generation',
  'culture',
  'economy',
  'society',
  'compromise',
  'tradition',
  'history',
  'science',
  'politics',
  'religion',
  'education',
  'south',
  'north',
  'east',
  'west',
  'midwest',
  'epidemic',
  'crisis',
  'movement',
  'industry',
  'media',
  'internet',
  'government',
  'establishment',
  'patriarchy',
  'suburbs',
  'mainstream',
]

/**
 * Adjectives you could see, hear or touch. "Hot cheese" and "A tiny horse"
 * are pictures because of these, and nothing else in the card says so.
 */
const SENSORY_WORDS = [
  'hot',
  'cold',
  'warm',
  'wet',
  'dry',
  'big',
  'huge',
  'tiny',
  'little',
  'fat',
  'thin',
  'long',
  'short',
  'dark',
  'bright',
  'loud',
  'quiet',
  'soft',
  'hard',
  'sticky',
  'slimy',
  'greasy',
  'hairy',
  'naked',
  'bloody',
  'rotten',
  'crusty',
  'steamy',
  'juicy',
  'smelly',
  'squishy',
  'fuzzy',
  'shiny',
  'rusty',
  'burnt',
  'frozen',
  'melted',
  'crushed',
  'stuck',
]

/**
 * Verbs that describe a state rather than a scene. "Being a woman." opens with
 * an -ing and is not a thing you could film, and neither is "Pretending to
 * care." Without this they were scored as actions, which is how they beat
 * nipple blades.
 */
const STATE_GERUNDS = new Set([
  'being',
  'having',
  'feeling',
  'seeming',
  'knowing',
  'wanting',
  'believing',
  'caring',
  'understanding',
  'pretending',
  'existing',
  'becoming',
  'staying',
  'remaining',
  'thinking',
  'hoping',
  'wishing',
  'trying',
  'needing',
  'loving',
  'hating',
  'complaining',
  'waiting',
  'realizing',
  'realising',
  'accepting',
  'forgetting',
  'remembering',
  'deserving',
])

/** Words ending a sentence that make it abstract whatever the stem is. */
const ABSTRACT_SUFFIX =
  /(ness|ity|ism|ence|ance|ship|hood|dom|acy|tion|sion|ment|ery|ory|ics|ology|ty)\b/i

/**
 * "-ing" does not make a verb. Without this, "Nothing." reads as an activity,
 * which is the opposite of what it is.
 */
const NOT_GERUNDS = new Set([
  'nothing',
  'everything',
  'something',
  'anything',
  'thing',
  'king',
  'ring',
  'wing',
  'sing',
  'string',
  'spring',
  'morning',
  'evening',
  'ceiling',
  'feeling',
  'building',
  'during',
  'sibling',
  'darling',
  'painting',
  'meaning',
  'viking',
  'bling',
  'swing',
  'thing',
])

// One matcher for every word list in the model, so a stem cannot mean one
// thing here and another thing in lexicon.ts.
const hits = (lower: string, words: readonly string[]): number => lexicalHits(lower, words)

/** A card that opens with a real verb-ing: "Laying an egg", "Doing crimes". */
export function leadsWithGerund(text: string): boolean {
  const first = /^([a-z]+ing)\b/i.exec(text.trim())?.[1]?.toLowerCase()
  return Boolean(first && !NOT_GERUNDS.has(first))
}

/** Title Case words that are not sentence-initial: a name, a brand, a place. */
function namedThings(text: string): number {
  const tokens = text.split(/\s+/).slice(1)
  let n = 0
  for (const raw of tokens) {
    const token = raw.replace(/[^A-Za-z0-9’'-]/g, '')
    if (token.length > 1 && /^[A-Z]/.test(token) && !/^[A-Z]+$/.test(token)) n++
  }
  return n
}

/** What kind of thing this answer is, as a spread rather than one label. */
export function kindsOf(text: string): KindVector {
  const lower = ' ' + text.toLowerCase() + ' '
  const k = noKinds()

  const opener = /^([a-z]+ing)\b/i.exec(text.trim())?.[1]?.toLowerCase()
  if (opener && STATE_GERUNDS.has(opener)) {
    // A state, not a scene: worth something as an answer, nothing as a picture.
    k.activity += 0.35
    k.quality += 0.9
  } else if (leadsWithGerund(text)) {
    k.activity += 1.6
    k.event += 0.3
  }
  k.person += hits(lower, PERSON_WORDS) * 0.95
  k.place += hits(lower, PLACE_WORDS) * 0.9
  // Bodily and crude words are objects too. They were only ever scored as
  // register, so half the deck read as having no physical content at all.
  k.object +=
    hits(lower, OBJECT_WORDS) * 0.8 +
    hits(lower, GROSS_WORDS) * 0.7 +
    hits(lower, CRUDE_WORDS) * 0.65 +
    hits(lower, SENSORY_WORDS) * 0.45
  k.event += hits(lower, EVENT_WORDS) * 1.1
  k.quality += hits(lower, QUALITY_WORDS) * 1.2
  // The suffix is a last resort, not a verdict. "A live studio audience."
  // ends in -ence and is a room full of people; "A crucifixion." ends in -tion
  // and is the most concrete thing in the deck. It only counts when nothing
  // concrete was found at all, and an event counts as concrete: it is a thing
  // that happens, which is exactly what you can picture.
  const solid = k.person + k.object + k.place + k.event
  if (solid === 0 && ABSTRACT_SUFFIX.test(text)) k.quality += 0.7

  // A name is a thing in the world; whether it is a person or an object, it
  // beats an abstraction, so it counts towards both rather than neither.
  const named = namedThings(text)
  if (named) {
    k.person += named * 0.45
    k.object += named * 0.35
  }
  // A bare plural ("Boogers.", "Explosions.", "Magnets.") is a countable thing.
  if (/^[A-Z][a-z]+s\.?$/.test(text.trim())) k.object += 0.25
  // An article means a noun phrase is coming, which is a thing or a person.
  if (/^(a|an|the) /i.test(text.trim())) {
    k.object += 0.2
    k.person += 0.1
  }

  // Nothing matched at all: assume a thing rather than an abstraction, which
  // is the safer guess for a deck mostly made of nouns.
  const total = KINDS.reduce((sum, key) => sum + k[key], 0)
  if (total === 0) k.object = 0.6
  return k
}

/**
 * How much of a picture the card paints.
 *
 * Counted rather than averaged, and rewarding elaboration instead of
 * punishing it. This is the difference between the two cards that both
 * answer the question: "An octopus giving seven handjobs and smoking a
 * cigarette" wins rounds that "A mistake." never will.
 */
export function vividnessOf(text: string, kinds: KindVector): number {
  const named = namedThings(text)
  const counted = /\d|\b(seven|three|many|hundred|thousand|million)\b/i.test(text) ? 1 : 0
  const words = text.split(/\s+/).filter(Boolean).length
  // Detail saturates, so a rambling card is not automatically the best one.
  const detail = Math.min(1, Math.max(0, words - 3) / 8)
  // Anything that happens, or that you could point at, is a picture. Reading
  // this off the kind vector rather than re-counting word lists is what stops
  // "A crucifixion." scoring as no image at all: it is an event, and events
  // are the most vivid things in the deck.
  const solid =
    kinds.object + kinds.person + kinds.place + kinds.event * 0.8 + kinds.activity * 0.35
  // Start from "this is a thing in the world" and take away for abstraction,
  // rather than building up out of a word list that can never cover every
  // concrete noun in five hundred cards.
  // No flat floor: a card earns its imagery. A floor gave every unlisted
  // abstraction the same score as a real picture, and half the deck piled up
  // in one narrow band where nothing could be told from anything.
  // Does it name anything real at all? This saturates fast and deliberately:
  // a card can only be anchored in the world once, and "Crab." is as anchored
  // as a card gets. Elaboration is then a separate, smaller bonus on top, so a
  // long card cannot out-picture a short one merely by having more words.
  const anchored = Math.min(1, solid / 1.1)
  const raw = anchored * 0.95 + detail * 0.75 + named * 0.18 + counted * 0.18
  return Math.max(0, Math.min(2.2, raw) - kinds.quality * 0.7)
}

/* ── What the hole is asking for ────────────────────────────── */

interface Frame {
  /** A name, so a failing coverage test can say which one is too narrow. */
  name: string
  test: RegExp
  want: Partial<KindVector>
  /** Pushes the answer towards things that make a noise, smell, or are edible. */
  sense?: 'sound' | 'smell' | 'taste'
}

/**
 * Ordinary English frames. Each says what sort of answer the sentence around
 * the blank is reaching for. They are matched against the setup with its
 * blanks left in, so "because of _" can be told from a bare "because".
 */
const FRAMES: Frame[] = [
  {
    name: 'sound',
    test: /\b(sound|noise|hear(d|ing)?|listen|loud|quiet|scream|music)\b/i,
    want: { event: 0.9, activity: 0.8, object: 0.6 },
    sense: 'sound',
  },
  {
    name: 'smell',
    test: /\b(smell|stink|stench|odou?r|reek|breath|sniff)/i,
    want: { object: 1, event: 0.4 },
    sense: 'smell',
  },
  {
    name: 'taste',
    test: /\b(taste|eat|eating|ate|delicious|flavou?r|hungry|snack|bite|drink|swallow|chew|recipe|dinner|lunch|breakfast)\b|high on|drunk on|hooked on|\bdrugs?\b|addicted|overdos/i,
    want: { object: 1 },
    sense: 'taste',
  },
  {
    name: 'slogan',
    test: /betcha|can[’']t stop|just one|new from|now with|brought to you by|introducing|coming soon|this season|next on/i,
    want: { object: 0.9, activity: 0.5 },
  },

  {
    name: 'who',
    test: /\bwho\b|ask me anything|^_ (is|was) |my name is/i,
    want: { person: 1.2, object: 0.3 },
  },
  {
    name: 'i-am',
    test: /\bi[’']m _|\bi am _|now i[’']m _|(is|was) now _/i,
    want: { person: 0.9, quality: 0.5, activity: 0.4 },
  },
  {
    name: 'versus',
    test: /\bvs\.?|\bversus\b|\bfight(ing)?\b|defend yourself against|\bbeat(s|ing)? _|\benemy\b|\bbattle\b/i,
    want: { person: 1, object: 0.9 },
  },
  {
    name: 'portrait',
    test: /portrait|painting|statue|photo|picture of|poster|album|magazine|on the cover|starring|\bmovie\b|\bshow\b/i,
    want: { person: 1, object: 0.7 },
  },

  {
    name: 'where',
    test: /\bwhere\b|\bin there\b|\bcome from\b|\bhiding\b|\blives? in\b/i,
    want: { place: 0.8, object: 0.9, event: 0.4 },
  },
  {
    name: 'contains',
    test: /_ in (there|here|the|my|your|his|her)\b|filled with|full of|covered in|stuffed with|\binside\b|\bunder the\b/i,
    want: { object: 1.1, person: 0.3 },
  },

  {
    name: 'prohibited',
    test: /prohibit|banned|confiscat|not allowed|illegal|forbidden|against the (law|rules)|arrest|\bjail\b|guidelines|regulations|\brules\b|security/i,
    want: { object: 1.1, activity: 0.5 },
  },
  {
    name: 'want-take',
    test: /\bwants? _|\bneeds? _|\bgive (me|you|us) _|\bstole|\btook _|\bbuy(ing)? _|\bsteal/i,
    want: { object: 1, activity: 0.4 },
  },
  {
    name: 'see',
    test: /do you see|\blook(ing)? at|\bi see _|\bwatch(ing)? _|\bstar(e|ing) at|\bwitness/i,
    want: { object: 1, person: 0.5 },
  },
  {
    name: 'with',
    test: /\bbut with _|\bwith _!|\bmade (of|from) _|\bcovered in _|\bplus _|\band _!/i,
    want: { object: 1, activity: 0.5 },
  },

  {
    name: 'cause',
    test: /because of _|due to _|\bwhy\b|thanks to _|blame(d)? _/i,
    want: { event: 1, activity: 0.9, object: 0.6 },
  },
  {
    name: 'how-did',
    test: /\bhow (did|do|does|i|to|you|we|they)\b|step \d|first,|then _|finally|the secret to|the key to|all it takes|profit/i,
    want: { activity: 1.1, event: 0.9 },
  },
  {
    name: 'award-for',
    test: /award|prize|medal|trophy|champion|winner|nominated|hall of fame|world series|olympic|\bbest _/i,
    want: { activity: 1.2, event: 0.5 },
  },
  {
    name: 'doing-together',
    test: /enjoy _|\b_ together|good at _|time for _|involved with _|addicted to _|hooked on _/i,
    want: { activity: 1, object: 0.7 },
  },
  {
    name: 'teach',
    test: /teach|\blearn(ing)?\b|lesson|demonstrate|explain|show you how|\bclass\b|homework|professor|school/i,
    want: { activity: 1.1, object: 0.6 },
  },
  {
    name: 'try-it',
    test: /if you try|dare you|betcha|\btry(ing)? _|\bbet \w+ (can|could)|five bucks/i,
    want: { activity: 1, object: 0.7 },
  },

  {
    name: 'guilty-pleasure',
    test: /guilty pleasure|secret(ly)?|hiding|private/i,
    want: { activity: 1, object: 0.7 },
  },
  {
    name: 'reaction',
    test: /disturbing|charming|shocking|surprising|disgusting|terrifying|\bweird\b|\bgross\b|\bcreepy\b|\bawkward\b/i,
    want: { object: 0.9, activity: 0.9, event: 0.5 },
  },
  {
    name: 'love',
    test: /\bloves? _|\bhates? _|\bfavou?rite _/i,
    want: { object: 1, activity: 0.7 },
  },
]

/**
 * What nothing in particular asks for. It still says something: this deck is
 * mostly nouns you can picture, and an abstraction is rarely the answer.
 */
const DEFAULT_WANT: KindVector = {
  object: 0.75,
  activity: 0.65,
  event: 0.45,
  person: 0.4,
  place: 0.18,
  quality: 0.1,
}

export interface Expectation {
  want: KindVector
  /** The setup is doing an advertising voice, which is a register to ruin. */
  promotional: boolean
  sound: boolean
  smell: boolean
  taste: boolean
  /** How many frames fired — low means the want vector is mostly a guess. */
  matched: number
}

export function expectationOf(setupText: string): Expectation {
  const want = { ...DEFAULT_WANT }
  let matched = 0
  let promotional = false
  const senses = { sound: false, smell: false, taste: false }

  for (const frame of FRAMES) {
    if (!frame.test.test(setupText)) continue
    matched++
    if (frame.name === 'slogan') promotional = true
    for (const kind of KINDS) {
      const add = frame.want[kind]
      if (add !== undefined) want[kind] += add
    }
    if (frame.sense) senses[frame.sense] = true
  }
  // A hole that takes a noun phrase takes a nominalised event too: "a
  // crucifixion" fills the slot exactly as "a sandwich" does. Saying so here
  // once is better than remembering to write `event` into every frame.
  want.event = Math.max(want.event, want.object * 0.6)
  return { want, promotional, ...senses, matched }
}

/** For the coverage test: a frame that fires on one card is a special case. */
export const FRAME_PATTERNS: { name: string; test: RegExp }[] = FRAMES.map(({ name, test }) => ({
  name,
  test,
}))

/** 0 when the answer is the wrong sort of thing entirely, 1 when it fits. */
export function kindFit(want: KindVector, kinds: KindVector): number {
  let dot = 0
  let wantSize = 0
  let kindSize = 0
  for (const kind of KINDS) {
    dot += want[kind] * kinds[kind]
    wantSize += want[kind] * want[kind]
    kindSize += kinds[kind] * kinds[kind]
  }
  const size = Math.sqrt(wantSize) * Math.sqrt(kindSize)
  return size === 0 ? 0.5 : Math.max(0, Math.min(1, dot / size))
}

/* ── Sensory bonuses ────────────────────────────────────────── */

const SOUNDY = [
  'scream',
  'shout',
  'yell',
  'cry',
  'crying',
  'laugh',
  'moan',
  'groan',
  'howl',
  'bark',
  'fart',
  'burp',
  'belch',
  'snor',
  'sneeze',
  'cough',
  'bang',
  'boom',
  'explos',
  'siren',
  'alarm',
  'whistle',
  'trumpet',
  'drum',
  'music',
  'song',
  'sing',
  'thud',
  'crash',
  'slam',
  'squeak',
  'rattle',
  'buzz',
  'hiss',
  'roar',
  'clap',
  'applause',
  'noise',
  'wettest',
]

const SMELLY = [
  'fart',
  'poop',
  'turd',
  'booger',
  'barf',
  'vomit',
  'sweat',
  'armpit',
  'butt',
  'diarrh',
  'cheese',
  'garbage',
  'trash',
  'rot',
  'mould',
  'mold',
  'corpse',
  'urine',
  'pee',
  'skunk',
  'onion',
  'garlic',
  'fish',
  'smoke',
  'burnt',
  'perfume',
  'manure',
  'sewage',
  'crotch',
]

const EDIBLE = [
  'wing',
  'pizza',
  'cheese',
  'taco',
  'burrito',
  'nacho',
  'soup',
  'sandwich',
  'burger',
  'bacon',
  'candy',
  'cake',
  'egg',
  'bread',
  'milk',
  'chicken',
  'meat',
  'sauce',
  'cereal',
  'pancake',
  'spaghetti',
  'juice',
  'banana',
  'fries',
  'chocolate',
  'broccoli',
  'corn',
  'yogurt',
  'pasta',
  'meatloaf',
  'pringles',
  'snack',
  'wine',
  'beer',
  'soda',
  'turkey',
]

/** How well an answer suits a setup that asked about a sense. */
export function senseFit(expect: Expectation, text: string): number {
  const lower = ' ' + text.toLowerCase() + ' '
  let best = 0
  if (expect.sound) best = Math.max(best, Math.min(1, hits(lower, SOUNDY) * 0.7))
  if (expect.smell) best = Math.max(best, Math.min(1, hits(lower, SMELLY) * 0.7))
  if (expect.taste) best = Math.max(best, Math.min(1, hits(lower, EDIBLE) * 0.7))
  return best
}

/** True when the setup asked about a sense at all. */
export const asksASense = (expect: Expectation): boolean =>
  expect.sound || expect.smell || expect.taste
