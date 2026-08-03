/**
 * math/arbitrage.ts
 * ------------------------------------------------------------------
 * Fórmulas de arbitraje deportivo ("surebets"), generalizadas a N
 * resultados (funciona igual para mercados de 2 resultados -tenis,
 * moneyline sin empate- que de 3 -fútbol 1X2-).
 *
 * Fundamento matemático:
 *   Dado un mercado con resultados mutuamente excluyentes y cuotas
 *   decimales o_1..o_n (cada una posiblemente de una casa distinta),
 *   se define el margen combinado:
 *
 *       M = Σ (1 / o_i)
 *
 *   - Si M < 1  -> existe arbitraje (surebet): se puede repartir el
 *     bankroll entre los resultados de forma que se gane siempre lo
 *     mismo, sea cual sea el resultado final.
 *   - Si M >= 1 -> no hay arbitraje (es el caso habitual; M > 1 es
 *     el margen/comisión de la propia casa de apuestas).
 *
 *   Reparto óptimo del bankroll (stake por resultado):
 *
 *       stake_i = bankroll * (1 / o_i) / M
 *
 *   Con este reparto, el payout (stake_i * o_i) es IDÉNTICO para
 *   cualquier resultado ganador:
 *
 *       payout = bankroll / M
 *
 *   Beneficio garantizado:
 *
 *       profit = payout - bankroll = bankroll * (1/M - 1)
 *
 *   ROI (%):
 *
 *       roi = (1/M - 1) * 100
 * ------------------------------------------------------------------
 */

export interface OutcomeInput {
  /** Identificador libre del resultado (ej: "1", "X", "2", "Jugador A") */
  id: string;
  /** Etiqueta legible para mostrar en UI */
  label: string;
  /** Cuota decimal ofrecida (ej: 2.10) */
  odds: number;
  /** Casa de apuestas que ofrece esta cuota */
  bookmaker: string;
  /**
   * Comisión de la casa/exchange sobre las ganancias netas de ESTE
   * resultado, en tanto por uno (ej: 0.05 = 5%). Opcional.
   */
  commission?: number;
}

export interface OutcomeResult extends OutcomeInput {
  /** Cuota efectiva tras aplicar la comisión (si la hay) */
  effectiveOdds: number;
  /** Probabilidad implícita (1 / cuota efectiva) */
  impliedProbability: number;
  /** Cantidad a apostar en este resultado */
  stake: number;
  /** Payout bruto si este resultado gana (stake * cuota efectiva) */
  payout: number;
}

export interface ArbitrageResult {
  isArbitrage: boolean;
  /** Margen combinado (Σ 1/cuota_efectiva). <1 implica arbitraje */
  margin: number;
  /** Beneficio porcentual de la operación, ej 3.25 = 3.25% */
  profitPercent: number;
  /** ROI %, idéntico a profitPercent en este modelo (beneficio/inversión) */
  roi: number;
  /** Beneficio garantizado en unidades monetarias */
  guaranteedProfit: number;
  /** Importe total invertido (== bankroll salvo redondeos de stake) */
  totalStake: number;
  outcomes: OutcomeResult[];
}

/**
 * Aplica la comisión de un exchange/casa a una cuota decimal.
 * Una comisión reduce la ganancia neta, lo que equivale a "bajar"
 * la cuota efectiva:
 *    cuota_efectiva = 1 + (cuota - 1) * (1 - comision)
 */
export function applyCommission(odds: number, commission = 0): number {
  if (commission <= 0) return odds;
  return 1 + (odds - 1) * (1 - commission);
}

/**
 * Calcula si existe arbitraje entre N resultados y, si es así, el
 * reparto óptimo del bankroll para garantizar el mismo beneficio
 * sea cual sea el resultado ganador.
 */
export function calculateArbitrage(
  outcomes: OutcomeInput[],
  bankroll: number
): ArbitrageResult {
  if (outcomes.length < 2) {
    throw new Error('Se necesitan al menos 2 resultados para calcular arbitraje.');
  }
  if (bankroll <= 0) {
    throw new Error('El bankroll debe ser mayor que 0.');
  }

  const withEffectiveOdds = outcomes.map((o) => ({
    ...o,
    effectiveOdds: applyCommission(o.odds, o.commission ?? 0),
  }));

  const margin = withEffectiveOdds.reduce(
    (sum, o) => sum + 1 / o.effectiveOdds,
    0
  );

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

  const totalStake = roundMoney(
    outcomeResults.reduce((sum, o) => sum + o.stake, 0)
  );

  // El beneficio garantizado teórico (antes de redondeos de céntimos)
  const guaranteedProfit = roundMoney(bankroll * (1 / margin - 1));
  const profitPercent = round((1 / margin - 1) * 100, 3);

  return {
    isArbitrage,
    margin: round(margin, 6),
    profitPercent,
    roi: profitPercent, // en este modelo, ROI == beneficio % sobre el bankroll invertido
    guaranteedProfit,
    totalStake,
    outcomes: outcomeResults,
  };
}

/** Redondeo estándar a 2 decimales para importes monetarios */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Redondeo genérico a n decimales */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
