import { useMemo, useState } from 'react';
import {
  calculateArbitrage,
  calculateMinimumOdds,
  ArbitrageResult,
  OutcomeInput,
} from '../math/arbitrage';
import { applyDiscreetRounding } from '../utils/discreetMode';
import { AppSettings } from '../types';
import { formatCurrency, formatPercent } from '../utils/format';

interface CalculatorProps {
  settings: AppSettings;
}

function newOutcome(label: string): OutcomeInput {
  return { id: crypto.randomUUID(), label, odds: 0, bookmaker: '' };
}

type Mode = 'arbitrage' | 'solve';

export function Calculator({ settings }: CalculatorProps) {
  const [mode, setMode] = useState<Mode>('arbitrage');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Calculadora de arbitraje</h1>
          <p>
            {mode === 'arbitrage'
              ? 'Introduce las cuotas manualmente (2 o más resultados) y calcula el reparto óptimo del bankroll.'
              : 'Introduce las cuotas que ya conoces y descubre qué cuota mínima necesitas en el resultado que te falta, para ir a buscarla manualmente en otras casas.'}
          </p>
        </div>
      </div>

      <div className="tag-row" style={{ marginBottom: 18 }}>
        <button
          className="btn"
          style={mode === 'arbitrage' ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
          onClick={() => setMode('arbitrage')}
        >
          🧮 Calcular arbitraje
        </button>
        <button
          className="btn"
          style={mode === 'solve' ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
          onClick={() => setMode('solve')}
        >
          🔎 ¿Qué cuota necesito?
        </button>
      </div>

      {mode === 'arbitrage' ? (
        <ArbitrageMode settings={settings} />
      ) : (
        <SolveMode settings={settings} />
      )}
    </div>
  );
}

function ArbitrageMode({ settings }: { settings: AppSettings }) {
  const [bankroll, setBankroll] = useState(settings.defaultBankroll);
  const [commission, setCommission] = useState(0);
  const [outcomes, setOutcomes] = useState<OutcomeInput[]>([
    newOutcome('Resultado 1'),
    newOutcome('Resultado 2'),
  ]);
  const [result, setResult] = useState<ArbitrageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const discreet = useMemo(() => {
    if (!result || !settings.discreetModeEnabled) return null;
    return applyDiscreetRounding(
      result.outcomes.map((o) => ({
        id: o.id,
        label: o.label,
        odds: o.odds,
        bookmaker: o.bookmaker,
        optimalStake: o.stake,
      })),
      settings.discreetRoundingUnit
    );
  }, [result, settings.discreetModeEnabled, settings.discreetRoundingUnit]);

  function updateOutcome(id: string, patch: Partial<OutcomeInput>) {
    setOutcomes((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function addOutcome() {
    if (outcomes.length >= 6) return;
    setOutcomes((prev) => [...prev, newOutcome(`Resultado ${prev.length + 1}`)]);
  }

  function removeOutcome(id: string) {
    if (outcomes.length <= 2) return;
    setOutcomes((prev) => prev.filter((o) => o.id !== id));
  }

  function handleCalculate() {
    setError(null);
    try {
      const withCommission = outcomes.map((o) => ({
        ...o,
        commission: commission > 0 ? commission / 100 : undefined,
      }));
      const res = calculateArbitrage(withCommission, bankroll);
      setResult(res);
    } catch (err: any) {
      setResult(null);
      setError(err.message ?? 'Datos inválidos');
    }
  }

  return (
    <div className="panel">
      <div className="form-grid">
        <div className="field">
          <label>Bankroll ({settings.currency})</label>
          <input
            type="number"
            min={0}
            value={bankroll}
            onChange={(e) => setBankroll(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Comisión de intercambio (%) — opcional</label>
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value))}
          />
        </div>
      </div>

      <h3 style={{ fontSize: 14, margin: '18px 0 10px', color: 'var(--text-secondary)' }}>
        Resultados posibles del mercado
      </h3>

      {outcomes.map((o) => (
        <div className="outcome-row" key={o.id}>
          <div className="field">
            <label>Nombre del resultado</label>
            <input
              type="text"
              value={o.label}
              onChange={(e) => updateOutcome(o.id, { label: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Cuota decimal</label>
            <input
              type="number"
              min={1.01}
              step={0.01}
              value={o.odds || ''}
              onChange={(e) => updateOutcome(o.id, { odds: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Casa de apuestas</label>
            <input
              type="text"
              placeholder="ej: Bet365"
              value={o.bookmaker}
              onChange={(e) => updateOutcome(o.id, { bookmaker: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Prob. implícita</label>
            <input type="text" disabled value={o.odds > 1 ? `${(100 / o.odds).toFixed(1)}%` : '—'} />
          </div>
          <button
            className="icon-btn"
            onClick={() => removeOutcome(o.id)}
            disabled={outcomes.length <= 2}
            title="Eliminar resultado"
          >
            ✕
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button className="btn" onClick={addOutcome} disabled={outcomes.length >= 6}>
          + Añadir resultado
        </button>
        <button className="btn btn-primary" onClick={handleCalculate}>
          Calcular arbitraje
        </button>
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 14 }}>{error}</div>}

      {result && (
        <div className={`result-box ${result.isArbitrage ? 'positive' : 'negative'}`}>
          <strong>
            {result.isArbitrage
              ? '✅ ¡Arbitraje detectado! Puedes garantizar beneficio.'
              : '❌ No hay arbitraje con estas cuotas (margen ≥ 100%).'}
          </strong>

          <div className="result-metrics">
            <div className="metric">
              <div className="label">Beneficio %</div>
              <div className="value">{formatPercent(result.profitPercent)}</div>
            </div>
            <div className="metric">
              <div className="label">ROI</div>
              <div className="value">{formatPercent(result.roi)}</div>
            </div>
            <div className="metric">
              <div className="label">Beneficio garantizado</div>
              <div className="value">{formatCurrency(result.guaranteedProfit, settings.currency)}</div>
            </div>
            <div className="metric">
              <div className="label">Total invertido</div>
              <div className="value">{formatCurrency(result.totalStake, settings.currency)}</div>
            </div>
            <div className="metric">
              <div className="label">Margen combinado</div>
              <div className="value">{(result.margin * 100).toFixed(2)}%</div>
            </div>
          </div>

          <h4 style={{ marginTop: 20, marginBottom: 10, fontSize: 13.5 }}>
            Reparto de stake por resultado (óptimo exacto)
          </h4>
          <table className="surebets-table">
            <thead>
              <tr>
                <th>Resultado</th>
                <th>Casa</th>
                <th>Cuota</th>
                <th>Apostar</th>
                <th>Retorno si gana</th>
              </tr>
            </thead>
            <tbody>
              {result.outcomes.map((o) => (
                <tr key={o.id}>
                  <td data-label="Resultado">{o.label}</td>
                  <td data-label="Casa">{o.bookmaker || '—'}</td>
                  <td data-label="Cuota">{o.odds.toFixed(2)}</td>
                  <td data-label="Apostar">{formatCurrency(o.stake, settings.currency)}</td>
                  <td data-label="Retorno si gana">{formatCurrency(o.payout, settings.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {discreet && (
            <>
              <h4 style={{ marginTop: 24, marginBottom: 4, fontSize: 13.5 }}>
                Reparto en modo discreto (importes redondeados)
              </h4>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 10 }}>
                Beneficio si gana el peor resultado:{' '}
                <strong style={{ color: discreet.isSafe ? 'var(--green)' : 'var(--red)' }}>
                  {formatCurrency(discreet.worstCaseProfit, settings.currency)} (
                  {formatPercent(discreet.worstCaseProfitPercent)})
                </strong>
                {' · '}si gana el mejor: {formatCurrency(discreet.bestCaseProfit, settings.currency)}
                {!discreet.isSafe && (
                  <>
                    {' — '}
                    <strong style={{ color: 'var(--red)' }}>
                      ⚠️ con esta unidad de redondeo, algún resultado quedaría en pérdidas. Baja la
                      unidad de redondeo en Configuración.
                    </strong>
                  </>
                )}
              </p>
              <table className="surebets-table">
                <thead>
                  <tr>
                    <th>Resultado</th>
                    <th>Casa</th>
                    <th>Cuota</th>
                    <th>Apostar (discreto)</th>
                    <th>Retorno si gana</th>
                  </tr>
                </thead>
                <tbody>
                  {discreet.outcomes.map((o) => (
                    <tr key={o.id}>
                      <td data-label="Resultado">{o.label}</td>
                      <td data-label="Casa">{o.bookmaker || '—'}</td>
                      <td data-label="Cuota">{o.odds.toFixed(2)}</td>
                      <td data-label="Apostar (discreto)">
                        {formatCurrency(o.roundedStake, settings.currency)}
                      </td>
                      <td data-label="Retorno si gana">
                        {formatCurrency(o.roundedPayout, settings.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SolveOutcome {
  id: string;
  label: string;
  odds: string; // texto libre; vacío = "esta es la que busco"
  bookmaker: string;
}

function newSolveOutcome(label: string): SolveOutcome {
  return { id: crypto.randomUUID(), label, odds: '', bookmaker: '' };
}

function SolveMode({ settings }: { settings: AppSettings }) {
  const [outcomes, setOutcomes] = useState<SolveOutcome[]>([
    newSolveOutcome('Resultado 1'),
    newSolveOutcome('Resultado 2'),
  ]);
  const [targetId, setTargetId] = useState<string>(outcomes[0].id);
  const [targetProfit, setTargetProfit] = useState(0);

  function updateOutcome(id: string, patch: Partial<SolveOutcome>) {
    setOutcomes((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function addOutcome() {
    if (outcomes.length >= 6) return;
    setOutcomes((prev) => [...prev, newSolveOutcome(`Resultado ${prev.length + 1}`)]);
  }

  function removeOutcome(id: string) {
    if (outcomes.length <= 2) return;
    setOutcomes((prev) => {
      const next = prev.filter((o) => o.id !== id);
      if (targetId === id) setTargetId(next[0].id);
      return next;
    });
  }

  const { result, error } = useMemo(() => {
    const known = outcomes.filter((o) => o.id !== targetId);
    if (known.some((o) => !o.odds || Number(o.odds) <= 1)) {
      return { result: null, error: null }; // aún incompletas, sin mostrar error mientras se escribe
    }
    try {
      return { result: calculateMinimumOdds(known.map((o) => Number(o.odds)), targetProfit), error: null };
    } catch (err: any) {
      return { result: null, error: err.message ?? 'Datos inválidos' };
    }
  }, [outcomes, targetId, targetProfit]);

  const target = outcomes.find((o) => o.id === targetId);

  return (
    <div className="panel">
      <div className="form-grid">
        <div className="field">
          <label>Beneficio objetivo (%) — 0 = solo punto de equilibrio</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={targetProfit}
            onChange={(e) => setTargetProfit(Number(e.target.value))}
          />
        </div>
      </div>

      <h3 style={{ fontSize: 14, margin: '18px 0 10px', color: 'var(--text-secondary)' }}>
        Resultados del mercado — marca cuál es el que te falta
      </h3>

      {outcomes.map((o) => {
        const isTarget = o.id === targetId;
        return (
          <div className="outcome-row" key={o.id}>
            <div className="field">
              <label>Nombre del resultado</label>
              <input
                type="text"
                value={o.label}
                onChange={(e) => updateOutcome(o.id, { label: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{isTarget ? 'Cuota (la que buscamos)' : 'Cuota decimal conocida'}</label>
              <input
                type="number"
                min={1.01}
                step={0.01}
                placeholder={isTarget ? '?' : ''}
                disabled={isTarget}
                value={isTarget ? '' : o.odds}
                onChange={(e) => updateOutcome(o.id, { odds: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Casa de apuestas</label>
              <input
                type="text"
                placeholder="ej: Bet365"
                value={o.bookmaker}
                onChange={(e) => updateOutcome(o.id, { bookmaker: e.target.value })}
              />
            </div>
            <button
              className="btn"
              style={
                isTarget ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined
              }
              onClick={() => setTargetId(o.id)}
            >
              {isTarget ? '🔎 Es esta' : 'Buscar esta'}
            </button>
            <button
              className="icon-btn"
              onClick={() => removeOutcome(o.id)}
              disabled={outcomes.length <= 2}
              title="Eliminar resultado"
            >
              ✕
            </button>
          </div>
        );
      })}

      <button className="btn" onClick={addOutcome} disabled={outcomes.length >= 6}>
        + Añadir resultado
      </button>

      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 14 }}>{error}</div>}

      {result && (
        <div className={`result-box ${result.feasible ? 'positive' : 'negative'}`}>
          {result.feasible ? (
            <>
              <strong>
                Necesitas una cuota superior a {result.minOdds!.toFixed(3)} en "{target?.label}"
              </strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
                {targetProfit > 0
                  ? `para lograr al menos ${targetProfit}% de beneficio, `
                  : 'para empezar a tener arbitraje (punto de equilibrio), '}
                con las cuotas ya introducidas en los demás resultados. Cualquier casa que
                ofrezca {result.minOdds!.toFixed(2)} o más en ese resultado te vale — ese es el
                número que tienes que ir a buscar manualmente en otras casas.
              </p>
            </>
          ) : (
            <>
              <strong>❌ Imposible con las cuotas actuales</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
                Ni con una cuota infinitamente alta en "{target?.label}" se alcanzaría{' '}
                {targetProfit > 0 ? `un beneficio del ${targetProfit}%` : 'el punto de equilibrio'}.
                Las cuotas conocidas ya suman demasiada probabilidad implícita por sí solas
                ({formatPercent(result.knownMargin * 100)}). Prueba a bajar el beneficio
                objetivo, o revisa si esas cuotas conocidas son correctas.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
