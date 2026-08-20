import { SPORT_LABELS, ValueBetRecord } from '../types';
import { formatCurrency, formatDateTime, formatPercent, timeAgo } from '../utils/format';

interface ValueBetTableProps {
  valueBets: ValueBetRecord[];
  currency: string;
}

export function ValueBetTable({ valueBets, currency }: ValueBetTableProps) {
  if (valueBets.length === 0) {
    return (
      <div className="empty-state">
        No hay cuotas de alto valor que cumplan los filtros seleccionados ahora mismo.
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
            <th>Resultado</th>
            <th>Casa</th>
            <th>Cuota</th>
            <th>Cuota justa</th>
            <th>Valor (EV)</th>
            <th>Apuesta sugerida</th>
            <th>Detectada</th>
          </tr>
        </thead>
        <tbody>
          {valueBets.map((v) => (
            <tr key={v.id}>
              <td data-label="Evento">
                <div style={{ fontWeight: 600 }}>{v.eventName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.competition}</div>
                {v.isDemo && <span className="badge demo" style={{ marginTop: 6 }}>DEMO</span>}
              </td>
              <td data-label="Fecha del partido" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                {formatDateTime(v.startTime)}
              </td>
              <td data-label="Deporte">
                <span className="badge">{SPORT_LABELS[v.sport]}</span>
              </td>
              <td data-label="Resultado">
                {v.outcomeLabel}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{v.market}</div>
              </td>
              <td data-label="Casa">
                <b>{v.bookmaker}</b>
              </td>
              <td data-label="Cuota">{v.odds.toFixed(2)}</td>
              <td data-label="Cuota justa">
                {v.fairOdds.toFixed(2)}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {v.booksUsed} casas · {formatPercent(v.fairProbability * 100, 1)} prob.
                </div>
              </td>
              <td data-label="Valor (EV)">
                <span className="ev-pill">+{formatPercent(v.evPercent)}</span>
              </td>
              <td data-label="Apuesta sugerida">
                {v.suggestedStake > 0 ? formatCurrency(v.suggestedStake, currency) : '—'}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Kelly fraccionado
                </div>
              </td>
              <td data-label="Detectada" style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                {timeAgo(v.detectedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
