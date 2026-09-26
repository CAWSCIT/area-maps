import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Keeps Leaflet's internal size in sync with its container.
 *
 * Leaflet only listens for window resizes, which is fine for the full-page
 * app but not for an embed: the host page can resize or reveal our container
 * without the window ever changing size.
 */
export default function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [map]);

  return null;
}
