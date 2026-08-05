import { SPORT_LABELS, SurebetRecord } from '../types';
import { applyDiscreetRounding } from '../utils/discreetMode';
import { formatCurrency, formatDateTime, formatPercent, timeAgo } from '../utils/format';

interface SurebetTableProps {
  surebets: SurebetRecord[];
  currency: string;
  discreetModeEnabled?: boolean;
  discreetRoundingUnit?: number;
}

export function SurebetTable({
  surebets,
  currency,
  discreetModeEnabled = false,
  discreetRoundingUnit = 5,
}: SurebetTableProps) {
  if (surebets.length === 0) {
    return (
      <div className="empty-state">
        No hay surebets que cumplan los filtros seleccionados ahora mismo.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="surebets-table">
        <thead>
          <tr>
            <th>Evento</th>
            <th>Fecha del partido</th>
            <th>Deporte</th>
            <th>Mercado</th>
            <th>Reparto de stake</th>
            <th>Beneficio</th>
            <th>ROI</th>
            <th>Invertido</th>
            <th>Detectada</th>
          </tr>
        </thead>
        <tbody>
          {surebets.map((s) => {
            // En modo discreto, redondeamos los importes mostrados para
            // que no parezcan un cálculo exacto de arbitraje. El peor
            // caso ya no es idéntico en todos los resultados, así que
            // mostramos el rango (peor caso / mejor caso) en vez de una
            // única cifra de "beneficio garantizado".
            const discreet = discreetModeEnabled
              ? applyDiscreetRounding(
                  s.outcomes.map((o) => ({
                    id: o.outcomeId,
                    label: o.outcomeLabel,
                    odds: o.odds,
                    bookmaker: o.bookmaker,
                    optimalStake: o.stake,
                  })),
                  discreetRoundingUnit
                )
              : null;

            return (
              <tr key={s.id}>
                <td data-label="Evento">
                  <div style={{ fontWeight: 600 }}>{s.eventName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.competition}</div>
                  {s.isDemo && <span className="badge demo" style={{ marginTop: 6 }}>DEMO</span>}
                </td>
                <td data-label="Fecha del partido" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {formatDateTime(s.startTime)}
                </td>
                <td data-label="Deporte">
                  <span className="badge">{SPORT_LABELS[s.sport]}</span>
                </td>
                <td data-label="Mercado">{s.market}</td>
                <td data-label="Reparto de stake">
                  <div className="outcomes-list">
                    {(discreet ? discreet.outcomes : s.outcomes).map((o: any) => (
                      <div key={o.outcomeId ?? o.id}>
                        <b>{o.outcomeLabel ?? o.label}</b> @ {o.odds.toFixed(2)} ·{' '}
                        {formatCurrency(o.roundedStake ?? o.stake, currency)} en{' '}
                        <b>{o.bookmaker}</b>
                      </div>
                    ))}
                  </div>
                </td>
                <td data-label="Beneficio">
                  {discreet ? (
                    <>
                      <span
                        className="profit-pill"
                        style={
                          !discreet.isSafe
                            ? { color: 'var(--red)', background: 'var(--red-soft)' }
                            : undefined
                        }
                      >
                        {discreet.isSafe ? '+' : ''}
                        {formatCurrency(discreet.worstCaseProfit, currency)} peor caso
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        hasta {formatCurrency(discreet.bestCaseProfit, currency)} mejor caso
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="profit-pill">+{formatCurrency(s.guaranteedProfit, currency)}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {formatPercent(s.profitPercent)}
                      </div>
                    </>
                  )}
                </td>
                <td data-label="ROI">{formatPercent(s.roi)}</td>
                <td data-label="Invertido">
                  {formatCurrency(discreet ? discreet.totalStake : s.totalStake, currency)}
                </td>
                <td data-label="Detectada" style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                  {timeAgo(s.detectedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
