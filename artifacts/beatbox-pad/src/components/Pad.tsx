import { cn } from '@/lib/utils';
import { PadDefinition } from '@/lib/constants';

interface PadProps {
  pad: PadDefinition;
  isActive: boolean;
  onTrigger: (id: string) => void;
}

export function Pad({ pad, isActive, onTrigger }: PadProps) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // prevent selection/scrolling
    onTrigger(pad.id);
  };

  return (
    <div
      className={cn(
        "pad-base relative w-full aspect-square rounded-md flex items-center justify-center p-2 cursor-pointer select-none overflow-hidden",
        isActive && "pad-active"
      )}
      onPointerDown={handlePointerDown}
      data-testid={`pad-${pad.id}`}
    >
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-75",
          isActive && "opacity-30"
        )}
        style={{ background: `radial-gradient(circle at center, ${pad.color} 0%, transparent 70%)` }}
      />
      
      {/* Corner screw detail */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-[#111] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#111] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />
      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-[#111] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />
      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-[#111] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />

      {/* Label */}
      <span 
        className={cn(
          "relative z-10 text-xs font-bold tracking-widest text-[#666] transition-colors duration-100",
          isActive && "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
        )}
        style={{ color: isActive ? pad.color : undefined }}
      >
        {pad.name}
      </span>
      
      {/* Color strip accent */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 transition-all duration-75",
          isActive ? "opacity-100" : "opacity-30"
        )}
        style={{ 
          backgroundColor: pad.color,
          boxShadow: isActive ? `0 -2px 10px ${pad.color}` : 'none'
        }}
      />
    </div>
  );
}
