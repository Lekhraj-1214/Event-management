import { Route, Routes, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { EmptyState } from './components/States';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { EventFormPage } from './pages/EventFormPage';
import { AttendeesPage } from './pages/AttendeesPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="me/registrations" element={<RequireRole role="ATTENDEE"><MyRegistrationsPage /></RequireRole>} />
        <Route path="organizer" element={<RequireRole role="ORGANIZER"><OrganizerDashboard /></RequireRole>} />
        <Route path="organizer/events/new" element={<RequireRole role="ORGANIZER"><EventFormPage /></RequireRole>} />
        <Route path="organizer/events/:id/edit" element={<RequireRole role="ORGANIZER"><EventFormPage /></RequireRole>} />
        <Route path="organizer/events/:id/attendees" element={<RequireRole role="ORGANIZER"><AttendeesPage /></RequireRole>} />
        <Route
          path="*"
          element={
            <EmptyState title="Page not found" icon="compass">
              <Link to="/" className="btn btn-secondary">Go home</Link>
            </EmptyState>
          }
        />
      </Route>
    </Routes>
  );
}
