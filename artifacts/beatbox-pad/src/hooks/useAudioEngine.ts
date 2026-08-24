import { useRef, useState, useCallback, useEffect } from 'react';
import { PADS } from '@/lib/constants';

type AudioEngineState = {
  isReady: boolean;
  isMicActive: boolean;
  volume: number;
  sensitivity: number;
  reverbAmount: number;
};

export function useAudioEngine(onPadTrigger: (padId: string) => void) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const reqAnimFrameRef = useRef<number | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Settings
  const [volume, setVolume] = useState(0.8);
  const [sensitivity, setSensitivity] = useState(0.5);
  const sensitivityRef = useRef(0.5);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  const [reverbAmount, setReverbAmount] = useState(0.2);

  const initAudio = useCallback(async () => {
    if (ctxRef.current) return;
    const ctx = new window.AudioContext();
    ctxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGainRef.current = masterGain;

    // Simple reverb using noise impulse response
    const convolver = ctx.createConvolver();
    reverbRef.current = convolver;
    
    // Generate a noise burst for reverb impulse response
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 1.5; // 1.5 seconds
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let i = 0; i < 2; i++) {
      const channelData = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2);
      }
    }
    convolver.buffer = impulse;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = reverbAmount;

    // Routing: master -> [dry] -> destination
    //               -> [reverbGain] -> convolver -> destination
    masterGain.connect(ctx.destination);
    masterGain.connect(reverbGain);
    reverbGain.connect(convolver);
    convolver.connect(ctx.destination);

    setIsReady(true);
  }, [volume, reverbAmount]);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setValueAtTime(volume, ctxRef.current!.currentTime);
    }
  }, [volume]);

  // Synthesis methods
  const playDrumSound = useCallback((padId: string) => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    const time = ctx.currentTime;

    const playKick = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      osc.start(time);
      osc.stop(time + 0.5);
    };

    const playSnare = () => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.connect(oscGain);
      oscGain.connect(master);

      osc.frequency.setValueAtTime(250, time);
      oscGain.gain.setValueAtTime(0.5, time);
      oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      osc.start(time);
      osc.stop(time + 0.2);

      // Noise layer
      const noise = createNoiseBuffer(ctx);
      const noiseGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);

      noiseGain.gain.setValueAtTime(1, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
      noise.start(time);
    };

    const playHihat = (open = false) => {
      const noise = createNoiseBuffer(ctx);
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 10000;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      const decay = open ? 0.4 : 0.05;
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + decay);
      noise.start(time);
    };

    const playClap = () => {
      const noiseGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1500;
      
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noiseGain.gain.setValueAtTime(1, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

      // Multiple slightly delayed noise bursts
      for(let i=0; i<3; i++) {
        const noise = createNoiseBuffer(ctx);
        noise.connect(filter);
        noise.start(time + i * 0.015);
        noise.stop(time + i * 0.015 + 0.02);
      }
    };

    const playTom = (freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.3);
      
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
      
      osc.start(time);
      osc.stop(time + 0.3);
    };

    const playCrash = () => {
      const noise = createNoiseBuffer(ctx, 1.5);
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 4000;
      filter.Q.value = 0.5;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 1.2);
      noise.start(time);
    };

    switch(padId) {
      case 'kick': playKick(); break;
      case 'snare': playSnare(); break;
      case 'hihat_c': playHihat(false); break;
      case 'hihat_o': playHihat(true); break;
      case 'clap': playClap(); break;
      case 'tom_l': playTom(80); break;
      case 'tom_m': playTom(120); break;
      case 'tom_h': playTom(180); break;
      case 'crash': playCrash(); break;
      case 'ride': playHihat(true); break; // Simplify ride as open hh for now
      case 'cowbell': playTom(600); break; // Simplify cowbell
      case 'shaker': playHihat(false); break;
      case 'rim': playTom(300); break;
      case 'snap': playClap(); break;
      case 'fx1': playTom(900); break;
      case 'fx2': playTom(50); break;
    }
  }, []);

  // Helper for synthesis
  const createNoiseBuffer = (ctx: AudioContext, duration = 0.5) => {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    return noise;
  };

  // Mic logic
  const toggleMic = async () => {
    if (isMicActive) {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      setIsMicActive(false);
      if (reqAnimFrameRef.current) cancelAnimationFrame(reqAnimFrameRef.current);
      setAudioLevel(0);
      return;
    }

    try {
      await initAudio();
      const ctx = ctxRef.current!;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      setIsMicActive(true);
      startDetectionLoop();
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const lastTriggerTime = useRef<{ [key: string]: number }>({});
  
  const startDetectionLoop = () => {
    if (!analyserRef.current || !ctxRef.current) return;
    const analyser = analyserRef.current;
    const ctx = ctxRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Rolling averages for onset detection
    let lowEnergyHistory = 0;
    let midEnergyHistory = 0;
    let highEnergyHistory = 0;

    const analyze = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate energy in bands
      let lowEnergy = 0;   // 50-200 Hz
      let midEnergy = 0;   // 150-1000 Hz
      let highEnergy = 0;  // 8000-16000 Hz
      
      const nyquist = ctx.sampleRate / 2;
      const binWidth = nyquist / bufferLength;

      for (let i = 0; i < bufferLength; i++) {
        const freq = i * binWidth;
        const val = dataArray[i];
        if (freq >= 50 && freq <= 200) lowEnergy += val;
        if (freq >= 200 && freq <= 1000) midEnergy += val;
        if (freq >= 8000 && freq <= 16000) highEnergy += val;
      }
      
      lowEnergy /= (150 / binWidth) || 1;
      midEnergy /= (800 / binWidth) || 1;
      highEnergy /= (8000 / binWidth) || 1;

      const totalLevel = (lowEnergy + midEnergy + highEnergy) / (255 * 3);
      setAudioLevel(totalLevel);

      // Onset detection
      const now = performance.now();
      const sens = 1 - sensitivityRef.current; // lower sensitivity value means higher threshold
      const thresholdMult = 1.2 + (sens * 1.5); 
      const minEnergy = 20 + (sens * 50);
      
      const debounce = 100;

      const checkTrigger = (id: string, energy: number, history: number) => {
        if (energy > history * thresholdMult && energy > minEnergy) {
          if (!lastTriggerTime.current[id] || now - lastTriggerTime.current[id] > debounce) {
            onPadTrigger(id);
            lastTriggerTime.current[id] = now;
            return true;
          }
        }
        return false;
      };

      // Simple heuristic mapping
      if (checkTrigger('kick', lowEnergy, lowEnergyHistory)) {
        // triggered kick
      } else if (checkTrigger('hihat_c', highEnergy, highEnergyHistory)) {
        // triggered hihat
      } else if (checkTrigger('snare', midEnergy, midEnergyHistory)) {
        // triggered snare
      }

      lowEnergyHistory = lowEnergyHistory * 0.8 + lowEnergy * 0.2;
      midEnergyHistory = midEnergyHistory * 0.8 + midEnergy * 0.2;
      highEnergyHistory = highEnergyHistory * 0.8 + highEnergy * 0.2;

      if (isMicActive) {
        reqAnimFrameRef.current = requestAnimationFrame(analyze);
      }
    };
    
    analyze();
  };

  return {
    isReady,
    initAudio,
    playDrumSound,
    toggleMic,
    isMicActive,
    audioLevel,
    volume,
    setVolume,
    sensitivity,
    setSensitivity,
    reverbAmount,
    setReverbAmount,
  };
}
