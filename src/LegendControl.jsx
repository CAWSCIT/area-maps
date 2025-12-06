// LegendControl.jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function LegendControl() {
  const map = useMap();

  const legendItems = [
    {
      label: 'WSC Recognized',
      color: '#4f83cc',
    },
    {
      label: 'Not WSC Recognized',
      color: '#cc4f4f',
    },
    {
      label: 'Online Service Area (global)',
      color: 'rgba(0, 0, 0, 0)',
    },
  ];

  useEffect(() => {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');

      // Basic styling (you can move this to CSS)
      div.style.background = 'white';
      div.style.padding = '8px 12px';
      div.style.borderRadius = '4px';
      div.style.boxShadow = '0 0 6px rgba(0,0,0,0.2)';
      div.style.fontSize = '12px';

      div.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">Legend</div>
        ${legendItems
          .map(
            (item) => `
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="
                  width: 14px;
                  height: 14px;
                  background: ${item.color};
                  border: 1px solid #555;
                  margin-right: 6px;
                  display: inline-block;
                "></span>
                <span>${item.label}</span>
              </div>
            `
          )
          .join('')}
      `;
      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map, legendItems]);

  return null;
}
