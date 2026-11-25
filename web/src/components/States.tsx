import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" aria-busy="true">
      <div className="spinner" />
      <p className="muted">{label}</p>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading events">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-media" />
          <div className="skeleton skeleton-line" style={{ width: '40%' }} />
          <div className="skeleton skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton skeleton-line" style={{ width: '60%' }} />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <div className="state-icon state-icon-error">
        <Icon name="alert" size={22} />
      </div>
      <h3>Something went wrong</h3>
      <p className="muted">{error.message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, icon = 'calendar' }: { title: string; children?: ReactNode; icon?: IconName }) {
  return (
    <div className="state">
      <div className="state-icon">
        <Icon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
