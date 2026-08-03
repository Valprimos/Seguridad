/**
 * math/arbitrage.ts (cliente)
 * ------------------------------------------------------------------
 * Réplica de la lógica de `server/src/math/arbitrage.ts`, para poder
 * calcular la Calculadora manual instantáneamente en el navegador sin
 * esperar a una llamada de red (la app además valida/recalcula en el
 * backend vía POST /api/surebets/calculate para casos guardados).
 *
 * Ver comentarios detallados de las fórmulas en el archivo del servidor.
 * ------------------------------------------------------------------
 */

export interface OutcomeInput {
  id: string;
  label: string;
  odds: number;
  bookmaker: string;
  commission?: number;
}

export interface OutcomeResult extends OutcomeInput {
  effectiveOdds: number;
  impliedProbability: number;
  stake: number;
  payout: number;
}

export interface ArbitrageResult {
  isArbitrage: boolean;
  margin: number;
  profitPercent: number;
  roi: number;
  guaranteedProfit: number;
  totalStake: number;
  outcomes: OutcomeResult[];
}

export function applyCommission(odds: number, commission = 0): number {
  if (commission <= 0) return odds;
  return 1 + (odds - 1) * (1 - commission);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function calculateArbitrage(
  outcomes: OutcomeInput[],
  bankroll: number
): ArbitrageResult {
  if (outcomes.length < 2) {
    throw new Error('Se necesitan al menos 2 resultados.');
  }
  if (!bankroll || bankroll <= 0) {
    throw new Error('El bankroll debe ser mayor que 0.');
  }
  if (outcomes.some((o) => !o.odds || o.odds <= 1)) {
    throw new Error('Todas las cuotas deben ser mayores que 1.');
  }

  const withEffectiveOdds = outcomes.map((o) => ({
    ...o,
    effectiveOdds: applyCommission(o.odds, o.commission ?? 0),
  }));

  const margin = withEffectiveOdds.reduce((sum, o) => sum + 1 / o.effectiveOdds, 0);
  const isArbitrage = margin < 1;

  const outcomeResults: OutcomeResult[] = withEffectiveOdds.map((o) => {
    const impliedProbability = 1 / o.effectiveOdds;
    const stake = (bankroll * impliedProbability) / margin;
    const payout = stake * o.effectiveOdds;
    return {
      ...o,
      impliedProbability,
      stake: roundMoney(stake),
      payout: roundMoney(payout),
    };
  });

  const totalStake = roundMoney(outcomeResults.reduce((sum, o) => sum + o.stake, 0));
  const guaranteedProfit = roundMoney(bankroll * (1 / margin - 1));
  const profitPercent = round((1 / margin - 1) * 100, 3);

  return {
    isArbitrage,
    margin: round(margin, 6),
    profitPercent,
    roi: profitPercent,
    guaranteedProfit,
    totalStake,
    outcomes: outcomeResults,
  };
}
