import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { Role } from '../lib/types';
import { EmptyState, Loading } from './States';

/** UX guard only — the API enforces the same rules independently. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) {
    return (
      <EmptyState title="Not available for your account" icon="lock">
        <p className="muted">This page is only for {role === 'ORGANIZER' ? 'organizers' : 'attendees'}.</p>
      </EmptyState>
    );
  }
  return <>{children}</>;
}
