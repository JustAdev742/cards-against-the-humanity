# Cards Against The Humanity

Cards Against Humanity for a living room. Put the TV on the big screen, everyone
else joins from their phone. No app to install, no account, and no game server:
the TV hosts the game and the phones talk to it directly.

The full 2022 print-and-play deck is included — 100 black cards and 500 white
cards, transcribed from the official PDF.

**Play it:** <https://joviangame.me/cards-against-the-humanity/>

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
| Deck | Full · Family | Family is the printed deck with the adult cards removed. |
| Play to | 5 · 7 · 10 | Roughly a quarter hour, half an hour, a whole evening. |
| Rando Cardrissian | Off · On | A random card plays every round. If it wins, everyone should feel bad. |
| Music | Volume, mute, track | TV only. See below. |

### Two decks

| Deck | Cards | For |
| --- | --- | --- |
| Full | 500 white, 100 black | The game as printed. Adults. |
| Family | 237 white, 84 black | About twelve and up. |

The family deck removes the adult cards rather than bleeping them: a starred-out
word is not a joke any more, so those cards are simply never dealt. Anything
sexual, any drug reference, any slur, and the cards about suicide, self-harm and
real atrocities are all out. What is left is the absurd half of the deck, which
is most of what makes the game funny.

`test/engine.test.ts` enforces this: every family card has to exist in the
printed deck, the deck has to be big enough for ten players, and no family card
may match a list of adult terms. If a card is ever misfiled, the tests fail.

## Sound

Sound lives on the TV and haptics live on the phones. The TV has the speakers,
and eight phones chirping at once would be unbearable.

**The TV** plays background music on a loop and a handful of synthesised cues:
a card landing when someone hands in, a flick when the Czar turns one over, and
a chord when a round or the game is won. The music ducks under the winning card
so the room hears the joke. Volume and mute are in the lobby and persist; the
speaker icon in the corner and the <kbd>M</kbd> key toggle mute at any time.

**Phones** buzz instead: a tick when you pick a card up, a firmer one when your
cards go in, a pattern when the round wants something from you, and a flourish
when you take it. Anyone who has asked their system for reduced motion gets none
of it.

### Choosing a track

The deployed site ships no music, so it isn't redistributing anyone's. Press
**Add music from this device** on the TV and pick an audio file; it loops for
the whole game. On Chrome and Edge the choice is remembered between sessions, so
you only pick it once.

To bundle a track into your own build instead, drop it at
`public/music/tv-loop.webm` and it is picked up automatically. That path is
gitignored — keep whatever you put there out of a public repo unless you have
the right to distribute it.

```bash
ffmpeg -i whatever.mp3 -vn -c:a libopus -b:a 64k public/music/tv-loop.webm
```

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
  data/          The decks. black.json and white.json are the printed deck;
                 family-*.json are allowlists of exact card text.
  game/          Rules. Pure functions, no network, no React.
  net/           Host (TV), client (phone), and the message protocol.
  audio/         Music, synthesised cues, phone haptics.
  ui/            Cards, buttons, the code input, the settings controls.
  screens/       Home, Tv, Phone.
```

The rules layer knows nothing about the network, and the network layer knows
nothing about React, so the whole game can be played out in tests.

### What loads when

The front page pulls down two chunks and nothing else — the TV and phone screens
are split out, and the card decks are not imported just to print a count on the
home page. A phone that scans the QR code downloads the phone screen and the
peer stack; it never downloads the QR encoder, and the TV never downloads a deck
it is not using.

## Known limits

- **Three players minimum.** Two people cannot play: someone has to judge.
- **One player per browser profile.** Seats are keyed to `localStorage`, so two
  people on one phone would share a seat. In practice everyone has their own.
- **WebRTC needs to get through.** On most home wifi this is fine. On a locked
  down corporate or guest network the phones may not reach the TV, since there
  is no TURN relay configured.
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
The sound cues are synthesised in the browser, so there is nothing to credit.

[cc]: https://creativecommons.org/licenses/by-nc-sa/2.0/
[21st]: https://21st.dev/@ddoemonn/components/otp-input
