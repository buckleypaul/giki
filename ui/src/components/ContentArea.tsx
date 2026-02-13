import { useLocation } from 'react-router-dom';
import './ContentArea.css';

export default function ContentArea() {
  const location = useLocation();

  return (
    <main className="content-area">
      <div className="content-placeholder">
        <h1>Content Area</h1>
        <p>Current route: <code>{location.pathname}</code></p>
        <p>File rendering will be implemented in Steps 12-14.</p>
      </div>
    </main>
  );
}
