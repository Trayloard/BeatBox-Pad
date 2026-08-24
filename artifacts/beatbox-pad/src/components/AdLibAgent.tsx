import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceRecorder } from '@workspace/integrations-openai-ai-react/audio';

// ── Types ──────────────────────────────────────────────────────────────────
type AgentState = 'idle' | 'loading' | 'recording' | 'processing' | 'playing' | 'error';

type ConversationEntry = {
  id: string;
  role: 'agent' | 'user';
  text: string;
};

type RecordingEntry = {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  duration: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getBaseUrl(): string {
  return import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';
}

const API_BASE = `${getBaseUrl()}/api`;

// ── Main Component ─────────────────────────────────────────────────────────
export function AdLibAgent() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AgentState>('idle');
  const [sessionId] = useState(() => crypto.randomUUID());
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'agent' | 'recorder'>('agent');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSessionStarted, setIsSessionStarted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useVoiceRecorder();

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      recordings.forEach(r => URL.revokeObjectURL(r.url));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addMessage = useCallback((role: 'agent' | 'user', text: string) => {
    setConversation(prev => [...prev, { id: crypto.randomUUID(), role, text }]);
  }, []);

  // ── SSE streaming from the agent API ─────────────────────────────────────
  const callAgent = useCallback(async (audioBlob?: Blob) => {
    setState('processing');
    setErrorMsg('');

    try {
      let audioBase64: string | undefined;
      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
        addMessage('user', '[Spracheingabe]');
      }

      const body: Record<string, string> = { sessionId };
      if (audioBase64) body.audio = audioBase64;

      const response = await fetch(`${API_BASE}/adlib/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let agentTranscript = '';
      let audiob64 = '';

      setState('playing');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.replace(/^data:\s*/, '');
          if (!line) continue;
          try {
            const event = JSON.parse(line);
            if (event.done) break;
            if (event.error) throw new Error(event.error);
            if (event.type === 'transcript') agentTranscript = event.data;
            if (event.type === 'audio') audiob64 = event.data;
            if (event.type === 'user_transcript') {
              // Update the last user message with real transcript
              setConversation(prev => {
                const copy = [...prev];
                for (let i = copy.length - 1; i >= 0; i--) {
                  if (copy[i].role === 'user' && copy[i].text === '[Spracheingabe]') {
                    copy[i] = { ...copy[i], text: event.data };
                    break;
                  }
                }
                return copy;
              });
            }
          } catch {
            // ignore parse errors in stream
          }
        }
      }

      // Play audio response
      if (audiob64) {
        const bytes = Uint8Array.from(atob(audiob64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setState('idle');
        };
        audio.onerror = () => setState('idle');
        await audio.play();
      }

      if (agentTranscript) addMessage('agent', agentTranscript);
      if (!audiob64) setState('idle');

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setState('error');
    }
  }, [sessionId, addMessage]);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    setIsSessionStarted(true);
    setState('loading');
    callAgent(undefined);
  }, [callAgent]);

  // ── Voice recording for agent ─────────────────────────────────────────────
  const handleAgentMicToggle = useCallback(async () => {
    if (recorder.state === 'recording') {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setRecordingDuration(0);
      const blob = await recorder.stopRecording();
      setState('processing');
      await callAgent(blob);
    } else {
      setState('recording');
      setRecordingDuration(0);
      durationTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
      await recorder.startRecording();
    }
  }, [recorder, callAgent]);

  // ── Own recording tab ─────────────────────────────────────────────────────
  const [ownRecording, setOwnRecording] = useState(false);
  const [ownDuration, setOwnDuration] = useState(0);
  const ownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ownRecorder = useVoiceRecorder();

  const toggleOwnRecording = useCallback(async () => {
    if (ownRecorder.state === 'recording') {
      if (ownTimerRef.current) clearInterval(ownTimerRef.current);
      setOwnRecording(false);
      const blob = await ownRecorder.stopRecording();
      const url = URL.createObjectURL(blob);
      const name = `AdLib ${recordings.length + 1}`;
      setRecordings(prev => [...prev, {
        id: crypto.randomUUID(),
        name,
        blob,
        url,
        duration: ownDuration,
      }]);
      setOwnDuration(0);
    } else {
      setOwnRecording(true);
      setOwnDuration(0);
      ownTimerRef.current = setInterval(() => setOwnDuration(d => d + 1), 1000);
      await ownRecorder.startRecording();
    }
  }, [ownRecorder, recordings.length, ownDuration]);

  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => {
      const r = prev.find(x => x.id === id);
      if (r) URL.revokeObjectURL(r.url);
      return prev.filter(x => x.id !== id);
    });
  }, []);

  const stopAgent = useCallback(() => {
    audioRef.current?.pause();
    setState('idle');
  }, []);

  const resetSession = useCallback(() => {
    audioRef.current?.pause();
    fetch(`${API_BASE}/adlib/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
    setConversation([]);
    setIsSessionStarted(false);
    setState('idle');
  }, [sessionId]);

  // ── State labels ──────────────────────────────────────────────────────────
  const stateLabel: Record<AgentState, string> = {
    idle: 'READY',
    loading: 'AGENT LÄDT...',
    recording: `REC ${recordingDuration}s`,
    processing: 'VERARBEITE...',
    playing: 'SPRICHT...',
    error: 'FEHLER',
  };

  const stateColor: Record<AgentState, string> = {
    idle: '#555',
    loading: '#f59e0b',
    recording: '#ef4444',
    processing: '#3b82f6',
    playing: '#22c55e',
    error: '#ef4444',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      backgroundColor: '#0d0d10',
      border: '1px solid #2a2a2a',
      borderRadius: '12px',
      overflow: 'hidden',
      fontFamily: "'DM Mono', 'Courier New', monospace",
    }}>
      {/* Header */}
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
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em' }}>AD-LIB</span>
          <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em' }}>KARRIERE-AGENT</span>
          {state === 'playing' && (
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#22c55e', display: 'inline-block',
              boxShadow: '0 0 6px #22c55e',
              animation: 'adlib-pulse 0.8s ease-in-out infinite',
            }} />
          )}
          {state === 'recording' && (
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#ef4444', display: 'inline-block',
              boxShadow: '0 0 6px #ef4444',
              animation: 'adlib-pulse 0.5s ease-in-out infinite',
            }} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
            color: stateColor[state],
            border: `1px solid ${stateColor[state]}`,
            padding: '2px 6px', borderRadius: '3px',
          }}>
            {stateLabel[state]}
          </span>
          <span style={{ color: '#555', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #1a1a1a' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
            {(['agent', 'recorder'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  backgroundColor: activeTab === tab ? '#1a1a1a' : 'transparent',
                  color: activeTab === tab ? '#FF3B00' : '#555',
                  borderBottom: activeTab === tab ? '2px solid #FF3B00' : '2px solid transparent',
                }}
              >
                {tab === 'agent' ? 'KI-Agent' : 'Eigene Aufnahme'}
              </button>
            ))}
          </div>

          {/* ── AGENT TAB ── */}
          {activeTab === 'agent' && (
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Chat history */}
              {conversation.length > 0 && (
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '4px 0',
                }}>
                  {conversation.map(entry => (
                    <div key={entry.id} style={{
                      display: 'flex',
                      flexDirection: entry.role === 'user' ? 'row-reverse' : 'row',
                      gap: '8px',
                      alignItems: 'flex-start',
                    }}>
                      <div style={{
                        fontSize: '10px',
                        color: entry.role === 'agent' ? '#FF3B00' : '#888',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        flexShrink: 0,
                        paddingTop: '4px',
                      }}>
                        {entry.role === 'agent' ? 'AGENT' : 'DU'}
                      </div>
                      <div style={{
                        backgroundColor: entry.role === 'agent' ? '#111' : '#1a1a20',
                        border: `1px solid ${entry.role === 'agent' ? '#2a2a2a' : '#333'}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: entry.role === 'agent' ? '#ddd' : '#aaa',
                        lineHeight: 1.5,
                        maxWidth: '85%',
                      }}>
                        {entry.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Error */}
              {state === 'error' && errorMsg && (
                <div style={{
                  backgroundColor: '#1a0a0a',
                  border: '1px solid #5a1a1a',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: '#ef4444',
                }}>
                  Fehler: {errorMsg}
                </div>
              )}

              {/* Controls */}
              {!isSessionStarted ? (
                <button
                  onClick={startSession}
                  style={{
                    width: '100%',
                    backgroundColor: '#FF3B00',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 0',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  AGENT STARTEN
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Main mic button */}
                  <button
                    onClick={handleAgentMicToggle}
                    disabled={state === 'loading' || state === 'processing' || state === 'playing'}
                    style={{
                      flex: 3,
                      backgroundColor: recorder.state === 'recording' ? '#ef4444' : '#1a1a1a',
                      color: recorder.state === 'recording' ? '#fff' :
                        (state === 'loading' || state === 'processing' || state === 'playing') ? '#333' : '#FF3B00',
                      border: `1px solid ${recorder.state === 'recording' ? '#ef4444' : '#333'}`,
                      borderRadius: '6px',
                      padding: '10px 0',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      cursor: (state === 'loading' || state === 'processing' || state === 'playing') ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {recorder.state === 'recording'
                      ? `STOPP (${recordingDuration}s)`
                      : state === 'playing' ? 'AGENT SPRICHT...'
                      : state === 'processing' ? 'VERARBEITE...'
                      : 'MIC HALTEN & SPRECHEN'}
                  </button>

                  {state === 'playing' && (
                    <button
                      onClick={stopAgent}
                      style={{
                        flex: 1,
                        backgroundColor: '#1a1a1a',
                        color: '#f59e0b',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        padding: '10px 0',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      STOPP
                    </button>
                  )}

                  <button
                    onClick={resetSession}
                    style={{
                      flex: 1,
                      backgroundColor: '#1a1a1a',
                      color: '#555',
                      border: '1px solid #222',
                      borderRadius: '6px',
                      padding: '10px 0',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    NEU
                  </button>
                </div>
              )}

              <div style={{
                fontSize: '10px',
                color: '#333',
                borderTop: '1px solid #1a1a1a',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>KI: OpenAI gpt-audio · KEIN EXPO</span>
                <span style={{ color: '#22c55e' }}>WEB AUDIO API · KOSTENLOS</span>
              </div>
            </div>
          )}

          {/* ── RECORDER TAB ── */}
          {activeTab === 'recorder' && (
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em' }}>
                EIGENE AD-LIBS AUFNEHMEN — sprich deine Hooks direkt ein
              </div>

              {/* Record button */}
              <button
                onClick={toggleOwnRecording}
                style={{
                  width: '100%',
                  backgroundColor: ownRecording ? '#ef4444' : '#1a1a1a',
                  color: ownRecording ? '#fff' : '#FF3B00',
                  border: `1px solid ${ownRecording ? '#ef4444' : '#333'}`,
                  borderRadius: '6px',
                  padding: '14px 0',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {ownRecording
                  ? `AUFNAHME STOPPEN  ${ownDuration}s`
                  : 'AUFNAHME STARTEN'}
              </button>

              {/* Recordings list */}
              {recordings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em' }}>
                    AUFNAHMEN ({recordings.length})
                  </div>
                  {recordings.map(rec => (
                    <div key={rec.id} style={{
                      backgroundColor: '#111',
                      border: '1px solid #2a2a2a',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#FFF', fontWeight: 700 }}>{rec.name}</div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{rec.duration}s</div>
                      </div>
                      <audio
                        src={rec.url}
                        controls
                        style={{ height: '28px', flex: 2 }}
                      />
                      <button
                        onClick={() => deleteRecording(rec.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#555',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '2px 6px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {recordings.length === 0 && !ownRecording && (
                <div style={{ fontSize: '11px', color: '#333', textAlign: 'center', padding: '12px 0' }}>
                  Noch keine Aufnahmen — starte und sing deine Ad-libs ein
                </div>
              )}

              <div style={{
                fontSize: '10px', color: '#333',
                borderTop: '1px solid #1a1a1a', paddingTop: '8px',
              }}>
                WEB AUDIO API · LOKAL · KEIN UPLOAD · KEIN EXPO
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes adlib-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
