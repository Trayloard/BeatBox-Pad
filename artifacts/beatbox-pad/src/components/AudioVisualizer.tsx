import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';

interface AudioVisualizerProps {
  level: number;
  isMicActive: boolean;
  onToggleMic: () => void;
}

export function AudioVisualizer({ level, isMicActive, onToggleMic }: AudioVisualizerProps) {
  // Normalize level for visual display
  const numBars = 12;
  const activeBars = Math.floor(level * numBars);

  return (
    <div className="flex items-center gap-4 hardware-recess px-4 py-3 rounded-lg border border-[#303038]">
      <button
        onClick={onToggleMic}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all",
          isMicActive 
            ? "bg-green-900/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)] border border-green-500/50" 
            : "bg-[#222] text-[#666] border border-[#444] hover:bg-[#333]"
        )}
        data-testid="button-mic"
      >
        {isMicActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 justify-center h-full max-w-[200px]">
        <div className="flex gap-1 h-6">
          {Array.from({ length: numBars }).map((_, i) => {
            const isActive = i < activeBars;
            let colorClass = "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]";
            if (i >= numBars - 2) colorClass = "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]";
            else if (i >= numBars - 5) colorClass = "bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]";

            return (
              <div 
                key={i}
                className={cn(
                  "flex-1 rounded-sm transition-all duration-75",
                  isActive ? colorClass : "bg-[#1a1a1f]"
                )}
              />
            );
          })}
        </div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#666] text-center">
          {isMicActive ? "Mic Active" : "Mic Off"}
        </div>
      </div>
    </div>
  );
}
