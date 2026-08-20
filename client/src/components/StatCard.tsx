interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  /** Pinta el valor en rojo (ej: saldo neto negativo). Tiene prioridad sobre `highlight`. */
  negative?: boolean;
}

export function StatCard({ label, value, sub, highlight, negative }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value${negative ? ' red' : highlight ? ' green' : ''}`}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
