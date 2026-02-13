import { formatFileSize } from '../utils/fileType';
import './BinaryCard.css';

interface BinaryCardProps {
  filePath: string;
  size?: number;
  mimeType?: string;
}

export function BinaryCard({ filePath, size, mimeType }: BinaryCardProps) {
  const fileName = filePath.split('/').pop() || filePath;

  return (
    <div className="binary-card">
      <div className="binary-card-icon">📦</div>
      <h2 className="binary-card-filename">{fileName}</h2>
      <div className="binary-card-info">
        <div className="binary-card-info-row">
          <span className="binary-card-label">Full path:</span>
          <span className="binary-card-value">{filePath}</span>
        </div>
        {size !== undefined && (
          <div className="binary-card-info-row">
            <span className="binary-card-label">Size:</span>
            <span className="binary-card-value">{formatFileSize(size)}</span>
          </div>
        )}
        {mimeType && (
          <div className="binary-card-info-row">
            <span className="binary-card-label">Type:</span>
            <span className="binary-card-value">{mimeType}</span>
          </div>
        )}
      </div>
      <p className="binary-card-message">
        This is a binary file that cannot be displayed in the browser.
      </p>
    </div>
  );
}
