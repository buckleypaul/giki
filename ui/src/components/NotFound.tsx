import { Link } from 'react-router-dom';
import './NotFound.css';

interface NotFoundProps {
  path: string;
}

export function NotFound({ path }: NotFoundProps) {
  return (
    <div className="not-found">
      <h1>404 - File Not Found</h1>
      <p>
        The file <code>{path}</code> does not exist in this repository.
      </p>
      <Link to="/" className="not-found-link">
        Go to home
      </Link>
    </div>
  );
}
