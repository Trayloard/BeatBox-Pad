import { useState, useEffect, useRef, useCallback } from 'react';

type VoiceInfo = {
  voice: SpeechSynthesisVoice;
  quality: 'neural' | 'enhanced' | 'standard';
  latency: 'local' | 'remote';
};

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (v.localService) score += 10;
  if (name.includes('neural') || name.includes('premium')) score += 8;
  if (name.includes('enhanced') || name.includes('natural')) score += 4;
  if (name.includes('google')) score += 3;
  if (name.includes('microsoft') && name.includes('online')) score += 3;
  return score;
}

function classifyVoice(v: SpeechSynthesisVoice): VoiceInfo {
  const name = v.name.toLowerCase();
  let quality: VoiceInfo['quality'] = 'standard';
  if (name.includes('neural') || name.includes('premium')) quality = 'neural';
  else if (name.includes('enhanced') || name.includes('natural') || name.includes('google')) quality = 'enhanced';
  return {
    voice: v,
    quality,
    latency: v.localService ? 'local' : 'remote',
  };
}

const QUALITY_LABEL: Record<VoiceInfo['quality'], string> = {
  neural: 'NEURAL',
  enhanced: 'ENHANCED',
  standard: 'STANDARD',
};

const QUALITY_COLOR: Record<VoiceInfo['quality'], string> = {
  neural: '#22c55e',
  enhanced: '#3b82f6',
  standard: '#888',
};

export function TTSWidget() {
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [text, setText] = useState('');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [open, setOpen] = useState(false);

  const synthRef = useRef(window.speechSynthesis);

  const loadVoices = useCallback(() => {
    const raw = synthRef.current.getVoices();
    if (!raw.length) return;
    const sorted = raw
      .map(classifyVoice)
      .sort((a, b) => scoreVoice(b.voice) - scoreVoice(a.voice));
    setVoices(sorted);
    setSelectedIdx(0);
  }, []);

  useEffect(() => {
    loadVoices();
    synthRef.current.addEventListener('voiceschanged', loadVoices);
    return () => synthRef.current.removeEventListener('voiceschanged', loadVoices);
  }, [loadVoices]);

  useEffect(() => {
    const synth = synthRef.current;
    const tick = setInterval(() => {
      setIsSpeaking(synth.speaking);
      setIsPaused(synth.paused);
    }, 100);
    return () => clearInterval(tick);
  }, []);

  const speak = () => {
    if (!text.trim() || !voices.length) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text.trim());
    utt.voice = voices[selectedIdx].voice;
    utt.rate = rate;
    utt.pitch = pitch;
    utt.lang = voices[selectedIdx].voice.lang;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    synthRef.current.speak(utt);
  };

  const togglePause = () => {
    if (synthRef.current.paused) {
      synthRef.current.resume();
      setIsPaused(false);
    } else {
      synthRef.current.pause();
      setIsPaused(true);
    }
  };

  const stop = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const best = voices[selectedIdx];

  return (
    <div
      style={{
        backgroundColor: '#0d0d10',
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
        overflow: 'hidden',
        fontFamily: "'DM Mono', 'Courier New', monospace",
      }}
    >
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#FFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em', color: '#FFF' }}>
            TTS
          </span>
          <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em' }}>
            TEXT-TO-SPEECH
          </span>
          {/* Status dot */}
          {isSpeaking && !isPaused && (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                display: 'inline-block',
                boxShadow: '0 0 6px #22c55e',
                animation: 'tts-pulse 1s ease-in-out infinite',
              }}
            />
          )}
          {isPaused && (
            <span style={{ fontSize: '10px', color: '#f59e0b', letterSpacing: '0.1em' }}>PAUSED</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Best voice badge */}
          {best && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: QUALITY_COLOR[best.quality],
                border: `1px solid ${QUALITY_COLOR[best.quality]}`,
                padding: '2px 6px',
                borderRadius: '3px',
              }}
            >
              {QUALITY_LABEL[best.quality]} · {best.latency.toUpperCase()}
            </span>
          )}
          <span style={{ color: '#555', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expandable body */}
      {open && (
        <div
          style={{
            borderTop: '1px solid #1a1a1a',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Text input */}
          <div>
            <label style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', display: 'block', marginBottom: '5px' }}>
              TEXT INPUT
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type text to speak..."
              rows={2}
              style={{
                width: '100%',
                backgroundColor: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: '6px',
                color: '#FFF',
                fontSize: '13px',
                padding: '8px 10px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Voice selector */}
          <div>
            <label style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', display: 'block', marginBottom: '5px' }}>
              VOICE — SORTED BY QUALITY
            </label>
            <select
              value={selectedIdx}
              onChange={e => setSelectedIdx(Number(e.target.value))}
              style={{
                width: '100%',
                backgroundColor: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: '6px',
                color: '#FFF',
                fontSize: '12px',
                padding: '6px 10px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              {voices.map((vi, i) => (
                <option key={`${vi.voice.name}-${i}`} value={i}>
                  {QUALITY_LABEL[vi.quality]} · {vi.voice.name} [{vi.voice.lang}]
                </option>
              ))}
            </select>
          </div>

          {/* Rate + Pitch sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>RATE</span>
                <span style={{ color: '#FFF' }}>{rate.toFixed(1)}×</span>
              </label>
              <input
                type="range" min={0.5} max={2.0} step={0.1}
                value={rate}
                onChange={e => setRate(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#FF3B00' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>PITCH</span>
                <span style={{ color: '#FFF' }}>{pitch.toFixed(1)}</span>
              </label>
              <input
                type="range" min={0.5} max={2.0} step={0.1}
                value={pitch}
                onChange={e => setPitch(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#FF3B00' }}
              />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={speak}
              disabled={!text.trim() || !voices.length}
              style={{
                flex: 2,
                backgroundColor: isSpeaking ? '#1a1a1a' : '#FF3B00',
                color: isSpeaking ? '#555' : '#FFF',
                border: 'none',
                borderRadius: '6px',
                padding: '9px 0',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                cursor: !text.trim() || !voices.length ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              SPEAK
            </button>

            {isSpeaking && (
              <button
                onClick={togglePause}
                style={{
                  flex: 1,
                  backgroundColor: '#1a1a1a',
                  color: '#f59e0b',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  padding: '9px 0',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {isPaused ? 'RESUME' : 'PAUSE'}
              </button>
            )}

            <button
              onClick={stop}
              style={{
                flex: 1,
                backgroundColor: '#1a1a1a',
                color: '#888',
                border: '1px solid #222',
                borderRadius: '6px',
                padding: '9px 0',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              STOP
            </button>
          </div>

          {/* Info bar */}
          {best && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#444',
                borderTop: '1px solid #1a1a1a',
                paddingTop: '8px',
              }}
            >
              <span>ENGINE: WEB SPEECH API · COST: FREE</span>
              <span style={{ color: best.latency === 'local' ? '#22c55e' : '#f59e0b' }}>
                {best.latency === 'local' ? 'LOCAL · ZERO LATENCY' : 'ONLINE · LOW LATENCY'}
              </span>
            </div>
          )}

          {voices.length === 0 && (
            <div style={{ fontSize: '11px', color: '#f59e0b', textAlign: 'center' }}>
              No voices found. Check browser / OS speech settings.
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes tts-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
