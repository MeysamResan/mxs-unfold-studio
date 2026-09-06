import { Box } from 'lucide-react';
import { memo, useState } from 'react';
import { useElementVisible } from '../../shared/use-element-visible';
import { assetUrl } from '../../core/assets/url';
import type { ShowcaseDefinition } from '../../core/catalog/types';

/** Catalogue previews stay static: only the selected object creates a 3D renderer. */
function ObjectThumbnailView({ item }: { item: ShowcaseDefinition }) {
  const [viewportRef, enteredViewport] = useElementVisible<HTMLSpanElement>({ once: true });
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const thumbnail = item.thumbnail;
  const available = thumbnail && failedPath !== thumbnail.path;

  return (
    <span ref={viewportRef} className="object-thumbnail">
      {available ? (
        enteredViewport && (
          <img
            src={assetUrl(thumbnail.path)}
            alt={thumbnail.alt}
            width={thumbnail.width}
            height={thumbnail.height}
            loading="lazy"
            decoding="async"
            onError={() => setFailedPath(thumbnail.path)}
          />
        )
      ) : (
        <span className="object-thumbnail-placeholder">
          <Box size={32} strokeWidth={1.2} aria-hidden="true" />
          <span>Preview coming soon</span>
        </span>
      )}
    </span>
  );
}

export const ObjectThumbnail = memo(ObjectThumbnailView);
