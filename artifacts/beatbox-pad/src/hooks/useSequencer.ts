import { useState, useEffect, useRef, useCallback } from 'react';
import { PADS } from '@/lib/constants';

type SequencerState = {
  isPlaying: boolean;
  isRecording: boolean;
  bpm: number;
  currentStep: number;
  pattern: boolean[][]; // [row][step]
};

const STEPS = 16;
const TRACKS = 4; // Main tracks: Kick, Snare, Hihat, Clap

// Map pads to sequencer tracks
export const PAD_TO_TRACK: Record<string, number> = {
  'kick': 0,
  'snare': 1,
  'hihat_c': 2,
  'hihat_o': 2,
  'clap': 3,
  'rim': 1,
  'snap': 3,
  'tom_l': 0,
  'tom_m': 0,
  'tom_h': 0,
  'crash': 2,
  'ride': 2,
  'cowbell': 1,
  'shaker': 2,
  'fx1': 3,
  'fx2': 3,
};

export function useSequencer(playDrumSound: (padId: string) => void) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(0);
  const [pattern, setPattern] = useState<boolean[][]>(
    Array(TRACKS).fill(null).map(() => Array(STEPS).fill(false))
  );
  
  const stepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  
  const scheduleNote = useCallback((stepNumber: number, time: number) => {
    setCurrentStep(stepNumber);
    // Play sounds for this step
    if (pattern[0][stepNumber]) playDrumSound('kick');
    if (pattern[1][stepNumber]) playDrumSound('snare');
    if (pattern[2][stepNumber]) playDrumSound('hihat_c');
    if (pattern[3][stepNumber]) playDrumSound('clap');
  }, [pattern, playDrumSound]);

  const scheduler = useCallback(() => {
    // Look ahead 0.1s
    while (nextNoteTimeRef.current < window.performance.now() / 1000 + 0.1) {
      scheduleNote(stepRef.current, nextNoteTimeRef.current);
      
      // Advance step
      const secondsPerBeat = 60.0 / bpm;
      // 16th notes -> 0.25 beats per step
      nextNoteTimeRef.current += 0.25 * secondsPerBeat;
      
      stepRef.current++;
      if (stepRef.current >= STEPS) {
        stepRef.current = 0;
      }
    }
    timerIDRef.current = window.setTimeout(scheduler, 25);
  }, [bpm, scheduleNote]);

  useEffect(() => {
    if (isPlaying) {
      if (timerIDRef.current === null) {
        stepRef.current = 0;
        nextNoteTimeRef.current = window.performance.now() / 1000 + 0.05;
        scheduler();
      }
    } else {
      if (timerIDRef.current !== null) {
        window.clearTimeout(timerIDRef.current);
        timerIDRef.current = null;
      }
      setCurrentStep(0);
      stepRef.current = 0;
    }
    return () => {
      if (timerIDRef.current !== null) window.clearTimeout(timerIDRef.current);
    };
  }, [isPlaying, scheduler]);

  const toggleStep = (track: number, step: number) => {
    setPattern(prev => {
      const newPattern = [...prev];
      newPattern[track] = [...newPattern[track]];
      newPattern[track][step] = !newPattern[track][step];
      return newPattern;
    });
  };

  const clearPattern = () => {
    setPattern(Array(TRACKS).fill(null).map(() => Array(STEPS).fill(false)));
  };

  const recordHit = (padId: string) => {
    if (!isRecording || !isPlaying) return;
    const track = PAD_TO_TRACK[padId];
    if (track === undefined) return;
    
    const targetStep = stepRef.current;
    
    setPattern(prev => {
      const newPattern = [...prev];
      newPattern[track] = [...newPattern[track]];
      newPattern[track][targetStep] = true;
      return newPattern;
    });
  };

  return {
    isPlaying,
    setIsPlaying,
    isRecording,
    setIsRecording,
    bpm,
    setBpm,
    currentStep,
    pattern,
    toggleStep,
    clearPattern,
    recordHit,
  };
}
