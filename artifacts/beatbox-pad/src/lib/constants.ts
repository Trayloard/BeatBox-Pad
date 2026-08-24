export type PadDefinition = {
  id: string;
  name: string;
  color: string;
  row: number;
  col: number;
};

export const PADS: PadDefinition[] = [
  // Row 1
  { id: 'kick', name: 'KICK', color: 'var(--pad-amber)', row: 0, col: 0 },
  { id: 'snare', name: 'SNARE', color: 'var(--pad-green)', row: 0, col: 1 },
  { id: 'hihat_c', name: 'CHH', color: 'var(--pad-blue)', row: 0, col: 2 },
  { id: 'hihat_o', name: 'OHH', color: 'var(--pad-cyan)', row: 0, col: 3 },
  // Row 2
  { id: 'clap', name: 'CLAP', color: 'var(--pad-purple)', row: 1, col: 0 },
  { id: 'tom_l', name: 'TOM L', color: 'var(--pad-orange)', row: 1, col: 1 },
  { id: 'tom_m', name: 'TOM M', color: 'var(--pad-orange)', row: 1, col: 2 },
  { id: 'tom_h', name: 'TOM H', color: 'var(--pad-orange)', row: 1, col: 3 },
  // Row 3
  { id: 'crash', name: 'CRASH', color: 'var(--pad-yellow)', row: 2, col: 0 },
  { id: 'ride', name: 'RIDE', color: 'var(--pad-yellow)', row: 2, col: 1 },
  { id: 'cowbell', name: 'COWBELL', color: 'var(--pad-pink)', row: 2, col: 2 },
  { id: 'shaker', name: 'SHAKER', color: 'var(--pad-gray)', row: 2, col: 3 },
  // Row 4
  { id: 'rim', name: 'RIM', color: 'var(--pad-green)', row: 3, col: 0 },
  { id: 'snap', name: 'SNAP', color: 'var(--pad-purple)', row: 3, col: 1 },
  { id: 'fx1', name: 'FX 1', color: 'var(--pad-red)', row: 3, col: 2 },
  { id: 'fx2', name: 'FX 2', color: 'var(--pad-red)', row: 3, col: 3 },
];

export const getPadIndex = (id: string) => PADS.findIndex(p => p.id === id);
