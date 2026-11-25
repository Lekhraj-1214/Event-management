import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const initials = user?.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="topbar-left">
            <NavLink to="/" className="brand">
              <span className="brand-mark">G</span>
              <span className="brand-name">Gather</span>
            </NavLink>
            <nav className="nav">
              <NavLink to="/" end>
                Events
              </NavLink>
              {user?.role === 'ATTENDEE' && <NavLink to="/me/registrations">My tickets</NavLink>}
              {user?.role === 'ORGANIZER' && <NavLink to="/organizer">Dashboard</NavLink>}
            </nav>
          </div>
          {user ? (
            <div className="nav-user">
              <span className="avatar" aria-hidden>
                {initials}
              </span>
              <span className="nav-user-text">
                {user.name}
                <span>{user.role === 'ORGANIZER' ? 'Organizer' : 'Attendee'}</span>
              </span>
              <button
                className="link-button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            pathname !== '/login' && (
              <div className="nav-user">
                <NavLink to="/login" className="link-button">
                  Log in
                </NavLink>
                <NavLink to="/signup" className="btn btn-primary btn-sm">
                  Sign up
                </NavLink>
              </div>
            )
          )}
        </div>
      </header>
      <main className="container main" key={pathname}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>© {new Date().getFullYear()} Gather</span>
          <span>Event management demo · React, Express, PostgreSQL</span>
        </div>
      </footer>
    </div>
  );
}
