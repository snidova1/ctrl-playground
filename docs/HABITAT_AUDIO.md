# CTRL Habitat: real self-hosted ambient game music

Delivered file: public/audio/ctrl-garden-afternoon.wav (original procedural composition made for CTRL in this branch, 40 seconds, 96 BPM, mono 16kHz WAV, 1.28MB). Soft electric-piano-style keys, mellow bells, pad, plucked melody, bass, restrained percussion. The recording is an initial original music study, not a mastered commercial soundtrack.

Music control: appears after a wallet-authenticated Habitat state loads, including Character Creator and personal world. Tapping Music starts playback immediately using a real gesture, so iPhone Safari autoplay constraints are respected. Tap again to pause. While playing a compact volume slider appears. Hidden/background tabs pause playback. A single player survives in-app world/build/wardrobe panel switching. Audio never follows other avatars, and no backend/API multiplayer resources are required. Music file preload is disabled until play.

Research references ONLY, none shipped or sampled:
- Nintendo Animal Crossing hourly ambience, a reference for gentle non-fatiguing world tunes; do not copy recordings or melodies: https://animal-crossing-radio.com/
- Stardew Valley spring / town music, a reference for cozy melodic world-building; not licensed for reuse: https://www.stardewvalleywiki.com/Modding:Audio
- Bobjt, peacefull ville, OpenGameArt, published CC0 town loop: https://opengameart.org/content/peacefull-ville
- haruta, peaceful town, OpenGameArt, published CC0 short game tune: https://opengameart.org/content/peaceful-town-1
- HoliznaCC0, Quiet Village music collection, OpenGameArt CC0: https://opengameart.org/content/quiet-village-collection
- Kenney Interface Sounds and Music Jingles, short CC0 one-shots suitable for future SFX (not background beds): https://kenney.nl/assets/interface-sounds and https://kenney.nl/assets/music-jingles

Future curated track imports should verify the individual original author and track's rights, hash, original licensed source, loop points and iPhone Safari playback. Do not represent someone else's CC0 music as a custom CTRL original.

QA before release: Confirm Chrome + Safari tapping works (no automatic sound on wallet entry), 40-second loop transition sounds seamless, sound levels are gentle on headphones, muted player stays silent, app background pauses audio, 3D edit mode and Avatar Creator do not restart multiple tracks, no music iframe/third-party streaming dependency, no control overlap with left touch joystick or mobile overlay.

Conscious limits: this PR ships ONE real loop and UI player, not a full dynamic soundtrack or artist-mastered sound design. It deliberately avoids adding separate local footsteps/UI SFX until audio balancing is approved. No live deployment or main merge.
