import L from 'leaflet';
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
  iconSize: [32, 42], // overall size (circle + pointer)
  iconAnchor: [16, 42], // bottom center = "tip" of pin
  popupAnchor: [0, -36],
});

export const clusterIcon = (count) =>
  L.divIcon({
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
