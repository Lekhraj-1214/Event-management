import { useState } from 'react';
import { eventPhoto } from '../lib/photos';
import type { EventItem } from '../lib/types';
import { Icon } from './Icon';

/** Event cover photo with lazy loading and a plain placeholder if the image fails. */
export function EventPhoto({
  event,
  width = 800,
  className = '',
  priority = false,
}: {
  event: Pick<EventItem, 'id' | 'title' | 'imageUrl'>;
  width?: number;
  className?: string;
  /** Above-the-fold images load immediately instead of lazily. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`photo ${className}`}>
      {failed ? (
        <div className="photo-fallback">
          <Icon name="image" size={22} />
        </div>
      ) : (
        <img src={eventPhoto(event, width)} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
