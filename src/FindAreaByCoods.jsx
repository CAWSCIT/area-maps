import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

/**
 * featureCollection: your full GeoJSON object
 * lng, lat: numbers
 * returns the matching Feature or null
 */
export function findAreaForLatLng(featureCollection, lng, lat) {
  const pt = point([lng, lat]); // [lon, lat] for GeoJSON

  for (const feature of featureCollection.features) {
    if (booleanPointInPolygon(pt, feature)) {
      return feature; // this is the Area containing the point
    }
  }

  return null;
}

/**
 * Example usage below
 */
/*
// Get ?lat and ?lng from URL
const params = new URLSearchParams(window.location.search);
const latStr = params.get("lat");
const lngStr = params.get("lng");

if(latStr && lngStr) {
    // If lat and lng are provided, find the area
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    const feature = findAreaForLatLng(geoJsonData, lng, lat);

    if (feature) {
        console.log('Inside area:', feature.properties.Name, feature.properties.Region);
    } else {
        console.log('Not inside any area');
    }
}
*/
