import ScorerScreen from './scorer/ScorerScreen.jsx';
import AdminScreen from './admin/AdminScreen.jsx';
import ProjectorScreen from './projector/ProjectorScreen.jsx';
import HistoryScreen from './history/HistoryScreen.jsx';

// One screen per path. "/" is the scorer screen.
export default function App() {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return <AdminScreen />;
  if (path.startsWith('/projector')) return <ProjectorScreen />;
  if (path.startsWith('/history')) return <HistoryScreen />;
  return <ScorerScreen />;
}
