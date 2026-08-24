import { cn } from '@/lib/utils';

interface SequencerProps {
  pattern: boolean[][];
  currentStep: number;
  onToggleStep: (track: number, step: number) => void;
}

const TRACK_LABELS = ['KICK', 'SNR', 'HAT', 'CLP'];
const TRACK_COLORS = ['var(--pad-amber)', 'var(--pad-green)', 'var(--pad-blue)', 'var(--pad-purple)'];

export function Sequencer({ pattern, currentStep, onToggleStep }: SequencerProps) {
  return (
    <div className="hardware-recess p-4 rounded-xl w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Step indicators */}
        <div className="flex mb-2 ml-[60px]">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="flex-1 flex justify-center">
              <div 
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  currentStep === i 
                    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
                    : "bg-[#333]"
                )}
              />
            </div>
          ))}
        </div>

        {/* Tracks */}
        <div className="flex flex-col gap-1.5">
          {pattern.map((track, trackIdx) => (
            <div key={trackIdx} className="flex items-center">
              <div 
                className="w-[50px] mr-[10px] text-[9px] font-bold tracking-widest text-right"
                style={{ color: TRACK_COLORS[trackIdx] }}
              >
                {TRACK_LABELS[trackIdx]}
              </div>
              
              <div className="flex-1 flex gap-1">
                {track.map((isActive, stepIdx) => (
                  <button
                    key={stepIdx}
                    onClick={() => onToggleStep(trackIdx, stepIdx)}
                    className={cn(
                      "flex-1 h-8 rounded-sm border-b-2 transition-all",
                      isActive 
                        ? "bg-white/90 border-[#111]" 
                        : "bg-[#222] border-[#111] hover:bg-[#333]",
                      stepIdx % 4 === 0 && !isActive && "bg-[#2a2a2a]" // highlight beat
                    )}
                    style={isActive ? { 
                      backgroundColor: TRACK_COLORS[trackIdx],
                      boxShadow: `0 0 10px ${TRACK_COLORS[trackIdx]}`
                    } : {}}
                    data-testid={`seq-step-${trackIdx}-${stepIdx}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
