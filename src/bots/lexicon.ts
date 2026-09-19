/**
 * A coarse map of what the cards are about.
 *
 * No model, no lookup table of pre-scored pairs: a few hundred words is
 * enough to tell that "Attention students!" lives in a different world from
 * "a bear", and the distance between those two worlds is most of the joke.
 * It is deliberately blunt — it only has to be right on average.
 */

export const DOMAINS = [
  'body',
  'food',
  'animals',
  'politics',
  'religion',
  'tech',
  'showbiz',
  'family',
  'school',
  'work',
  'violence',
  'romance',
  'nature',
] as const

export type Domain = (typeof DOMAINS)[number]

/** Words that place a card in a world. Stems, matched as prefixes. */
export const DOMAIN_WORDS: Record<Domain, string[]> = {
  body: [
    'butt', 'fart', 'poop', 'pee', 'diarrh', 'vomit', 'snot', 'booger', 'burp', 'toilet',
    'nipple', 'naked', 'sweat', 'smell', 'stink', 'turd', 'gas', 'armpit', 'belly', 'blood',
    'bone', 'teeth', 'tooth', 'hair', 'skin', 'guts', 'barf', 'wee', 'bodily', 'sneeze',
  ],
  food: [
    'pizza', 'burger', 'cheese', 'taco', 'burrito', 'soup', 'sandwich', 'nacho', 'pasta',
    'butter', 'bacon', 'candy', 'cake', 'egg', 'bread', 'milk', 'snack', 'dinner', 'lunch',
    'breakfast', 'chicken', 'meat', 'sauce', 'cereal', 'pancake', 'spaghetti', 'juice',
    'banana', 'fries', 'hungry', 'eating', 'restaurant', 'kitchen', 'yogurt', 'chocolate',
  ],
  animals: [
    'dog', 'cat', 'bear', 'bird', 'horse', 'pig', 'cow', 'goat', 'shark', 'whale', 'snake',
    'spider', 'gorilla', 'monkey', 'lion', 'tiger', 'octopus', 'duck', 'goose', 'geese',
    'rat', 'mouse', 'elephant', 'penguin', 'puppy', 'kitten', 'bat', 'crab', 'fish', 'bee',
    'tarantula', 'dinosaur', 'gerbil', 'worm', 'squirrel', 'raccoon',
  ],
  politics: [
    'president', 'senat', 'congress', 'vote', 'election', 'government', 'america', 'law',
    'policy', 'tax', 'mayor', 'queen', 'king', 'royal', 'prime minister', 'parliament',
    'campaign', 'democra', 'republic', 'liberal', 'conservative', 'freedom', 'rights',
  ],
  religion: [
    'god', 'jesus', 'christ', 'church', 'bible', 'pray', 'heaven', 'hell', 'devil', 'satan',
    'angel', 'sin', 'priest', 'pope', 'holy', 'soul', 'faith', 'salvation', 'moses', 'miracle',
  ],
  tech: [
    'computer', 'phone', 'internet', 'app', 'wifi', 'email', 'robot', 'laptop', 'website',
    'online', 'download', 'video game', 'screen', 'password', 'battery', 'software', 'ai',
    'tweet', 'post', 'stream', 'link', 'click', 'meme', 'social media',
  ],
  showbiz: [
    'movie', 'film', 'tv', 'show', 'actor', 'star', 'celebrit', 'music', 'song', 'band',
    'concert', 'dance', 'theatre', 'theater', 'broadway', 'oscar', 'academy award', 'stage',
    'netflix', 'disney', 'cartoon', 'comedy', 'sing', 'album', 'famous',
  ],
  family: [
    'mom', 'mum', 'dad', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'sister',
    'brother', 'baby', 'kid', 'child', 'son', 'daughter', 'aunt', 'uncle', 'cousin',
    'parent', 'family', 'wife', 'husband', 'birth', 'nephew', 'niece',
  ],
  school: [
    'school', 'teacher', 'class', 'homework', 'student', 'principal', 'exam', 'test',
    'science fair', 'recess', 'playground', 'detention', 'lesson', 'college', 'university',
    'grade', 'report card', 'field trip', 'math', 'library',
  ],
  work: [
    'job', 'work', 'boss', 'office', 'money', 'salary', 'bank', 'business', 'company',
    'meeting', 'career', 'interview', 'debt', 'rent', 'bill', 'cash', 'dollar', 'rich',
    'poor', 'poverty', 'billionaire', 'employee', 'customer', 'manager',
  ],
  violence: [
    'kill', 'dead', 'death', 'die', 'dying', 'murder', 'gun', 'knife', 'war', 'fight',
    'punch', 'blood', 'bomb', 'explos', 'stab', 'shoot', 'crush', 'destroy', 'attack',
    'weapon', 'accident', 'crash', 'burn', 'drown', 'corpse',
  ],
  romance: [
    'love', 'kiss', 'date', 'marriage', 'married', 'wedding', 'boyfriend', 'girlfriend',
    'romantic', 'crush', 'valentine', 'heart', 'relationship', 'flirt', 'divorce', 'partner',
  ],
  nature: [
    'tree', 'forest', 'ocean', 'sea', 'mountain', 'sky', 'rain', 'snow', 'sun', 'moon',
    'star', 'garden', 'flower', 'weather', 'storm', 'beach', 'river', 'grass', 'cloud',
    'space', 'planet', 'volcano', 'wind',
  ],
}

/**
 * The bodily, childish end of things. In the adult deck this overlaps with
 * the crude words below; in the Family Edition it is the entire register a
 * ten-year-old finds funniest, which is why it is scored separately.
 */
export const GROSS_WORDS = [
  'fart', 'poop', 'pee', 'butt', 'diarrh', 'booger', 'snot', 'vomit', 'barf', 'burp',
  'turd', 'toilet', 'smell', 'stink', 'gas', 'armpit', 'sweaty', 'crust', 'slime',
  'wedgie', 'nose', 'belch', 'drool', 'sneeze', 'mucus', 'wee',
]

/** The transgressive end of the adult deck. */
export const CRUDE_WORDS = [
  'sex', 'sperm', 'penis', 'vagina', 'dick', 'cock', 'cum', 'jizz', 'orgasm', 'porn', 'nipple',
  'boob', 'tit', 'anal', 'asshole', 'naked', 'nude', 'erection', 'masturbat', 'genital',
  'horny', 'slut', 'whore', 'fuck', 'shit', 'bitch', 'piss', 'bastard', 'crotch',
]

/**
 * Shocking without being bodily or sexual: death, harm, disease, the sacred.
 * A cheerful frame is ruined by these just as thoroughly as by a rude word,
 * and the adult deck leans on them at least as hard.
 */
export const TABOO_WORDS = [
  'death', 'dead', 'dying', 'die ', 'kill', 'murder', 'corpse', 'funeral', 'suicide',
  'crucifix', 'abortion', 'miscarriage', 'cancer', 'tumor', 'tumour', 'disease', 'plague',
  'genocide', 'slavery', 'slave', 'racism', 'racist', 'nazi', 'holocaust', 'war crime',
  'shooting', 'stabbing', 'torture', 'kidnap', 'hostage', 'overdose', 'addiction',
  'jesus', 'christ', 'god', 'holy', 'church', 'blood of', 'communion', 'the pope',
  'orphan', 'famine', 'starving', 'homeless', 'prison', 'execution', 'hanging',
]

/** The voice of an institution. The stiffer the setup, the harder a card lands. */
export const FORMAL_WORDS = [
  'attention', 'guidelines', 'presents', 'introducing', 'announce', 'department',
  'official', 'ladies and gentlemen', 'breaking news', 'proudly', 'regulations',
  'please note', 'kindly', 'we regret', 'dear', 'sincerely', 'herewith', 'pursuant',
  'committee', 'hereby', 'notice', 'memo', 'report', 'study', 'research', 'historians',
  'this season', 'next on', 'coming soon', 'brought to you by', 'new from',
]

/**
 * The voice of somebody being nice in front of children. A setup in this
 * register is the one an indecent card does the most damage to.
 */
export const WHOLESOME_WORDS = [
  'kids', 'children', 'students', 'class,', 'class ', 'teacher', 'school', 'grandma',
  'grandpa', 'mommy', 'daddy', 'mom ', 'dad ', 'family', 'please', 'thank you', 'lovely',
  'wonderful', 'sweetheart', 'honey', 'dear', 'precious', 'darling', 'sunshine', 'papa',
  'bedtime', 'sleepover', 'birthday', 'christmas', 'easter', 'church', 'sunday', 'cute',
  'safe', 'healthy', 'polite', 'good boy', 'good girl', 'young man', 'young lady',
]

/** Nothing you can point at. Abstractions are the weakest answers. */
export const ABSTRACT_WORDS = [
  'hope', 'shame', 'sadness', 'happiness', 'love', 'freedom', 'justice', 'truth', 'silence',
  'emotion', 'feeling', 'dream', 'memory', 'time', 'change', 'nothing', 'everything',
  'success', 'failure', 'confidence', 'anxiety', 'respect', 'honour', 'honor', 'peace',
  'chaos', 'destiny', 'meaning', 'existence', 'reality', 'consequence',
]

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'my',
  'your', 'his', 'her', 'its', 'our', 'their', 'is', 'are', 'was', 'were', 'be', 'been',
  'it', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me',
  'him', 'them', 'us', 'as', 'by', 'from', 'up', 'out', 'so', 'if', 'then', 'than', 'when',
  'what', 'who', 'how', 'why', 'all', 'just', 'like', 'not', 'no', 'do', 'does', 'did',
])

/** Content words, lowercased, without the punctuation or the filler. */
export function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

/**
 * Endings a stem is allowed to pick up and still be the same word. Without
 * this, a plain substring match reads "bone" inside "Boneless", which scored
 * boneless buffalo wings as twice the picture it is.
 */
const INFLECTIONS = new Set([
  '', 's', 'es', 'ed', 'd', 'ing', 'er', 'ers', 'ion', 'ions', 'ive', 'ies', 'y', 'm', 't', 'ts',
])

/** How many of a word list a text touches. */
export function lexicalHits(text: string, words: readonly string[]): number {
  const lower = text.toLowerCase()
  const tokens = lower.split(/[^a-z0-9'’-]+/).filter(Boolean)
  let hits = 0
  for (const entry of words) {
    const stem = entry.trim()
    if (!stem) continue
    // Multi-word entries ("heart attack", "the pope") have their own boundaries.
    if (stem.includes(' ')) {
      if (lower.includes(stem)) hits++
      continue
    }
    if (tokens.some((t) => t.startsWith(stem) && INFLECTIONS.has(t.slice(stem.length)))) hits++
  }
  return hits
}
