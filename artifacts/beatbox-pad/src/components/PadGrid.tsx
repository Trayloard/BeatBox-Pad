import { PADS } from '@/lib/constants';
import { Pad } from './Pad';

interface PadGridProps {
  activePads: Set<string>;
  onPadTrigger: (id: string) => void;
}

export function PadGrid({ activePads, onPadTrigger }: PadGridProps) {
  return (
    <div className="hardware-recess p-4 md:p-6 rounded-xl w-full max-w-md mx-auto aspect-square grid grid-cols-4 grid-rows-4 gap-3 md:gap-4 relative">
      {PADS.map((pad) => (
        <Pad
          key={pad.id}
          pad={pad}
          isActive={activePads.has(pad.id)}
          onTrigger={onPadTrigger}
        />
      ))}
    </div>
  );
}
