import { SPORT_LABELS, SurebetRecord } from '../types';
import { formatCurrency, formatPercent, timeAgo } from '../utils/format';

interface SurebetTableProps {
  surebets: SurebetRecord[];
  currency: string;
}

export function SurebetTable({ surebets, currency }: SurebetTableProps) {
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
          {surebets.map((s) => (
            <tr key={s.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{s.eventName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.competition}</div>
                {s.isDemo && <span className="badge demo" style={{ marginTop: 6 }}>DEMO</span>}
              </td>
              <td>
                <span className="badge">{SPORT_LABELS[s.sport]}</span>
              </td>
              <td>{s.market}</td>
              <td>
                <div className="outcomes-list">
                  {s.outcomes.map((o) => (
                    <div key={o.outcomeId}>
                      <b>{o.outcomeLabel}</b> @ {o.odds.toFixed(2)} ·{' '}
                      {formatCurrency(o.stake, currency)} en <b>{o.bookmaker}</b>
                    </div>
                  ))}
                </div>
              </td>
              <td>
                <span className="profit-pill">
                  +{formatCurrency(s.guaranteedProfit, currency)}
                  <br />
                </span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {formatPercent(s.profitPercent)}
                </div>
              </td>
              <td>{formatPercent(s.roi)}</td>
              <td>{formatCurrency(s.totalStake, currency)}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                {timeAgo(s.detectedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
