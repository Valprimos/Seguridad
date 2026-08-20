/**
 * math/valuebet.ts
 * ------------------------------------------------------------------
 * "Cuotas de alto valor" (value betting): a diferencia de una surebet
 * (arbitraje garantizado combinando varias casas), una cuota de valor
 * es UNA sola apuesta cuyo precio es más alto de lo que "debería" ser
 * según la probabilidad real del resultado — tiene valor esperado
 * (EV) positivo a largo plazo, aunque cada apuesta individual pueda
 * perderse.
 *
 * ¿Cómo se estima la probabilidad "real" de un resultado? Ninguna
 * casa publica la probabilidad real: publica una cuota con margen
 * (overround) incluido. La técnica estándar es el "des-margenado"
 * (de-vig):
 *
 *   1. Cada casa, para un mismo evento, ofrece una cuota por cada
 *      resultado posible. La suma de probabilidades implícitas
 *      (1/cuota) de esa casa es SIEMPRE > 100% (ese exceso es el
 *      margen/vig de la casa).
 *   2. Se normaliza cada probabilidad implícita dividiéndola por esa
 *      suma, para obtener la estimación de probabilidad "real" que
 *      maneja ESA casa (sin su margen).
 *   3. Se promedian esas probabilidades des-margenadas entre TODAS
 *      las casas que cubren el evento -> probabilidad de consenso
 *      ("sharp"/de mercado), que es la mejor estimación disponible de
 *      la probabilidad real sin depender de ninguna casa en concreto.
 *   4. Cualquier casa cuya cuota pague MÁS que 1/probabilidad_consenso
 *      ofrece valor: está pagando por encima de lo que el mercado en
 *      conjunto cree que vale ese resultado.
 *
 * El "edge" (ventaja) de una cuota concreta es:
 *
 *       EV% = (cuota × probabilidad_consenso − 1) × 100
 *
 * Y el tamaño de apuesta recomendado usa el criterio de Kelly
 * (fraccionado, para reducir varianza):
 *
 *       kelly = (cuota × prob − 1) / (cuota − 1)
 *       stake = bankroll × kelly × fracciónKelly
 * ------------------------------------------------------------------
 */

export interface ValueQuoteInput {
  outcomeId: string;
  outcomeLabel: string;
  bookmaker: string;
  odds: number;
}

export interface FairOutcome {
  outcomeId: string;
  outcomeLabel: string;
  fairProbability: number;
  fairOdds: number;
  booksUsed: number;
}

/** Mínimo de casas distintas cubriendo un evento para poder estimar una
 * probabilidad de consenso mínimamente fiable. Con 1-2 casas, "el
 * consenso" es en realidad solo esa misma casa (o casi), así que no
 * hay una referencia independiente contra la que medir el valor. */
export const MIN_BOOKS_FOR_FAIR_ODDS = 3;

/**
 * Des-margena las cuotas de UNA casa (todos los resultados de un mismo
 * evento/mercado que ofrece esa casa) y devuelve su probabilidad
 * "real" estimada para cada resultado.
 */
export function devigBookmakerProbabilities(
  quotes: { outcomeId: string; odds: number }[]
): Map<string, number> {
  const implied = quotes.map((q) => ({ outcomeId: q.outcomeId, prob: 1 / q.odds }));
  const overround = implied.reduce((sum, q) => sum + q.prob, 0);
  const result = new Map<string, number>();
  for (const q of implied) {
    result.set(q.outcomeId, overround > 0 ? q.prob / overround : 0);
  }
  return result;
}

/**
 * Calcula la probabilidad de consenso ("justa") de cada resultado de
 * un evento, promediando las probabilidades des-margenadas de todas
 * las casas que cubren ESE evento completo (todos sus resultados).
 */
export function computeFairOutcomes(
  quotesByBookmaker: Map<string, ValueQuoteInput[]>,
  outcomeLabels: Map<string, string>
): FairOutcome[] {
  const probsByOutcome = new Map<string, number[]>();

  for (const quotes of quotesByBookmaker.values()) {
    const devigged = devigBookmakerProbabilities(quotes);
    for (const [outcomeId, prob] of devigged) {
      const list = probsByOutcome.get(outcomeId) ?? [];
      list.push(prob);
      probsByOutcome.set(outcomeId, list);
    }
  }

  const result: FairOutcome[] = [];
  for (const [outcomeId, probs] of probsByOutcome) {
    const fairProbability = probs.reduce((sum, p) => sum + p, 0) / probs.length;
    result.push({
      outcomeId,
      outcomeLabel: outcomeLabels.get(outcomeId) ?? outcomeId,
      fairProbability,
      fairOdds: fairProbability > 0 ? 1 / fairProbability : Infinity,
      booksUsed: probs.length,
    });
  }
  return result;
}

export interface ValueEvaluation {
  evPercent: number;
  kellyFraction: number;
}

/** EV% y fracción de Kelly (SIN fraccionar) de una cuota concreta frente a la probabilidad justa. */
export function evaluateValue(odds: number, fairProbability: number): ValueEvaluation {
  const evPercent = (odds * fairProbability - 1) * 100;
  const kellyFraction = odds > 1 ? (odds * fairProbability - 1) / (odds - 1) : 0;
  return { evPercent, kellyFraction: Math.max(0, kellyFraction) };
}

/** Redondeo estándar a 2 decimales para importes monetarios */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
