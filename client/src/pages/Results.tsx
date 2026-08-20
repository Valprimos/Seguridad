import { useEffect, useMemo, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { api } from '../services/api';
import {
  AppSettings,
  PendingResultEvent,
  ResultsSummary,
  SettledSurebetRecord,
  SettledValueBetRecord,
} from '../types';
import { formatCurrency, formatDateTime, timeAgo } from '../utils/format';

interface ResultsPageProps {
  settings: AppSettings;
}

interface LedgerRow {
  key: string;
  type: 'surebet' | 'valor';
  eventId: string;
  eventName: string;
  competition: string;
  detail: string;
  settled: boolean;
  resultLabel: string | null;
  actualProfit: number | null;
  detectedAt: string;
}

export function ResultsPage({ settings }: ResultsPageProps) {
  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [pending, setPending] = useState<PendingResultEvent[]>([]);
  const [surebets, setSurebets] = useState<SettledSurebetRecord[]>([]);
  const [valueBets, setValueBets] = useState<SettledValueBetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [summaryRes, pendingRes, surebetsRes, valueBetsRes] = await Promise.all([
        api.getResultsSummary(),
        api.getPendingResults(),
        api.getHistory({}),
        api.getValueBetHistory({}),
      ]);
      setSummary(summaryRes);
      setPending(pendingRes.data);
      setSurebets(surebetsRes.data);
      setValueBets(valueBetsRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedEvent = pending.find((p) => p.eventId === selectedEventId) ?? null;

  async function handleRecordResult() {
    if (!selectedEvent || !selectedOutcomeId) return;
    const outcome = selectedEvent.outcomes.find((o) => o.id === selectedOutcomeId);
    if (!outcome) return;
    setSaving(true);
    setError(null);
    try {
      await api.recordResult({
        eventId: selectedEvent.eventId,
        eventName: selectedEvent.eventName,
        winningOutcomeId: outcome.id,
        winningOutcomeLabel: outcome.label,
      });
      setSelectedEventId('');
      setSelectedOutcomeId('');
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar el resultado');
    } finally {
      setSaving(false);
    }
  }

  async function handleUndo(eventId: string) {
    await api.deleteResult(eventId);
    await loadAll();
  }

  const ledger: LedgerRow[] = useMemo(() => {
    const surebetRows: LedgerRow[] = surebets.map((s) => ({
      key: `surebet-${s.id}`,
      type: 'surebet',
      eventId: s.id,
      eventName: s.eventName,
      competition: s.competition,
      detail: `Arbitraje entre ${s.bookmakers.join(', ')}`,
      settled: s.settled,
      resultLabel: s.resultOutcomeLabel,
      actualProfit: s.actualProfit,
      detectedAt: s.detectedAt,
    }));
    const valueBetRows: LedgerRow[] = valueBets.map((v) => ({
      key: `valor-${v.id}`,
      type: 'valor',
      eventId: v.eventId,
      eventName: v.eventName,
      competition: v.competition,
      detail: `${v.outcomeLabel} @ ${v.odds.toFixed(2)} en ${v.bookmaker}`,
      settled: v.settled,
      resultLabel: v.resultOutcomeLabel,
      actualProfit: v.actualProfit,
      detectedAt: v.detectedAt,
    }));
    return [...surebetRows, ...valueBetRows].sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  }, [surebets, valueBets]);

  if (loading && !summary) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <span className="spinner" /> Cargando resultados...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Resultados</h1>
          <p>
            Registra a mano el resultado real de los partidos estudiados (no hay proveedor de
            resultados conectado) para ver el saldo neto que tendrías si hubieras seguido las
            surebets y las cuotas de valor detectadas.
          </p>
        </div>
      </div>

      {summary && (
        <div className="stat-grid">
          <StatCard
            label="Saldo neto"
            value={formatCurrency(summary.netBalance, settings.currency)}
            highlight={summary.netBalance >= 0}
            negative={summary.netBalance < 0}
          />
          <StatCard label="Surebets liquidadas" value={String(summary.settledSurebets)} />
          <StatCard
            label="Cuotas de valor liquidadas"
            value={String(summary.settledValueBets)}
            sub={`${summary.valueBetsWon} ganadas · ${summary.valueBetsLost} perdidas`}
          />
          <StatCard label="Partidos pendientes" value={String(summary.pendingEvents)} />
        </div>
      )}

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          Registrar resultado
        </h3>
        {pending.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            No hay partidos estudiados pendientes de resultado ahora mismo.
          </p>
        ) : (
          <>
            <div className="form-grid">
              <div className="field">
                <label>Partido</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setSelectedOutcomeId('');
                  }}
                >
                  <option value="">Selecciona un partido...</option>
                  {pending.map((p) => (
                    <option key={p.eventId} value={p.eventId}>
                      {p.eventName} · {p.competition} · {formatDateTime(p.startTime)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedEvent && (
              <>
                <h4 style={{ fontSize: 13, margin: '4px 0 10px', color: 'var(--text-secondary)' }}>
                  ¿Quién ganó?
                </h4>
                <div className="tag-row" style={{ marginBottom: 14 }}>
                  {selectedEvent.outcomes.map((o) => (
                    <button
                      key={o.id}
                      className="btn"
                      style={
                        selectedOutcomeId === o.id
                          ? { borderColor: 'var(--green)', color: 'var(--green)' }
                          : undefined
                      }
                      onClick={() => setSelectedOutcomeId(o.id)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleRecordResult}
                  disabled={!selectedOutcomeId || saving}
                >
                  {saving ? 'Guardando...' : 'Guardar resultado'}
                </button>
              </>
            )}
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{error}</div>}
          </>
        )}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          Historial de partidos estudiados (surebets + cuotas de valor)
        </h3>
        {ledger.length === 0 ? (
          <div className="empty-state">Todavía no se ha estudiado ningún partido.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="surebets-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th>Resultado</th>
                  <th>Beneficio</th>
                  <th>Detectada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.key}>
                    <td data-label="Evento">
                      <div style={{ fontWeight: 600 }}>{row.eventName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.competition}</div>
                    </td>
                    <td data-label="Tipo">
                      <span className={`badge${row.type === 'valor' ? ' green' : ''}`}>
                        {row.type === 'surebet' ? 'Surebet' : 'Valor'}
                      </span>
                    </td>
                    <td data-label="Detalle" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {row.detail}
                    </td>
                    <td data-label="Resultado">
                      {row.settled ? (
                        <span className="badge green">{row.resultLabel}</span>
                      ) : (
                        <span className="badge">Pendiente</span>
                      )}
                    </td>
                    <td data-label="Beneficio">
                      {row.actualProfit === null ? (
                        '—'
                      ) : (
                        <span
                          className="profit-pill"
                          style={
                            row.actualProfit < 0
                              ? { color: 'var(--red)', background: 'var(--red-soft)' }
                              : undefined
                          }
                        >
                          {row.actualProfit >= 0 ? '+' : ''}
                          {formatCurrency(row.actualProfit, settings.currency)}
                        </span>
                      )}
                    </td>
                    <td data-label="Detectada" style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                      {timeAgo(row.detectedAt)}
                    </td>
                    <td data-label="">
                      {row.settled && (
                        <button
                          className="icon-btn"
                          title="Deshacer resultado"
                          onClick={() => handleUndo(row.eventId)}
                        >
                          ↺
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
