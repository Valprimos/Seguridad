import { useEffect, useMemo, useState } from 'react';
import { Filters } from '../components/Filters';
import { SurebetTable } from '../components/SurebetTable';
import { api } from '../services/api';
import { AppSettings, SurebetFilters, SurebetRecord } from '../types';

interface HistoryProps {
  settings: AppSettings;
}

const DEFAULT_FILTERS: SurebetFilters = {
  sport: 'todos',
  bookmaker: 'todas',
  minProfit: 0,
  search: '',
  sortBy: 'detectedAt',
};

export function History({ settings }: HistoryProps) {
  const [records, setRecords] = useState<SurebetRecord[]>([]);
  const [filters, setFilters] = useState<SurebetFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getHistory({
        sport: filters.sport,
        bookmaker: filters.bookmaker,
        minProfit: filters.minProfit,
        search: filters.search,
        sortBy: filters.sortBy,
      })
      .then((res) => setRecords(res.data))
      .finally(() => setLoading(false));
  }, [filters]);

  const bookmakers = useMemo(() => {
    const set = new Set<string>();
    records.forEach((s) => s.bookmakers.forEach((b) => set.add(b)));
    return Array.from(set).sort();
  }, [records]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Historial</h1>
          <p>Todas las surebets detectadas y guardadas en la base de datos.</p>
        </div>
      </div>

      <div className="panel">
        <Filters filters={filters} onChange={setFilters} bookmakers={bookmakers} />
        {loading ? (
          <div className="empty-state">
            <span className="spinner" /> Cargando historial...
          </div>
        ) : (
          <SurebetTable
            surebets={records}
            currency={settings.currency}
            discreetModeEnabled={settings.discreetModeEnabled}
            discreetRoundingUnit={settings.discreetRoundingUnit}
          />
        )}
      </div>
    </div>
  );
}
