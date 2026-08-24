import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useSequencer } from '@/hooks/useSequencer';
import { PadGrid } from '@/components/PadGrid';
import { Sequencer } from '@/components/Sequencer';
import { TransportControls } from '@/components/TransportControls';
import { Knob } from '@/components/Knob';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { TTSWidget } from '@/components/TTSWidget';
import { AdLibAgent } from '@/components/AdLibAgent';

export default function BeatboxPad() {
  const [activePads, setActivePads] = useState<Set<string>>(new Set());
  const handlePadTriggerRef = useRef<(id: string) => void>(undefined);

  const engine = useAudioEngine((id) => {
    handlePadTriggerRef.current?.(id);
  });

  const sequencer = useSequencer(engine.playDrumSound);

  const handlePadTrigger = useCallback((id: string) => {
    // Visual flash
    setActivePads(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    
    setTimeout(() => {
      setActivePads(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 100);

    engine.playDrumSound(id);
    sequencer.recordHit(id);
  }, [engine, sequencer]);

  // Hook up the ref
  useEffect(() => {
    handlePadTriggerRef.current = handlePadTrigger;
  }, [handlePadTrigger]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col p-4 md:p-8">
      
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#333] pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              BEATBOX<span className="text-red-500">PAD</span>
            </h1>
            <p className="text-[#888] text-sm tracking-widest uppercase font-bold mt-1">
              Vocal Drum Machine Controller
            </p>
          </div>
          
          <div className="text-xs text-[#555] font-mono tracking-wider">
            OS: v1.0.4 | MEM: 16MB | DSP: ACTIVE
          </div>
        </header>

        {/* Main Interface */}
        <div className="hardware-panel p-4 md:p-6 rounded-2xl flex flex-col gap-6">
          
          {/* Top Control Strip */}
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Visualizer & Mic Toggle */}
            <div className="flex-1">
              <AudioVisualizer 
                level={engine.audioLevel}
                isMicActive={engine.isMicActive}
                onToggleMic={engine.toggleMic}
              />
              {!engine.isReady && (
                <div className="mt-2 text-xs text-yellow-500 font-bold uppercase tracking-widest text-center">
                  Press Mic to init Audio Engine
                </div>
              )}
            </div>

            {/* Knobs */}
            <div className="hardware-recess px-6 py-3 rounded-lg flex gap-8 justify-center items-center">
              <Knob 
                label="Master" 
                value={engine.volume} 
                onChange={engine.setVolume} 
              />
              <Knob 
                label="Mic Sens" 
                value={engine.sensitivity} 
                onChange={engine.setSensitivity} 
              />
              <Knob 
                label="Reverb" 
                value={engine.reverbAmount} 
                onChange={engine.setReverbAmount} 
              />
            </div>
          </div>

          <div className="w-full h-[1px] bg-[#111] shadow-[0_1px_0_rgba(255,255,255,0.05)] my-2" />

          {/* Center: Pad Grid */}
          <div className="flex justify-center">
            <PadGrid 
              activePads={activePads} 
              onPadTrigger={handlePadTrigger} 
            />
          </div>

          <div className="w-full h-[1px] bg-[#111] shadow-[0_1px_0_rgba(255,255,255,0.05)] my-2" />

          {/* Bottom: Sequencer */}
          <div className="flex flex-col gap-4">
            <TransportControls 
              isPlaying={sequencer.isPlaying}
              onPlayToggle={() => sequencer.setIsPlaying(!sequencer.isPlaying)}
              isRecording={sequencer.isRecording}
              onRecordToggle={() => sequencer.setIsRecording(!sequencer.isRecording)}
              bpm={sequencer.bpm}
              setBpm={sequencer.setBpm}
              onClear={sequencer.clearPattern}
            />
            
            <Sequencer 
              pattern={sequencer.pattern}
              currentStep={sequencer.currentStep}
              onToggleStep={sequencer.toggleStep}
            />
          </div>
        </div>

        {/* Ad-Lib Career Agent */}
        <AdLibAgent />

        {/* TTS Widget */}
        <TTSWidget />

      </div>
      
    </div>
  );
}
