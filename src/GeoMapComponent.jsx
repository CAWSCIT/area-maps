import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap, Marker, Pane } from 'react-leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
import MarkerClusterGroup from 'react-leaflet-cluster';

import LegendControl from './LegendControl';
import caLogoWhite from '/src/assets/ca-logo-white.svg';

export const caMeetingIcon = L.divIcon({
  className: 'ca-marker-icon',
  html: `
    <div class="ca-marker">
      <div class="ca-marker-inner">
        <img src="${caLogoWhite}" alt="C.A. Logo" />
      </div>
    </div>
  `,
  iconSize: [32, 42],   // overall size (circle + pointer)
  iconAnchor: [16, 42], // bottom center = "tip" of pin
  popupAnchor: [0, -36],
});


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
  const [selected, setSelected] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState(null);

  const handleLoadMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    setMeetingsError(null);

    try {
      const res = await fetch('https://caws-api.azurewebsites.net/api/v1/meetings-tsml?area=all');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      const dayNames = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
      };

      const cleaned = data
        .filter(m => m.latitude && m.longitude)
        .map(m => ({
          id: m.slug || `${m.latitude}-${m.longitude}-${m.name}`, // unique-ish fallback
          name: m.name || 'Meeting',
          latitude: Number(m.latitude),
          longitude: Number(m.longitude),
          day: dayNames[m.day] || null,
          time: m.time,
          endTime: m.end_time,
          area: m.area,
          region: m.region,
          address: m.formatted_address || m.address,
          url: m.url,
          attendanceOption: m.attendance_option, // "in_person", etc.
          notes: m.notes,
        }));
      setMeetings(cleaned);
    } catch (err) {
      console.error(err);
      setMeetingsError(err.message || 'Failed to load meetings');
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  const geoJsonRef = useRef(null);


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
      <div className="load-meetings-control">
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
            <MarkerClusterGroup
              chunkedLoading
              zoomToBoundsOnClick={false}
              spiderfyOnMaxZoom={true}
              animate={false}
              showCoverageOnHover={false}
              onClick={(event) => {
                const cluster = event.layer;
                const map = cluster._map;

                // Zoom in by 1 instead of zoomToBounds
                map.setZoom(map.getZoom() + 3, {
                  animate: false,
                });

                // Optionally: center the map on the cluster
                map.panTo(cluster.getLatLng(), { animate: true });
              }}
              iconCreateFunction={(cluster) => {
                const count = cluster.getChildCount();

                return L.divIcon({
                  className: 'ca-marker-icon ca-marker-icon--cluster',
                  html: `
                    <div class="ca-marker ca-marker-cluster">
                      <div class="ca-marker-inner">${count}</div>
                    </div>
                  `,
                  iconSize: [16, 21],
                  iconAnchor: [16, 42],
                  popupAnchor: [0, -36],
                });
              }}
              >
            {meetings.map((m) => (

                <Marker
                  key={m.id}
                  position={[m.latitude, m.longitude]}
                  icon={caMeetingIcon}
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
              </Marker>
            ))}
            </MarkerClusterGroup>
          </Pane>
        <LegendControl />
      </MapContainer>
    </div>
  );
}
