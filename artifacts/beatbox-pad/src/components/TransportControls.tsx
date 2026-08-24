import { cn } from '@/lib/utils';
import { Play, Square, Circle } from 'lucide-react';

interface TransportControlsProps {
  isPlaying: boolean;
  onPlayToggle: () => void;
  isRecording: boolean;
  onRecordToggle: () => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  onClear: () => void;
}

export function TransportControls({
  isPlaying,
  onPlayToggle,
  isRecording,
  onRecordToggle,
  bpm,
  setBpm,
  onClear
}: TransportControlsProps) {
  return (
    <div className="hardware-recess p-3 md:p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 w-full">
      
      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onPlayToggle}
          className={cn(
            "h-10 w-12 rounded-sm border flex items-center justify-center transition-colors",
            isPlaying 
              ? "bg-green-900/40 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" 
              : "bg-[#222] border-[#444] text-[#888] hover:bg-[#333]"
          )}
          data-testid="button-play"
        >
          {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </button>

        <button
          onClick={onRecordToggle}
          className={cn(
            "h-10 w-12 rounded-sm border flex items-center justify-center transition-colors",
            isRecording 
              ? "bg-red-900/40 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
              : "bg-[#222] border-[#444] text-[#888] hover:bg-[#333]"
          )}
          data-testid="button-record"
        >
          <Circle className="w-4 h-4 fill-current" />
        </button>

        <button
          onClick={onClear}
          className="h-10 px-3 text-[10px] font-bold tracking-widest uppercase rounded-sm border bg-[#222] border-[#444] text-[#888] hover:bg-[#333]"
          data-testid="button-clear"
        >
          Clear
        </button>
      </div>

      {/* BPM Display */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
            Tempo
          </span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setBpm(Math.max(60, bpm - 1))}
              className="w-6 h-6 rounded bg-[#222] border border-[#444] text-[#888] flex items-center justify-center"
            >
              -
            </button>
            <div className="digital-display px-3 py-1 rounded w-16 text-center text-xl leading-none">
              {bpm.toString().padStart(3, '0')}
            </div>
            <button 
              onClick={() => setBpm(Math.min(200, bpm + 1))}
              className="w-6 h-6 rounded bg-[#222] border border-[#444] text-[#888] flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
