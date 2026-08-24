import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface KnobProps {
  label: string;
  value: number; // 0 to 1
  onChange: (val: number) => void;
  size?: number;
}

export function Knob({ label, value, onChange, size = 64 }: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.clientY;
      const deltaVal = deltaY * 0.005;
      let newVal = startValRef.current + deltaVal;
      newVal = Math.max(0, Math.min(1, newVal));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startValRef.current = value;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - e.touches[0].clientY;
    const deltaVal = deltaY * 0.005;
    let newVal = startValRef.current + deltaVal;
    newVal = Math.max(0, Math.min(1, newVal));
    onChange(newVal);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Map 0-1 to -135deg to +135deg
  const rotation = -135 + (value * 270);

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        ref={knobRef}
        className={cn(
          "knob-base relative rounded-full cursor-ns-resize",
          isDragging && "cursor-grabbing ring-1 ring-primary/30"
        )}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid={`knob-${label.toLowerCase()}`}
      >
        <div 
          className="absolute inset-0 transition-transform"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Indicator line */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-[30%] bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
        </div>
      </div>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}
