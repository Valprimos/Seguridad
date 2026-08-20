import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/valor', label: 'Cuotas de valor', icon: '💎' },
  { to: '/calculadora', label: 'Calculadora', icon: '🧮' },
  { to: '/historial', label: 'Historial', icon: '🕒' },
  { to: '/resultados', label: 'Resultados', icon: '🏁' },
  { to: '/estadisticas', label: 'Estadísticas', icon: '📈' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="logo-dot" />
        <span>Surebets</span>
      </div>

      <nav className="sidebar-nav">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        Modo DEMO — datos simulados.
        <br />
        Conecta un provider real en <code>server/src/providers</code>.
      </div>
    </aside>
  );
}
