# 🎛️ SOUND ENGINE — Web Audio Equalizer

A browser-based, real-time audio equalizer and visualizer built with the Web Audio API. Load any audio file or plug in your microphone and shape your sound with a 10-band EQ, effects chain, and live frequency visualizer.

---

## Features

- **10-Band Parametric EQ** — Control frequencies from 32 Hz to 16 kHz
- **7 EQ Presets** — Flat, Bass Boost, Treble, Vocal, Rock, Electronic, Jazz
- **Real-Time Visualizers** — Frequency spectrum and waveform display
- **Audio Effects** — Reverb, Compressor, Stereo Width, and Gain controls
- **Microphone Input** — Live real-time audio processing via mic
- **File Support** — Drag-and-drop or browse for audio files
- **Progress Bar** — Clickable seek bar for audio playback
- **Audio Info Bar** — Displays sample rate, latency, channels, and status

---

## Supported Audio Formats

| Format | Extension |
|--------|-----------|
| MP3    | `.mp3`    |
| WAV    | `.wav`    |
| OGG    | `.ogg`    |
| AAC    | `.aac`    |
| FLAC   | `.flac`   |
| M4A    | `.m4a`    |
| WebM   | `.webm`   |

---

## File Structure

```
├── equalizer-music.html   # Main HTML layout
├── style.css              # All styling and theming
├── script.js              # Web Audio API logic and visualizer
└── README.md              # This file
```

---

## Getting Started

No build step or installation required. Just open the HTML file in a modern browser.

```bash
# Option 1 — Open directly
open equalizer-music.html

# Option 2 — Serve locally (recommended to avoid CORS issues)
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080` in your browser.

> **Note:** A local server is recommended when loading audio files, as some browsers restrict file access from `file://` URLs.

---

## How to Use

### Loading Audio
- **Drag & Drop** an audio file onto the drop zone, or click **BROWSE** to pick a file.
- Playback starts automatically once the file is loaded.

### Playback Controls
| Button | Action |
|--------|--------|
| ▶ PLAY / ⏸ PAUSE | Toggle playback |
| ■ STOP | Stop and reset to beginning |
| ⦿ MIC INPUT | Toggle microphone live input |
| VOL slider | Adjust master volume |

Click anywhere on the **progress bar** to seek to that position.

### Equalizer
- Drag each vertical slider up (boost) or down (cut) to adjust that frequency band by up to ±15 dB.
- Current gain value is displayed above each band in real time.
- Click any **preset button** to instantly apply a preset curve.

### Effects
| Knob | Description |
|------|-------------|
| REVERB | Adds spatial depth (wet/dry mix) |
| COMPRESSOR | Controls dynamic range — ratio 1:1 to 20:1 |
| STEREO WIDTH | Widens or narrows the stereo image |
| GAIN | Fine-tunes output level |

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 66+ | ✅ Full |
| Firefox 76+ | ✅ Full |
| Safari 14.1+ | ✅ Full |
| Edge 79+ | ✅ Full |

> Microphone input requires HTTPS or `localhost` and user permission grant.

---

## Audio Signal Chain

```
Audio File / Mic Input
        ↓
  10-Band EQ Filters
        ↓
  Dynamics Compressor
        ↓
    Gain Node
        ↓
  Analyser (Spectrum + Waveform)
        ↓
  Audio Output (Speakers)
```

---

## Tech Stack

- **Vanilla JavaScript** — No frameworks or dependencies
- **Web Audio API** — All DSP processing is native to the browser
- **HTML5 Canvas** — Visualizer rendering
- **CSS Custom Properties** — Theming via CSS variables
- **Google Fonts** — Rajdhani & Share Tech Mono

---

## Known Limitations

- FLAC and some codec variants may not decode in all browsers (MP3 and WAV have widest support).
- Reverb knob updates the UI but full convolver reverb is not yet wired to a convolver node — it is a UI placeholder ready for extension.
- No audio export or recording functionality in the current version.

---

## License

MIT — free to use, modify, and distribute.
