import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { EventOdds } from '../types';
import { formatDateTime } from '../utils/format';

interface OddsModalProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
}

/** Desplegable "ver otras cuotas": muestra TODAS las casas que cubren un
 * evento (incluidas las vetadas, marcadas como tal) para que el usuario
 * pueda comparar y decidir dónde apostar manualmente. */
export function OddsModal({ eventId, eventName, onClose }: OddsModalProps) {
  const [odds, setOdds] = useState<EventOdds | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getEventOdds(eventId)
      .then((res) => {
        if (!cancelled) setOdds(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Error al obtener las cuotas');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const groups = odds
    ? Array.from(
        odds.quotes.reduce((map, q) => {
          const list = map.get(q.outcomeId) ?? [];
          list.push(q);
          map.set(q.outcomeId, list);
          return map;
        }, new Map<string, EventOdds['quotes']>())
      ).map(([outcomeId, quotes]) => ({
        outcomeId,
        outcomeLabel: quotes[0].outcomeLabel,
        quotes: [...quotes].sort((a, b) => b.odds - a.odds),
      }))
    : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Todas las cuotas</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {eventName}
              {odds && ` · ${formatDateTime(odds.startTime)}`}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        {loading && (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <span className="spinner" /> Cargando cuotas...
          </div>
        )}

        {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

        {odds && (
          <div>
            {groups.map((group) => (
              <div key={group.outcomeId} className="odds-group">
                <h4>{group.outcomeLabel}</h4>
                {group.quotes.map((q, i) => (
                  <div key={q.bookmaker} className={`odds-row${q.blocked ? ' blocked' : ''}`}>
                    <span className="odds-row-bookmaker">{q.bookmaker}</span>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {i === 0 && <span className="badge green">MEJOR</span>}
                      {q.blocked && <span className="badge">VETADA</span>}
                      <b>{q.odds.toFixed(2)}</b>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
