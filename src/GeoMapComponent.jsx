import { MapContainer, TileLayer, GeoJSON, Popup, Marker, Pane } from 'react-leaflet';
import { useCallback, useRef, useState } from 'react';
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
import MarkerClusterGroup from 'react-leaflet-cluster';

import LegendControl from './LegendControl';
import { caMeetingIcon, clusterIcon } from './Icons';
import caLogoWhite from '/src/assets/ca-logo-white.svg';


export default function GeoMapComponent({ initialData }) {
  const [geoJsonData] = useState(initialData);
  const [selected, setSelected] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState(null);
  const [highlightedRegion, setHighlightedRegion] = useState(null);

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

  const styleFeature = useCallback((feature) => {
    const props = feature?.properties ?? {};
    const wsc = props.WSCRecognized;
    const isInHighlightedRegion =
      highlightedRegion && props.Region === highlightedRegion;

    let style = {
      ...baseStyle,
    };

    // non-null WSCRecognized = different fill color
    if (wsc !== null && wsc !== undefined) {
      style.fillColor = '#cc4f4f';
    }

    // If this feature is in the highlighted region, beef up the style
    if (isInHighlightedRegion) {
      style = {
        ...style,
        weight: 4,
        color: '#ffd166',   // border color for region highlight
        fillOpacity: 0.85,
      };
    }

    return style;
  }, [baseStyle, highlightedRegion]);

  const zoomToFeature = useCallback((e) => {
    const map = e.target._map;
    const layer = e.target;
    const props = layer.feature?.properties ?? {};

    if (layer.getBounds) {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }

    // Highlight this Area's Region
    setHighlightedRegion(props.Region || null);

    // Open popup at click
    setSelected({
      props,
      latlng: e.latlng,
    });
  }, []);

  // Dark green region highlight on hover
  const highlightRegionOnHover = useCallback((e) => {
    const hoveredLayer = e.target;
    const hoveredRegion = hoveredLayer.feature?.properties?.Region;
    const gj = geoJsonRef.current;

    if (!gj || !hoveredRegion) return;

    gj.eachLayer((layer) => {
      const region = layer.feature?.properties?.Region;
      if (region === hoveredRegion) {
        layer.setStyle({
          weight: 3,
          color: '#00594f',      // c.a. green border
          fillOpacity: 0.8,
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
      }
    });
  }, []);

  const resetRegionHighlight = useCallback(() => {
    const gj = geoJsonRef.current;
    if (!gj || !gj.resetStyle) return;

    // Reset all features back to styleFeature() result
    gj.eachLayer((layer) => {
      gj.resetStyle(layer);
    });
  }, []);

  const onEachFeature = useCallback(
    (feature, layer) => {
      // Cursor hint
      layer.on('mouseover', () => {
        if (layer._path) layer._path.style.cursor = 'pointer';
      });

      // Hover + click handlers
      layer.on({
        mouseover: highlightRegionOnHover,
        mouseout: resetRegionHighlight,
        click: zoomToFeature,
      });

      // const name = feature.properties?.Name || 'Unnamed area';
      // layer.bindTooltip(name, { sticky: true });
      const name = feature.properties?.Name || "Unnamed area";
      const region = feature.properties?.Region || "Unknown region";

      layer.bindTooltip(
        `
          <div style="font-weight:bold;">${name}</div>
          <div style="opacity:0.8;">${region}</div>
        `,
        {
          sticky: true,
          direction: "top",
        }
      );
    },
    [highlightRegionOnHover, resetRegionHighlight, zoomToFeature]
  );

  return (
    <div>

      <div className="flex h-24 items-center justify-between px-2.5 py-2.5 bg-[#00594f]">
        {/* Logo */}
        <div className="flex items-center gap-2 font-semibold text-lg text-white font-open-sans">
          <img src={caLogoWhite} alt="C.A. Logo" className="h-24 w-auto" />
          Area Maps
        </div>
        {/* Top-left controls */}
        <div className="">
          {!meetings.length && (
            <button
              onClick={handleLoadMeetings}
              disabled={loadingMeetings}
              className="py-1.5 px-3 border cursor-pointer bg-white border-gray-800 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {loadingMeetings ? 'Loading meetings…' : 'Load all meetings'}
            </button>
          )}

          {meetingsError && (
            <span className="text-red-500 text-sm">
              {meetingsError}
            </span>
          )}
        </div>
      </div>

      <MapContainer center={[0, 0]} zoom={2} className="h-[calc(100vh_-_6rem)] w-full">
        {/* Attribution */}
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

        {selected && (
          <Popup
            position={selected.latlng}
            eventHandlers={{ remove: () => setSelected(null) }}
          >
            <div className="min-w-48">
              <strong>{selected.props.Name ?? 'Area'}</strong>
              <div>Region: {selected.props.Region ?? '—'}</div>
              {/* <div>WSC Recognized: {selected.props.WSCRecognized ?? 'Yes'}</div> */}
            </div>
          </Popup>
        )}

        {/* Pane for displaying meetings over the Areas */}
        <Pane name="meetings" style={{ zIndex: 600 }}>
          <MarkerClusterGroup
            chunkedLoading
            zoomToBoundsOnClick={false}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            maxClusterRadius={35}
            onClick={(event) => {
              const cluster = event.layer;
              const map = cluster._map;

              const currentZoom = map.getZoom();
              const targetZoom = Math.min(currentZoom + 3, map.getMaxZoom());

              // one atomic view change
              map.setView(cluster.getLatLng(), targetZoom, { animate: false });

              // when the zoom/move finishes, force a recompute
              map.once('moveend', () => {
                if (clusterRef.current) {
                  clusterRef.current.refreshClusters();
                }
              });
            }}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return clusterIcon(count);
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

        {/* Legend */}
        <LegendControl />
      </MapContainer>

    {/* End page container */}
    </div>
  );
}
