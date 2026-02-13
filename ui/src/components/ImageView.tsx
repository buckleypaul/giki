import './ImageView.css';

interface ImageViewProps {
  filePath: string;
}

export function ImageView({ filePath }: ImageViewProps) {
  const imageUrl = `/api/file/${filePath}`;

  return (
    <div className="image-view">
      <div className="image-view-header">
        <span className="image-view-filename">{filePath}</span>
      </div>
      <div className="image-view-body">
        <img
          src={imageUrl}
          alt={filePath}
          className="image-view-content"
        />
      </div>
    </div>
  );
}
