import { MapContainer, TileLayer, GeoJSON, Popup, useMap, CircleMarker, Pane } from 'react-leaflet';
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
  const [meetings, setMeetings] = useState([]);   // <--- new
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState(null);

  const handleLoadMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    setMeetingsError(null);

    try {
      const res = await fetch('https://caws-api.azurewebsites.net/api/v1/meetings-tsml');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      const cleaned = data
        .filter(m => m.latitude && m.longitude)
        .map(m => ({
          id: m.slug || `${m.latitude}-${m.longitude}-${m.name}`, // unique-ish fallback
          name: m.name || 'Meeting',
          latitude: Number(m.latitude),
          longitude: Number(m.longitude),
          day: m.day,                // 1–7 numeric (if that's your convention)
          time: m.time,              // "12:00"
          endTime: m.end_time,       // "13:00"
          area: m.area,
          region: m.region,
          address: m.formatted_address || m.address,
          url: m.url,
          attendanceOption: m.attendance_option, // "in_person", etc.
          notes: m.notes,
        }));
        console.log(cleaned)
      setMeetings(cleaned);
    } catch (err) {
      console.error(err);
      setMeetingsError(err.message || 'Failed to load meetings');
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

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
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      {/* Top-left controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {!meetings.length && (
          <button
            onClick={handleLoadMeetings}
            disabled={loadingMeetings}
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid #333',
              background: loadingMeetings ? '#ddd' : '#fff',
              cursor: loadingMeetings ? 'default' : 'pointer',
              fontSize: 13,
            }}
          >
            {loadingMeetings ? 'Loading meetings…' : 'Load all meetings'}
          </button>
        )}

        {meetingsError && (
          <span style={{ color: 'red', fontSize: 12 }}>
            {meetingsError}
          </span>
        )}
      </div>
      <MapContainer
        zoom={5}
        style={{ height: '100vh', width: '100%' }}
      >

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

          <Pane name="meetings" style={{ zIndex: 600 }}>
            {meetings.map((m) => (

              <CircleMarker
                key={m.id}
                center={[m.latitude, m.longitude]}
                radius={3}
                pathOptions={{
                  color: '#ff5722',
                  fillColor: '#ff5722',
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div>
                    <strong>{m.name}</strong>
                    {m.area && <div>Area: {m.area}</div>}
                    {m.region && <div>Region: {m.region}</div>}
                    {m.address && <div>{m.address}</div>}
                    {(m.day || m.time) && (
                      <div>
                        {m.day && <span>Day: {m.day}</span>} {/* or map 1–7 to names */}
                        {m.time && (
                          <>
                            {' '}
                            @ {m.time}
                            {m.endTime && `–${m.endTime}`}
                          </>
                        )}
                      </div>
                    )}
                    {m.attendanceOption && (
                      <div>Attendance: {m.attendanceOption.replace('_', ' ')}</div>
                    )}
                    {m.url && (
                      <div>
                        <a href={m.url} target="_blank" rel="noreferrer">
                          Website
                        </a>
                      </div>
                    )}
                    {m.notes && <div>Notes: {m.notes}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </Pane>
        <LegendControl items={legendItems} />
      </MapContainer>
    </div>
  );
}
