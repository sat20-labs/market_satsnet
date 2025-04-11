export interface PhaseInfo {
  phase: number;
  characters: number;
  startDate: Date;
  endDate: Date;
}

export const PHASES: PhaseInfo[] = [
  { phase: 1, characters: 12, startDate: new Date('2023-10-27'), endDate: new Date('2024-02-26') },
  { phase: 2, characters: 11, startDate: new Date('2024-02-26'), endDate: new Date('2024-06-26') },
  { phase: 3, characters: 10, startDate: new Date('2024-06-26'), endDate: new Date('2024-10-26') },
  { phase: 4, characters: 9, startDate: new Date('2024-10-26'), endDate: new Date('2025-02-24') },
  { phase: 5, characters: 8, startDate: new Date('2025-02-24'), endDate: new Date('2025-06-26') },
  { phase: 6, characters: 7, startDate: new Date('2025-06-26'), endDate: new Date('2025-10-25') },
  { phase: 7, characters: 6, startDate: new Date('2025-10-25'), endDate: new Date('2026-02-24') },
  { phase: 8, characters: 5, startDate: new Date('2026-02-24'), endDate: new Date('2026-06-25') },
  { phase: 9, characters: 4, startDate: new Date('2026-06-25'), endDate: new Date('2026-10-25') },
  { phase: 10, characters: 3, startDate: new Date('2026-10-25'), endDate: new Date('2027-02-23') },
  { phase: 11, characters: 2, startDate: new Date('2027-02-23'), endDate: new Date('2027-06-25') },
  { phase: 12, characters: 1, startDate: new Date('2027-06-25'), endDate: new Date('2027-10-24') },
];

export function getCurrentPhase(date: Date = new Date()): PhaseInfo | null {
  return PHASES.find(phase => date >= phase.startDate && date < phase.endDate) || null;
}

export function getDaysUntilNextPhase(currentDate: Date = new Date()): number {
  const currentPhase = getCurrentPhase(currentDate);
  if (!currentPhase) return 0;
  
  const nextPhase = PHASES.find(phase => phase.phase === currentPhase.phase + 1);
  if (!nextPhase) return 0;
  
  const daysUntil = Math.ceil((nextPhase.startDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntil;
}

export function getNextPhase(currentDate: Date = new Date()): PhaseInfo | null {
  const currentPhase = getCurrentPhase(currentDate);
  if (!currentPhase) return null;
  
  return PHASES.find(phase => phase.phase === currentPhase.phase + 1) || null;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric'
  });
}

