import { useMemo, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { Filters } from '../components/Filters';
import { SurebetTable } from '../components/SurebetTable';
import { useSurebets } from '../hooks/useSurebets';
import { AppSettings, SurebetFilters } from '../types';
import { formatCurrency, formatPercent, timeAgo } from '../utils/format';

interface DashboardProps {
  settings: AppSettings;
}

const DEFAULT_FILTERS: SurebetFilters = {
  sport: 'todos',
  bookmaker: 'todas',
  minProfit: 0,
  search: '',
  sortBy: 'profit',
};

export function Dashboard({ settings }: DashboardProps) {
  const { surebets, loading, error, lastUpdated, refresh } = useSurebets(
    settings.defaultBankroll,
    settings
  );
  const [filters, setFilters] = useState<SurebetFilters>(DEFAULT_FILTERS);

  const bookmakers = useMemo(() => {
    const set = new Set<string>();
    surebets.forEach((s) => s.bookmakers.forEach((b) => set.add(b)));
    return Array.from(set).sort();
  }, [surebets]);

  const filtered = useMemo(() => {
    const result = surebets.filter((s) => {
      if (filters.sport !== 'todos' && s.sport !== filters.sport) return false;
      if (filters.bookmaker !== 'todas' && !s.bookmakers.includes(filters.bookmaker)) return false;
      if (s.profitPercent < filters.minProfit) return false;
      if (
        filters.search &&
        !`${s.eventName} ${s.competition}`.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...result];
    if (filters.sortBy === 'startTime') {
      sorted.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } else if (filters.sortBy === 'profit') {
      sorted.sort((a, b) => b.profitPercent - a.profitPercent);
    } else {
      sorted.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    }
    return sorted;
  }, [surebets, filters]);

  const totalPotentialProfit = filtered.reduce((sum, s) => sum + s.guaranteedProfit, 0);
  const bestProfit = filtered.length ? Math.max(...filtered.map((s) => s.profitPercent)) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Oportunidades de arbitraje detectadas en tiempo (casi) real. Se actualiza
            automáticamente cada 30 segundos.
          </p>
        </div>
        <button className="btn" onClick={refresh} disabled={loading}>
          {loading ? <span className="spinner" /> : '⟳'} Actualizar ahora
        </button>
      </div>

      <div className="stat-grid">
        <StatCard label="Surebets activas" value={String(filtered.length)} />
        <StatCard
          label="Mejor beneficio"
          value={`${bestProfit.toFixed(2)}%`}
          highlight
        />
        <StatCard
          label="Beneficio potencial total"
          value={formatCurrency(totalPotentialProfit, settings.currency)}
          highlight
        />
        <StatCard
          label="Última actualización"
          value={lastUpdated ? timeAgo(lastUpdated) : '—'}
          sub="Auto-refresco cada 30s"
        />
      </div>

      <div className="panel">
        <Filters filters={filters} onChange={setFilters} bookmakers={bookmakers} />
        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}
        {filtered.length > 0 && filters.sortBy === 'profit' && (
          <div
            className="result-box positive"
            style={{ marginBottom: 18, marginTop: 0 }}
          >
            <strong>⭐ Recomendada ahora: {filtered[0].eventName}</strong>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {filtered[0].competition} · {formatPercent(filtered[0].profitPercent)} de beneficio
              {settings.discreetModeEnabled && ' · importes en modo discreto activados'}
            </div>
          </div>
        )}
        <SurebetTable
          surebets={filtered}
          currency={settings.currency}
          discreetModeEnabled={settings.discreetModeEnabled}
          discreetRoundingUnit={settings.discreetRoundingUnit}
        />
      </div>
    </div>
  );
}
