import { useMemo, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { ValueBetFilters } from '../components/ValueBetFilters';
import { ValueBetTable } from '../components/ValueBetTable';
import { useValueBets } from '../hooks/useValueBets';
import { AppSettings, ValueBetFilters as ValueBetFiltersType } from '../types';
import { formatCurrency, formatPercent, timeAgo } from '../utils/format';

interface ValueBetsPageProps {
  settings: AppSettings;
}

const DEFAULT_FILTERS: ValueBetFiltersType = {
  sport: 'todos',
  bookmaker: 'todas',
  minEv: 0,
  search: '',
  sortBy: 'ev',
};

export function ValueBetsPage({ settings }: ValueBetsPageProps) {
  const { valueBets, loading, error, lastUpdated, refresh } = useValueBets(
    settings.defaultBankroll,
    settings.minEvPercent,
    settings.valueBetsEnabled
  );
  const [filters, setFilters] = useState<ValueBetFiltersType>(DEFAULT_FILTERS);

  const bookmakers = useMemo(() => {
    const set = new Set<string>();
    valueBets.forEach((v) => set.add(v.bookmaker));
    return Array.from(set).sort();
  }, [valueBets]);

  const filtered = useMemo(() => {
    const result = valueBets.filter((v) => {
      if (filters.sport !== 'todos' && v.sport !== filters.sport) return false;
      if (filters.bookmaker !== 'todas' && v.bookmaker !== filters.bookmaker) return false;
      if (v.evPercent < filters.minEv) return false;
      if (
        filters.search &&
        !`${v.eventName} ${v.competition}`.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...result];
    if (filters.sortBy === 'startTime') {
      sorted.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } else if (filters.sortBy === 'ev') {
      sorted.sort((a, b) => b.evPercent - a.evPercent);
    } else {
      sorted.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    }
    return sorted;
  }, [valueBets, filters]);

  const totalSuggestedStake = filtered.reduce((sum, v) => sum + v.suggestedStake, 0);
  const bestEv = filtered.length ? Math.max(...filtered.map((v) => v.evPercent)) : 0;

  if (!settings.valueBetsEnabled) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Cuotas de alto valor</h1>
            <p>El cálculo de cuotas de valor está desactivado.</p>
          </div>
        </div>
        <div className="empty-state">
          Actívalo en Configuración → "Cuotas de alto valor" para empezar a detectarlas.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Cuotas de alto valor</h1>
          <p>
            Cuotas individuales que pagan por encima de la probabilidad de consenso del
            mercado (value betting). Se actualiza automáticamente cada 30 segundos.
          </p>
        </div>
        <button className="btn" onClick={refresh} disabled={loading}>
          {loading ? <span className="spinner" /> : '⟳'} Actualizar ahora
        </button>
      </div>

      <div className="stat-grid">
        <StatCard label="Cuotas de valor activas" value={String(filtered.length)} />
        <StatCard label="Mejor EV" value={`${bestEv.toFixed(2)}%`} highlight />
        <StatCard
          label="Apuesta sugerida total"
          value={formatCurrency(totalSuggestedStake, settings.currency)}
          highlight
          sub={`Kelly ${Math.round(settings.kellyFraction * 100)}%`}
        />
        <StatCard
          label="Última actualización"
          value={lastUpdated ? timeAgo(lastUpdated) : '—'}
          sub="Auto-refresco cada 30s"
        />
      </div>

      <div className="panel">
        <ValueBetFilters filters={filters} onChange={setFilters} bookmakers={bookmakers} />
        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}
        {filtered.length > 0 && filters.sortBy === 'ev' && (
          <div className="result-box positive" style={{ marginBottom: 18, marginTop: 0 }}>
            <strong>💎 Mejor valor ahora: {filtered[0].eventName}</strong>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {filtered[0].outcomeLabel} @ {filtered[0].odds.toFixed(2)} en {filtered[0].bookmaker} ·{' '}
              {formatPercent(filtered[0].evPercent)} de valor esperado
            </div>
          </div>
        )}
        <ValueBetTable valueBets={filtered} currency={settings.currency} />
      </div>
    </div>
  );
}
