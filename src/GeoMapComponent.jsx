import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  Marker,
  Pane,
} from 'react-leaflet';
import { useCallback, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
import MarkerClusterGroup from 'react-leaflet-cluster';

import LegendControl from './LegendControl';
import { caMeetingIcon, clusterIcon } from './Icons';
import caLogoWhite from '/src/assets/ca-logo-white.svg';

const MEETINGS_API_URL =
  'https://caws-api.azurewebsites.net/api/v1/meetings-tsml?area=all';

const DAY_NAMES = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const BASE_LAYER_STYLE = {
  weight: 2,
  opacity: 1,
  color: '#ffffff',
  fillColor: '#4f83cc',
  fillOpacity: 0.6,
};

const buildMeetingRecord = (meeting) => {
  const latitude = Number(meeting.latitude);
  const longitude = Number(meeting.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: meeting.slug || `${latitude}-${longitude}-${meeting.name}`,
    name: meeting.name || 'Meeting',
    latitude,
    longitude,
    day: DAY_NAMES[meeting.day] ?? null,
    time: meeting.time,
    endTime: meeting.end_time,
    area: meeting.area,
    region: meeting.region,
    address: meeting.formatted_address || meeting.address,
    url: meeting.url,
    attendanceOption: meeting.attendance_option
      ? meeting.attendance_option.replace('_', ' ')
      : null,
    notes: meeting.notes,
  };
};

const normalizeMeetings = (payload) =>
  payload.map(buildMeetingRecord).filter(Boolean);

export default function GeoMapComponent({ initialData }) {
  const [geoJsonData] = useState(() => initialData);
  const [selected, setSelected] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState(null);
  const [highlightedRegion, setHighlightedRegion] = useState(null);

  const clusterRef = useRef(null);
  const geoJsonRef = useRef(null);

  const handleLoadMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    setMeetingsError(null);

    try {
      const res = await fetch(MEETINGS_API_URL);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = await res.json();
      setMeetings(normalizeMeetings(payload));
    } catch (err) {
      console.error(err);
      setMeetingsError(err.message || 'Failed to load meetings');
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  const styleFeature = useCallback(
    (feature) => {
      const props = feature?.properties ?? {};
      const style = { ...BASE_LAYER_STYLE };

      if (props.WSCRecognized !== null && props.WSCRecognized !== undefined) {
        style.fillColor = '#cc4f4f';
      }

      if (highlightedRegion && props.Region === highlightedRegion) {
        style.weight = 4;
        style.color = '#ffd166';
        style.fillOpacity = 0.85;
      }

      return style;
    },
    [highlightedRegion]
  );

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
          color: '#00594f', // c.a. green border
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
      const name = feature.properties?.Name || 'Unnamed area';
      const region = feature.properties?.Region || 'Unknown region';

      layer.bindTooltip(
        `
          <div style="font-weight:bold;">${name}</div>
          <div style="opacity:0.8;">${region}</div>
        `,
        {
          sticky: true,
          direction: 'top',
        }
      );
    },
    [highlightRegionOnHover, resetRegionHighlight, zoomToFeature]
  );

  const meetingMarkers = useMemo(
    () =>
      meetings.map((meeting) => (
        <Marker
          key={meeting.id}
          position={[meeting.latitude, meeting.longitude]}
          icon={caMeetingIcon}
        >
          <Popup>
            <div>
              <strong>{meeting.name}</strong>
              {meeting.area && <div>Area: {meeting.area}</div>}
              {meeting.address && <div>{meeting.address}</div>}
              {(meeting.day || meeting.time) && (
                <div>
                  {meeting.day && <span>Day: {meeting.day}</span>}
                  {meeting.time && (
                    <>
                      {' '}
                      @ {meeting.time}
                      {meeting.endTime && `–${meeting.endTime}`}
                    </>
                  )}
                </div>
              )}
              {meeting.attendanceOption && (
                <div>Attendance: {meeting.attendanceOption}</div>
              )}
              {meeting.url && (
                <div>
                  <a href={meeting.url} target="_blank" rel="noreferrer">
                    Website
                  </a>
                </div>
              )}
              {meeting.notes && <div>Notes: {meeting.notes}</div>}
            </div>
          </Popup>
        </Marker>
      )),
    [meetings]
  );

  const handleClusterClick = useCallback(
    (event) => {
      const cluster = event.layer;
      const mapInstance = cluster._map;
      if (!mapInstance) return;

      const currentZoom = mapInstance.getZoom();
      const targetZoom = Math.min(currentZoom + 3, mapInstance.getMaxZoom());

      mapInstance.setView(cluster.getLatLng(), targetZoom, { animate: false });
      mapInstance.once('moveend', () => clusterRef.current?.refreshClusters());
    },
    [clusterRef]
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
            <span className="text-red-500 text-sm">{meetingsError}</span>
          )}
        </div>
      </div>

      <MapContainer
        center={[0, 0]}
        zoom={2}
        className="h-[calc(100vh_-_6rem)] w-full"
      >
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
            </div>
          </Popup>
        )}

        {/* Pane for displaying meetings over the Areas */}
        <Pane name="meetings" style={{ zIndex: 600 }}>
          <MarkerClusterGroup
            ref={clusterRef}
            chunkedLoading
            zoomToBoundsOnClick={false}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            maxClusterRadius={35}
            onClick={handleClusterClick}
            iconCreateFunction={(cluster) =>
              clusterIcon(cluster.getChildCount())
            }
          >
            {meetingMarkers}
          </MarkerClusterGroup>
        </Pane>

        {/* Legend */}
        <LegendControl />
      </MapContainer>

      {/* End page container */}
    </div>
  );
}
