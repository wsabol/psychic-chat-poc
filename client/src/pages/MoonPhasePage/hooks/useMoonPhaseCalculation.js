import { useState, useEffect } from 'react';
import { calculateMoonPhase } from '../../../utils/moonPhaseUtils';

/**
 * useMoonPhaseCalculation Hook
 * Calculates and manages the current moon phase
 */
export function useMoonPhaseCalculation() {
  const [currentPhase, setCurrentPhase] = useState(null);

  useEffect(() => {
    const phase = calculateMoonPhase();
    setCurrentPhase(phase);
  }, []);

  return currentPhase;
}
