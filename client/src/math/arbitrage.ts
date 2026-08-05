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

/**
 * PROBLEMA INVERSO: dadas las cuotas YA CONOCIDAS de todos los
 * resultados MENOS UNO, ¿qué cuota mínima necesitas en el resultado
 * que falta para lograr al menos "targetProfitPercent" de beneficio?
 *
 * Se basa en la misma fórmula del margen: para lograr un beneficio p%,
 * el margen combinado tiene que ser exactamente:
 *     M_objetivo = 1 / (1 + p/100)
 *
 * Como M = Σ(1/cuota_i), y todas las cuotas menos una ya se conocen:
 *     1/cuota_que_falta = M_objetivo - Σ(1/cuotas_conocidas)
 *     cuota_que_falta   = 1 / (M_objetivo - Σ(1/cuotas_conocidas))
 *
 * Si esa resta es ≤ 0, es matemáticamente imposible alcanzar ese
 * beneficio con las cuotas conocidas, sea la que sea la cuota que
 * falta (ni con una cuota infinita bastaría).
 */
export interface MinimumOddsResult {
  feasible: boolean;
  /** Cuota mínima necesaria (estrictamente hay que superarla, no vale igualarla) */
  minOdds: number | null;
  /** Margen combinado ya aportado por las cuotas conocidas */
  knownMargin: number;
}

export function calculateMinimumOdds(
  knownOdds: number[],
  targetProfitPercent: number
): MinimumOddsResult {
  if (knownOdds.length === 0) {
    throw new Error('Introduce al menos una cuota conocida.');
  }
  if (knownOdds.some((o) => !o || o <= 1)) {
    throw new Error('Todas las cuotas conocidas deben ser mayores que 1.');
  }

  const knownMargin = knownOdds.reduce((sum, o) => sum + 1 / o, 0);
  const targetMargin = 1 / (1 + targetProfitPercent / 100);
  const remaining = targetMargin - knownMargin;

  if (remaining <= 0) {
    return { feasible: false, minOdds: null, knownMargin: round(knownMargin, 6) };
  }

  return {
    feasible: true,
    minOdds: round(1 / remaining, 3),
    knownMargin: round(knownMargin, 6),
  };
}
