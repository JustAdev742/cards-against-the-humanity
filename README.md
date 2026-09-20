# Cards Against The Humanity

Cards Against Humanity for a living room. Put the TV on the big screen, everyone
else joins from their phone. No app to install, no account, and no game server:
the TV hosts the game and the phones talk to it directly.

The full 2022 print-and-play deck is included — 100 black cards and 500 white
cards, transcribed from the official PDF.

**Play it:** <https://joviangame.me/cards-against-the-humanity/>

## Two ways to play

**Local.** Put it on the TV, hand out the four-letter code, everyone plays from
their phone. The TV shows the black card and the answers; the phones are hands.
This is the good one.

**Online.** No TV, nobody in the same room. One person opens a table and the
table lives on their device; everyone else joins from wherever they are, and
the black card, the answers and your own hand all sit on one screen.

| Online | What it does |
| --- | --- |
| Private match | Opens a table and gives you a code and a link to send. Nobody can wander in. |
| Public match | Looks for a table with strangers at it. If none is running, opens one for others to find. |

Public tables live on a handful of reserved codes. There is no server keeping a
directory, so finding a game means knocking on those doors a few at a time — the
same trick that lets the whole thing run without a backend.

## How a game goes

1. Open the site on whatever is plugged into the TV and pick **I'm the TV**.
   It shows a four-letter code and a QR code.
2. Everyone else opens the same site on their phone, scans the code or types the
   four letters, and picks a name. Three players minimum, ten maximum.
3. The first person to sit down runs the table: they pick the deck, the score to
   play to, and they start the game. The TV can do all of that too.
4. Each round, the TV shows a black card. Everyone except the Card Czar picks an
   answer on their phone. Nobody sees anyone else's pick.
5. Once every answer is in, the Czar turns them over one at a time from their
   phone. Each card writes itself into the black card on the TV as it is read
   out, so the whole room is reading the same joke at the same time.
6. The Czar picks the funniest one. That player gets a point, the TV holds the
   winning card for a few seconds, and the next round deals itself.

The Czar rotates each round, and hands refill to ten cards automatically. If a
phone locks, reloads or drops off the wifi, it comes back to the same seat with
the same hand and the same score.

## Settings

All of them live in the lobby, on the TV or on the first player's phone.

| Setting | Options | Notes |
| --- | --- | --- |
| Deck | Full · Family Edition | Two separate printed boxes. |
| Play to | 5 · 7 · 10 | Roughly a quarter hour, half an hour, a whole evening. |
| Rando Cardrissian | Off · On | A random card plays every round. He keeps a score and can take the game, at which point everyone should feel bad. |
| Meritocracy | Off · On | The winner judges the next round instead of the job going round the table. |
| Add a bot | Up to six | Seats a guest who plays and judges for itself. See below. |
| Music | Volume, mute, track | TV, and the device running an online table. |

### Two decks

| Deck | Cards | For |
| --- | --- | --- |
| Full | 500 white, 100 black | The original game, as printed. Adults. |
| Family Edition | 500 white, 95 black | Its own box, written for kids. Ages 8 and up. |

These are two separate printed decks, not one box filtered into the other.
Nothing is bleeped, blocked or held back: you pick which deck you are playing
and you get all of it. Both were transcribed from Cards Against Humanity's own
print-and-play PDFs.

The Family Edition is genuinely different rather than milder — its own jokes,
its own recurring characters (Principal Butthead, Chungo, Sensei Todd), and a
run of cards marked "written by a kid".

### Whose turn it is

The Card Czar passes round the table in seat order. **Winning a round does not
make you the Czar** — that surprises people, so the winning card now says who
judges next. If you would rather the winner judged, turn on **Meritocracy** in
the lobby; it is one of the printed house rules.

## The bots

Short of players, press **Add a bot** in the lobby. A bot takes a seat like
anybody else: it is dealt a hand, it plays out of that hand, and when the Czar
lands on it, it reads the answers and picks a winner. Nothing about the rules
changes to accommodate it. A public table with too few people at it will seat
one every twenty seconds or so, and gives the seat back as soon as a real
person turns up.

### They are not picking at random

There is no table of pre-scored card combinations anywhere in this project, and
deliberately so: a lookup table only knows the pairs somebody sat down and
scored, and would have nothing to say about a card it had not seen. A bot works
the answer out from the sentence in front of it.

**First, is it even an answer?** A card is sorted into what sort of thing it is
— a person, a place, an object, something you do, something that happens, or an
abstraction — and the setup is read for what it is reaching for. "What's that
sound?" wants something that makes a noise, so the Pope is out and a fart is in.
"Because of ___" wants a cause. "Ask me anything" wants somebody.

Those frames are ordinary English rather than notes about particular cards —
"because of X" wants a cause whichever card it turns up in — and a test refuses
any frame that only matches one card in the printed decks, so this cannot
quietly rot into a lookup table.

**That part is a floor, not the joke.** It is scored as a gate: once a card is
plausibly an answer, being *more* on-topic earns nothing further. This matters
more than it sounds. Left as a straight score it makes the blandest card that
fits win every round, which is how you end up playing "Betcha can't have just
one! — Boneless buffalo wings." — exactly the right sort of thing, and not a
joke at all. Past the gate, what decides it is:

- **Register clash.** A prim setup with an indecent answer. Rude is not only
  bodily: a crucifixion in a snack advert does the same work as a fart in one,
  and an advertising voice counts as prim because a voice putting on a smile is
  a voice worth ruining.
- **How much of a picture it paints.** Detail is an asset, not a cost. "An
  octopus giving seven handjobs and smoking a cigarette" wins rounds that "A
  mistake." never will. A card earns its imagery from what is actually in it —
  physical words, names, numbers, bodily words, adjectives you could see — and
  loses it for abstract morphology and concept words. There is no floor, because
  a floor hands every unlisted abstraction the same score as a real picture.
- **Something alive where a thing was expected.** An audience in the bathroom
  and a sperm whale on an aeroplane are the same joke, and none of the other
  signals can see it.
- **How far the card travels inside itself.** An answer that collides two
  different worlds is doing something; one that names a single concept is not.
- **Contrast** with the setup's own world, across thirteen little domains.
- **Grammar**, so "I was bitten by a ___" does not end up reading "a a bear",
  and **echo**, because borrowing the setup's own words back reads flat.

Six personalities weigh those differently, which is the point — a table where
every bot plays the same card is not a game. Bex goes for the rudest thing in
her hand; Wendell answers a lurid question with something painfully ordinary;
Nadia wants the strangest and most specific card; Ozzy wants a name or a number;
Hutch plays whatever reads best in the sentence; Pip is chaotic and loses more
than the others. Dealt the same hand, the six of them find about three different
cards between them, and all six agree on 4% of rounds.

For a Pick 2 the holes are filled together rather than one at a time, because
two answers out of the same world read as one flat idea.

### Is any of that actually working?

A bot beating a random player is not evidence when the judge is another bot
running the same scorer — they agree by construction. So there are two held-out
benchmarks of real cards instead, and the model is not allowed to know about
either: a test rewords the setups and checks the answer does not move.

**Is it answering the question?** Twenty pairings where a person's pick is not in
doubt, against cards from the same deck that plainly do not work. The first
version of this scored 8 out of 20 — it would answer "What's that sound?" with
"Former President George W. Bush." It now scores 20.

**Is it actually funny?** Sixteen pairings where *both* cards are already the
right sort of thing for the hole, and the only difference is that one of them is
a joke. Passing the first benchmark alone only makes a bot literal-minded, and a
literal-minded player is the worst one at the table. It scored 9 of 16 on the day
that benchmark was written. It now scores 16.

**Can it tell a picture from an idea?** Twenty-two cards you could photograph
against twenty-four you could only argue about, every pair compared. This is the
bluntest of the three and the one that stops "Boomers." and "The death penalty."
turning up in a round where somebody else played nipple blades. It also refuses
to let the scale saturate: when this was first measured, 33 cards were tied at
the top of it and half the deck sat in a single narrow band, which is a model
that has stopped telling anything from anything. It went from 94.3% of pairs the
right way round, with 33 cards clamped, to 98.1% with one.

The other measurement, for what it is worth: against six bots and one seat that
just plays off the top of its hand, the random seat wins 2.4% of rounds where an
even split would be 14.3%.

### Judging is measured separately

A bot that plays well and judges at random is worse for a table than one that
does neither, because it hands out points for nothing — and until it was
measured, nothing tested the half of a bot's job that decides everybody else's
score. It turned out the accuracy was fine (82–100% of the time it gives the
point to the better card) and the problem was somewhere else entirely: the
judges all agreed with each other. Ozzy and Hutch reached the same verdict on
85% of rounds, which makes it meaningless who is holding the Czar card.

So a bot now judges with more conviction than it plays with. Playing a card is
a guess at what the Czar wants, so it hedges towards the table's shared taste;
holding the Czar card is the one moment its own taste is the only thing that
counts, so it stops hedging. Average agreement between any two judges fell from
roughly four rounds in five to under three, without costing accuracy.

### They work out who they are playing with

Every bot watches every verdict, including ones it was not part of, and compares
the card that won against the cards that lost. What set the winner apart nudges
what it believes about **that particular judge**, and only that judge. So if you
keep rewarding the gross card, the bots will start handing you gross cards —
even the ones who do not personally find it funny.

The nudge is bounded, so a bot never entirely stops being itself, and it is
forgotten when the table closes. Nothing is sent anywhere.

At a five-seat table over 2,500 rounds, a bot that watches the judge beats an
identical twin that does not — but how much depends on who is watching. It is
worth a lot to Wendell (58–73%) and Hutch (48–68%), something to Bex and Ozzy
(50–60%), and nothing at all to Nadia and Pip (46–52%). That last part is not a
bug being glossed over: those two are the absurdist and the chaotic one, their
picks are driven by high-variance signals on purpose, and there is not much for
evidence to move.

Bots answer on a delay and pause entirely if every human has left, so a table
nobody is sitting at does not quietly finish the game without you.

## Sound

**The TV** plays background music on a loop and a handful of synthesised cues:
a card landing when someone hands in, a flick when the Czar turns one over, and
a chord when a round or the game is won. The music ducks under the winning card
so the room hears the joke. Volume and mute are in the lobby and persist; the
speaker icon in the corner and the <kbd>M</kbd> key toggle mute at any time.

**Phones** click and buzz together. A tick when you pick a card up, a lower one
when you put it back, a two-note confirm when your cards go in, a low buzz if
the table turns a move down, and a flourish when you take the round. The clicks
are quiet and short by design, because a table can hold eight phones; the
speaker icon in the phone's header turns them off, and the choice is remembered.
Anyone who has asked their system for reduced motion gets no vibration.

**An online table** carries the room itself, because there is no TV to do it.
The device that opened the table plays the same loop, with the same controls in
the lobby and the same ducking under a winning card. A phone joining a TV in the
same room deliberately does not: two copies of one loop a half-second apart is
worse than silence.

Every cue on both screens is synthesised in the browser from a few oscillators,
so there is nothing to download and nothing to license. The background music is
the one exception: it is a real file, and it is the one thing here you should
think about before redistributing.

### The music track

A track ships with the site at `public/music/tv-loop.webm` and starts by itself
when the TV opens a table. It is a 30 MB Opus file that streams as it plays, so
the game is usable long before it has finished downloading.

To use something else, press **Use a different track** on the TV and pick a file
from that device; on Chrome and Edge the choice is remembered between sessions
and takes priority over the bundled one. To change what ships, replace the file:

```bash
ffmpeg -i whatever.mp3 -vn -c:a libopus -b:a 64k public/music/tv-loop.webm
```

Only bundle music you have the right to distribute — the file is served to
everyone who opens the site.

## Keyboard

The thing driving a TV is usually a laptop with a stray keyboard or a remote.

| Key | Does |
| --- | --- |
| <kbd>M</kbd> | Mute or unmute the music |
| <kbd>Enter</kbd> | Start the game, from the lobby |
| <kbd>Tab</kbd> | Everything is reachable and has a visible focus ring |

## Running it

```bash
npm install
npm run dev
```

Then open the address it prints. To play across devices on the same wifi, use
the network address Vite shows rather than `localhost`.

```bash
npm test          # game rules and deck integrity
npm run build     # production build into dist/
npm run typecheck
npm run e2e       # plays a whole game in a real browser; needs a dev server
```

`npm run e2e` drives one TV page and three phone pages through a full round,
including the deck switch. It needs `npx playwright install chromium` once, and
a network path to the signalling broker, so it is kept out of CI.

The unit tests cover the parts that do not need a browser: the rules, the two
decks, turn order, and what happens when people's phones die at the worst
possible moment (`test/resilience.test.ts`).

## Deploying

The build is a static site with a relative base, so it works from any path.
Pushing to `main` publishes it to GitHub Pages through
`.github/workflows/deploy.yml`. Enable it once under **Settings → Pages → Build
and deployment → Source → GitHub Actions**.

Anything that serves static files will do.

## How it works without a server

The TV is the host and the only authority. It owns the deck, the hands and the
scores, and it re-checks every move a phone sends: a phone cannot play a card it
does not hold, play twice, play out of turn, or judge a round it is not judging.

Phones reach the TV over WebRTC data channels, brokered by the public PeerJS
signalling server. The room code becomes the peer id. Signalling is the only
thing that touches the network; the game itself is peer to peer, so no card text
and no player name ever reaches a server we run. There isn't one.

To point at your own PeerJS broker instead of the public one, add
`?peer=host:port` to the URL.

### Layout

```
src/
  data/          The four decks, transcribed from the printed boxes:
                 black/white.json and family-black/family-white.json.
  game/          Rules. Pure functions, no network, no React.
  bots/          What a bot finds funny: what kind of thing a hole wants,
                 the lexicons, and the taste weights. Pure, and testable.
  net/           Host (the table), clients over WebRTC or in the same tab,
                 public table discovery, and the message protocol.
  audio/         Music, synthesised cues, phone haptics.
  ui/            Cards, buttons, the code input, the settings controls.
  screens/       Home and the menus, Tv, Phone, Online.
```

The rules layer knows nothing about the network, and the network layer knows
nothing about React, so the whole game can be played out in tests.

A seat talks to the table through one small message protocol. Online, the
person running the table is also sitting at it, so their seat is wired straight
into the host in the same tab — the player screen cannot tell the difference,
which is why there is only one of them.

### What loads when

The front page pulls down two chunks and nothing else — the TV and phone screens
are split out, and the card decks are not imported just to print a count on the
home page. A phone that scans the QR code downloads the phone screen and the
peer stack; it never downloads the QR encoder, and the TV never downloads a deck
it is not using.

## Known limits

- **Three players minimum.** Two people cannot play: someone has to judge.
  You can make up the numbers with bots.
- **One player per browser profile.** Seats are keyed to `localStorage`, so two
  people on one phone would share a seat. In practice everyone has their own.
- **WebRTC needs to get through.** On most home wifi this is fine. On a locked
  down corporate or guest network the phones may not reach the TV, since there
  is no TURN relay configured.
- **A phone that dies takes up to 25 seconds to be noticed.** WebRTC holds a
  connection open long after the browser behind it has gone, and a locked phone
  looks much the same as a dead one, so the table waits a little before playing
  on without somebody. Seats and scores are kept either way.
- **Public tables are limited by how many reserved codes there are.** Twenty-one
  at a time. If they are all busy, open a private one.
- **The public signalling broker is free and occasionally busy.** If a table
  will not open, reload. The TV takes a new code automatically if the one it
  picked is taken.
- **Remembering a music track is Chromium only.** Everywhere else the file
  picker still works, it just asks again next time.
- **iOS does not vibrate.** The Vibration API is not implemented there, so
  iPhones stay still. Nothing depends on it.

## Credits and licence

*Cards Against Humanity* is by Cards Against Humanity LLC and is distributed
under a [Creative Commons BY-NC-SA 2.0 licence][cc]. The card text here was
transcribed from their official 2022 print-and-play PDF.

This is an unofficial, non-commercial fan implementation. It is not affiliated
with, endorsed by, or connected to Cards Against Humanity LLC. Under Share
Alike, it is released under the same licence: see [LICENSE.md](LICENSE.md). You
may not sell it or any derivative of it.

The room code input is adapted from the [21st.dev][21st] OTP input component.
The bundled music track is not covered by this licence; replace it if you
redistribute this.

[cc]: https://creativecommons.org/licenses/by-nc-sa/2.0/
[21st]: https://21st.dev/@ddoemonn/components/otp-input
