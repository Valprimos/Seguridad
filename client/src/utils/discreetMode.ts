/**
 * utils/discreetMode.ts
 * ------------------------------------------------------------------
 * El reparto de stake matemáticamente óptimo de una surebet suele dar
 * cifras muy "raras" (ej. 47,32 €), que es precisamente la huella que
 * los sistemas de las casas de apuestas usan para detectar arbitraje.
 *
 * El "modo discreto" redondea cada importe a un múltiplo de una unidad
 * configurable (ej. múltiplos de 5€), para que las apuestas parezcan
 * más "normales". Como cualquier redondeo, esto YA NO es matemáticamente
 * perfecto: alguno de los resultados puede dar algo menos de beneficio
 * que otro (en vez de ser exactamente igual en todos).
 *
 * Para que siga siendo seguro, este algoritmo SIEMPRE comprueba el
 * peor caso después de redondear, y si algún resultado quedaría en
 * pérdidas, ajusta los importes hacia arriba hasta que todos los
 * resultados sigan dando beneficio (aunque no sea perfectamente igual
 * entre todos). Si aun así no es posible sin desviarse demasiado del
 * óptimo, se avisa de que esa apuesta concreta ya no es "modo discreto
 * seguro" y conviene revisarla a mano.
 * ------------------------------------------------------------------
 */

export interface DiscreetOutcomeInput {
  id: string;
  label: string;
  odds: number;
  bookmaker: string;
  /** Stake matemáticamente óptimo, antes de redondear */
  optimalStake: number;
}

export interface DiscreetOutcomeResult extends DiscreetOutcomeInput {
  /** Importe redondeado, ya "discreto", que es el que se apostaría de verdad */
  roundedStake: number;
  /** Retorno si este resultado gana, con el importe ya redondeado */
  roundedPayout: number;
}

/** Qué resultado concreto produce el peor/mejor caso, para poder mostrarlo en la UI */
export interface DiscreetCaseOutcome {
  label: string;
  bookmaker: string;
}

export interface DiscreetModeResult {
  outcomes: DiscreetOutcomeResult[];
  totalStake: number;
  /** Beneficio en el PEOR de los resultados posibles (ya no es igual en todos, a diferencia del cálculo exacto) */
  worstCaseProfit: number;
  worstCaseProfitPercent: number;
  /** Qué resultado (y en qué casa) produce ese peor caso */
  worstCaseOutcome: DiscreetCaseOutcome;
  /** Beneficio en el MEJOR de los resultados posibles */
  bestCaseProfit: number;
  /** Qué resultado (y en qué casa) produce ese mejor caso */
  bestCaseOutcome: DiscreetCaseOutcome;
  /** false si, incluso ajustando, algún resultado quedaría en pérdidas */
  isSafe: boolean;
}

/** Pseudo-aleatorio estable a partir de un texto (mismo id = mismo "azar" siempre, no cambia en cada refresco) */
function seededOffset(seed: string, maxUnits: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  // Devuelve un entero entre -maxUnits y +maxUnits (inclusive)
  return (hash % (2 * maxUnits + 1)) - maxUnits;
}

export function applyDiscreetRounding(
  outcomes: DiscreetOutcomeInput[],
  roundingUnit: number
): DiscreetModeResult {
  const unit = roundingUnit > 0 ? roundingUnit : 1;

  // 1. Redondeo base al múltiplo más cercano, con una pequeña variación
  //    estable (±1 unidad) para que no todos los importes sean múltiplos
  //    "redondos" exactos, lo cual también puede llamar la atención.
  let rounded = outcomes.map((o) => {
    const base = Math.round(o.optimalStake / unit) * unit;
    const jitter = seededOffset(o.id, 1) * unit;
    const stake = Math.max(unit, base + jitter);
    return { ...o, roundedStake: stake };
  });

  // 2. Comprobar el peor caso y, si hace falta, subir el importe del
  //    resultado que se quedaría más corto, hasta que todos den
  //    beneficio (o hasta un máximo de intentos para no entrar en bucle).
  const totalStakeOf = (list: typeof rounded) => list.reduce((s, o) => s + o.roundedStake, 0);

  for (let attempt = 0; attempt < 20; attempt++) {
    const total = totalStakeOf(rounded);
    const profits = rounded.map((o) => o.roundedStake * o.odds - total);
    const minProfit = Math.min(...profits);
    if (minProfit >= 0) break;

    const worstIndex = profits.indexOf(minProfit);
    rounded[worstIndex] = {
      ...rounded[worstIndex],
      roundedStake: rounded[worstIndex].roundedStake + unit,
    };
  }

  const totalStake = totalStakeOf(rounded);
  const outcomeResults: DiscreetOutcomeResult[] = rounded.map((o) => ({
    ...o,
    roundedPayout: Math.round(o.roundedStake * o.odds * 100) / 100,
  }));

  const profits = outcomeResults.map((o) => o.roundedPayout - totalStake);
  const worstCaseProfit = Math.round(Math.min(...profits) * 100) / 100;
  const bestCaseProfit = Math.round(Math.max(...profits) * 100) / 100;
  const worstIndex = profits.indexOf(Math.min(...profits));
  const bestIndex = profits.indexOf(Math.max(...profits));

  return {
    outcomes: outcomeResults,
    totalStake: Math.round(totalStake * 100) / 100,
    worstCaseProfit,
    worstCaseProfitPercent: Math.round((worstCaseProfit / totalStake) * 100 * 100) / 100,
    worstCaseOutcome: {
      label: outcomeResults[worstIndex].label,
      bookmaker: outcomeResults[worstIndex].bookmaker,
    },
    bestCaseProfit,
    bestCaseOutcome: {
      label: outcomeResults[bestIndex].label,
      bookmaker: outcomeResults[bestIndex].bookmaker,
    },
    isSafe: worstCaseProfit >= 0,
  };
}
