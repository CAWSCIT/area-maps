import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import LegendControl from './LegendControl';

function FitToGeoJSON({ geoJsonRef }) {
  const map = useMap();
  useEffect(() => {
    const gj = geoJsonRef.current;
    if (gj) {
      const layer = gj; // GeoJSON layer
      const bounds = layer.getBounds?.();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geoJsonRef, map]);
  return null;
}

export default function GeoMapComponent({ initialData }) {
  const [geoJsonData] = useState(initialData);
  const [selected, setSelected] = useState(null); // { props, latlng }
  const geoJsonRef = useRef(null);

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
      color: '#ffd166',
    },
  ];


  const baseStyle = {
    weight: 2,
    opacity: 1,
    color: '#ffffff',
    fillColor: '#4f83cc',
    fillOpacity: 0.6,
  };

  // const styleFeature = useCallback(() => baseStyle, []);
  const styleFeature = useCallback((feature) => {
    const wsc = feature?.properties?.WSCRecognized;

    // Your rule: if it's NOT null, render differently
    const isSpecial = wsc !== null;

    return {
      ...baseStyle,
      fillColor: isSpecial ? '#cc4f4f' : '#4f83cc', // change these colors as you like
    };
  }, []);

  const highlightFeature = useCallback((e) => {
    const layer = e.target;
    layer.setStyle({
      weight: 3,
      color: '#222',
      fillOpacity: 0.75,
    });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }
  }, []);

  const resetHighlight = useCallback((e) => {
    const gj = geoJsonRef.current;
    if (gj && gj.resetStyle) gj.resetStyle(e.target);
  }, []);

  const zoomToFeature = useCallback((e) => {
    const map = e.target._map;
    const layer = e.target;
    if (layer.getBounds) map.fitBounds(layer.getBounds(), { padding: [20, 20] });

    // Open a React Popup at the click location
    setSelected({
      props: layer.feature?.properties ?? {},
      latlng: e.latlng,
    });
  }, []);

  const onEachFeature = useCallback((feature, layer) => {
    // Cursor hint
    layer.on('mouseover', () => (layer._path && (layer._path.style.cursor = 'pointer')));

    // Hover + click handlers
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature,
    });

    // Optional: also bind a simple Leaflet tooltip (hover)
    const name = feature.properties?.Name || 'Unnamed area';
    layer.bindTooltip(name, { sticky: true });
  }, [highlightFeature, resetHighlight, zoomToFeature]);

  return (
    <MapContainer zoom={5} style={{ height: '100vh', width: '100%' }}>

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <GeoJSON
        ref={geoJsonRef}
        data={geoJsonData}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      {/* Zoom into the loaded GeoJSON Areas */}
      <FitToGeoJSON geoJsonRef={geoJsonRef} />

      {selected && (
        <Popup
          position={selected.latlng}
          eventHandlers={{ remove: () => setSelected(null) }}
        >
          <div style={{ minWidth: 180 }}>
            <strong>{selected.props.Name ?? 'Area'}</strong>
            <div>Region: {selected.props.Region ?? '—'}</div>
            <div>WSC Recognized: {selected.props.WSCRecognized ?? 'Yes'}</div>
            {/* Add anything else you want from properties */}
          </div>
        </Popup>
      )}

      <LegendControl items={legendItems} />
    </MapContainer>
  );
}
