let audioCtx, analyser, waveAnalyser, source, gainNode, compressor, destination;
let eqFilters = [];
let isPlaying = false, isMicActive = false;
let audioBuffer = null, micStream = null;
let startTime = 0, pauseOffset = 0;
let animFrameId;

const EQ_BANDS = [
  { freq: 32, label: '32Hz', type: 'lowshelf' },
  { freq: 64, label: '64Hz', type: 'peaking' },
  { freq: 125, label: '125Hz', type: 'peaking' },
  { freq: 250, label: '250Hz', type: 'peaking' },
  { freq: 500, label: '500Hz', type: 'peaking' },
  { freq: 1000, label: '1kHz', type: 'peaking' },
  { freq: 2000, label: '2kHz', type: 'peaking' },
  { freq: 4000, label: '4kHz', type: 'peaking' },
  { freq: 8000, label: '8kHz', type: 'peaking' },
  { freq: 16000, label: '16kHz', type: 'highshelf' },
];

const PRESETS = {
  flat: [0,0,0,0,0,0,0,0,0,0],
  bass: [8,7,5,3,1,0,0,-1,-2,-3],
  treble: [-3,-2,-1,0,0,1,3,5,7,8],
  vocal: [-2,-2,0,2,4,4,2,1,0,-1],
  rock: [4,3,2,0,-1,0,2,3,4,4],
  electronic: [6,4,1,-2,-3,-1,2,3,4,5],
  jazz: [4,3,1,2,-2,-2,0,1,2,3],
};

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Eq Filters used for the booost , cut frequecy ke liye 
  eqFilters = EQ_BANDS.map(band => {
    const f = audioCtx.createBiquadFilter();
    f.type = band.type;
    f.frequency.value = band.freq;
    f.Q.value = 1.4;
    f.gain.value = 0;
    return f;
  });

  // Compressor  loud peaks ko control karta h 
  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Gain
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.8;

  // Analysers spectrum visualizer
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  waveAnalyser = audioCtx.createAnalyser();
  waveAnalyser.fftSize = 2048;

  
  for (let i = 0; i < eqFilters.length - 1; i++) {
    eqFilters[i].connect(eqFilters[i + 1]);
  }
  eqFilters[eqFilters.length - 1].connect(compressor);
  compressor.connect(gainNode);
  gainNode.connect(analyser);
  gainNode.connect(waveAnalyser);
  analyser.connect(audioCtx.destination);

  document.getElementById('sampleRate').textContent = audioCtx.sampleRate + ' Hz';
  document.getElementById('latency').textContent = (audioCtx.baseLatency * 1000).toFixed(1) + ' ms';

  buildEQSliders();
  startVisualizer();
  updateKnob('comp', 50);
  updateKnob('stereo', 50);
  updateKnob('gain', 50);
}

//  Eq UI h 
function buildEQSliders() {
  const grid = document.getElementById('eqGrid');
  grid.innerHTML = '';
  EQ_BANDS.forEach((band, i) => {
    const div = document.createElement('div');
    div.className = 'eq-band';
    div.innerHTML = `
      <div class="eq-value" id="eqVal${i}">0dB</div>
      <div class="eq-slider-wrap">
        <div class="eq-center-line"></div>
        <input type="range" class="vertical" orient="vertical" 
          min="-15" max="15" value="0" step="0.5"
          oninput="setEQBand(${i}, this.value)"
          style="height:140px">
      </div>
      <div class="eq-freq">${band.label}</div>`;
    grid.appendChild(div);
  });
}

function setEQBand(i, val) {
  if (eqFilters[i]) eqFilters[i].gain.value = parseFloat(val);
  document.getElementById(`eqVal${i}`).textContent = (val > 0 ? '+' : '') + parseFloat(val).toFixed(1) + 'dB';
  const color = val > 0 ? 'var(--accent)' : val < 0 ? 'var(--accent2)' : 'var(--muted)';
  document.getElementById(`eqVal${i}`).style.color = color;
}

function applyPreset(name) {
  const vals = PRESETS[name];
  document.querySelectorAll('.eq-band input').forEach((inp, i) => {
    inp.value = vals[i];
    setEQBand(i, vals[i]);
  });
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

//  File Input 
document.getElementById('dropZone').addEventListener('dragover', e => {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
});
document.getElementById('dropZone').addEventListener('dragleave', e => e.currentTarget.classList.remove('dragover'));
document.getElementById('dropZone').addEventListener('drop', e => {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});
document.getElementById('file-input').addEventListener('change', e => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

let audioElement = null;
let mediaSource = null;
let objectURL = null;

async function loadFile(file) {
  initAudio();
  stopAudio();

  //  previous object URL
  if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = null; }
  if (mediaSource) { try { mediaSource.disconnect(); } catch(e) {} mediaSource = null; }
  if (audioElement) { audioElement.pause(); audioElement = null; }

  // file type 
  const allowed = ['audio/mpeg','audio/mp3','audio/wav','audio/wave','audio/ogg','audio/aac','audio/flac','audio/x-flac','audio/mp4','audio/webm','audio/x-m4a'];
  if (!file.type.startsWith('audio/') && !allowed.some(t => file.name.toLowerCase().endsWith(t.split('/')[1]))) {
    document.getElementById('trackName').textContent = 'ERROR: NOT AN AUDIO FILE';
    document.getElementById('trackSub').textContent = 'SUPPORTED: MP3, WAV, OGG, AAC, FLAC, M4A';
    return;
  }

  document.getElementById('trackName').textContent = 'LOADING…';
  document.getElementById('trackSub').textContent = file.name;
  document.getElementById('statusText').textContent = 'LOADING';

  // cretae URL and audio element
  objectURL = URL.createObjectURL(file);
  audioElement = new Audio();
  audioElement.crossOrigin = 'anonymous';
  audioElement.preload = 'auto';

  audioElement.onerror = () => {
    document.getElementById('trackName').textContent = 'ERROR: COULD NOT DECODE AUDIO';
    document.getElementById('trackSub').textContent = 'TRY A DIFFERENT FORMAT (MP3 OR WAV RECOMMENDED)';
    document.getElementById('statusText').textContent = 'ERROR';
  };

  audioElement.onloadedmetadata = () => {
    const dur = audioElement.duration;
    const name = file.name.toUpperCase().replace(/\.[^.]+$/, '');
    document.getElementById('trackName').textContent = name;
    document.getElementById('trackSub').textContent = `${(dur/60|0)}:${String(Math.floor(dur%60)).padStart(2,'0')} · ${file.type || 'AUDIO'}`;
    document.getElementById('channels').textContent = '2CH';
    document.getElementById('statusText').textContent = 'READY';
    document.getElementById('dropZone').style.display = 'none';
    audioBuffer = true; 

    // Audio graphy h 
    mediaSource = audioCtx.createMediaElementSource(audioElement);
    mediaSource.connect(eqFilters[0]);

    // Auto play
    audioCtx.resume().then(() => {
      audioElement.play().then(() => {
        isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸ PAUSE';
        document.getElementById('statusText').textContent = 'PLAYING';
        updateProgressEl();
      }).catch(e => {
        document.getElementById('statusText').textContent = 'READY (CLICK PLAY)';
      });
    });

    audioElement.onended = () => {
      isPlaying = false;
      document.getElementById('playBtn').textContent = '▶ PLAY';
      document.getElementById('statusText').textContent = 'STOPPED';
      document.getElementById('progressFill').style.width = '0%';
    };
  };

  audioElement.src = objectURL;
}

function updateProgressEl() {
  if (!audioElement || audioElement.paused) return;
  const pct = (audioElement.currentTime / audioElement.duration) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
  requestAnimationFrame(updateProgressEl);
}

function connectSource(src) {
  src.connect(eqFilters[0]);
}

function togglePlay() {
  initAudio();
  if (!audioElement && !isMicActive) return;
  audioCtx.resume();
  if (isPlaying) {
    audioElement.pause();
    isPlaying = false;
    document.getElementById('playBtn').textContent = '▶ PLAY';
    document.getElementById('statusText').textContent = 'PAUSED';
  } else {
    audioElement.play();
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸ PAUSE';
    document.getElementById('statusText').textContent = 'PLAYING';
    updateProgressEl();
  }
}

function stopAudio(reset = true) {
  if (audioElement) {
    audioElement.pause();
    if (reset) { audioElement.currentTime = 0; document.getElementById('progressFill').style.width = '0%'; }
  }
  isPlaying = false;
  if (!isMicActive) document.getElementById('statusText').textContent = 'IDLE';
}

document.getElementById('progressBar').addEventListener('click', (e) => {
  if (!audioElement) return;
  const pct = e.offsetX / e.currentTarget.offsetWidth;
  audioElement.currentTime = pct * audioElement.duration;
});

function setVolume(v) { if (gainNode) gainNode.gain.value = parseFloat(v); }

// Mic feature bhi h 
async function toggleMic() {
  initAudio();
  if (isMicActive) {
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (source) { try { source.disconnect(); } catch(e) {} source = null; }
    isMicActive = false;
    document.getElementById('micBtn').classList.remove('active');
    document.getElementById('statusText').textContent = 'IDLE';
    document.getElementById('channels').textContent = '—';
  } else {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      source = audioCtx.createMediaStreamSource(micStream);
      connectSource(source);
      isMicActive = true;
      document.getElementById('micBtn').classList.add('active');
      document.getElementById('trackName').textContent = 'MICROPHONE INPUT';
      document.getElementById('trackSub').textContent = 'LIVE AUDIO — REAL-TIME PROCESSING';
      document.getElementById('statusText').textContent = 'LIVE';
      document.getElementById('channels').textContent = '1CH';
    } catch(e) {
      alert('Microphone access denied.');
    }
  }
}

// circular small disk

function updateKnob(id, val) {
  const deg = (val / 100) * 270 - 135;
  const startDeg = -135;
  const activeDeg = deg - startDeg;
  const knob = document.getElementById(id + 'Knob');
  if (knob) {
    knob.style.background = `conic-gradient(transparent ${startDeg + 135}deg, var(--accent) ${startDeg + 135}deg ${deg + 135}deg, var(--border) ${deg + 135}deg)`;
  }
  document.getElementById(id + 'Val').textContent = Math.round(val) + '%';
  if (id === 'comp' && compressor) {
    compressor.ratio.value = 1 + (val / 100) * 19;
  }
  if (id === 'gain' && gainNode) {
    gainNode.gain.value = parseFloat(document.getElementById('volumeSlider').value) * (0.5 + val / 100);
  }
}

// main part visualizer
function startVisualizer() {
  const canvas = document.getElementById('visualizer');
  const wCanvas = document.getElementById('waveform');
  const ctx = canvas.getContext('2d');
  const wCtx = wCanvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    wCanvas.width = wCanvas.offsetWidth;
    wCanvas.height = wCanvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    animFrameId = requestAnimationFrame(draw);
    const W = canvas.width, H = canvas.height;
    const wW = wCanvas.width, wH = wCanvas.height;

    // Spectrum
    const bufLen = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(freqData);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, W, H);

    const barCount = 120;
    const barW = W / barCount - 1;

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor(i * bufLen / barCount);
      const val = freqData[idx] / 255;
      const barH = val * (H - 10);
      const x = i * (barW + 1);

      // Gradient bar
      const hue = 160 + val * 100;
      const grad = ctx.createLinearGradient(0, H, 0, H - barH);
      grad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.9)`);
      grad.addColorStop(1, `hsla(${hue + 40}, 100%, 80%, 0.4)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, H - barH, barW, barH);

      // Peak dots
      if (val > 0.7) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, H - barH - 2, barW, 2);
      }
    }

    // Reflection
    ctx.globalAlpha = 0.15;
    ctx.scale(1, -0.3);
    ctx.drawImage(canvas, 0, -H * (1 / 0.3 + 1));
    ctx.scale(1, -1 / 0.3);
    ctx.globalAlpha = 1;

    // Waveform
    const timeData = new Uint8Array(waveAnalyser.fftSize);
    waveAnalyser.getByteTimeDomainData(timeData);

    wCtx.fillStyle = '#0a0a10';
    wCtx.fillRect(0, 0, wW, wH);

    wCtx.beginPath();
    wCtx.lineWidth = 1.5;
    wCtx.strokeStyle = '#00ffe0';
    wCtx.shadowBlur = 6;
    wCtx.shadowColor = '#00ffe0';

    const sliceW = wW / timeData.length;
    let xPos = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128;
      const y = (v * wH) / 2;
      if (i === 0) wCtx.moveTo(xPos, y);
      else wCtx.lineTo(xPos, y);
      xPos += sliceW;
    }
    wCtx.stroke();
    wCtx.shadowBlur = 0;
  }

  draw();
}


window.addEventListener('load', () => {
  
  document.addEventListener('click', () => initAudio(), { once: true });
});