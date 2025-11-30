import json

from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform

INPUT = "ukca-area-boundaries-simple.geojson"
OUTPUT = "uk.geojson"

# Source/target CRS
SRC_CRS = "EPSG:3857"
DST_CRS = "EPSG:4326"

# Build transformer (always_xy=True => x=lon/easting, y=lat/northing)
transformer = Transformer.from_crs(SRC_CRS, DST_CRS, always_xy=True)


def reproject_geometry(geom_dict):
    """Reproject a GeoJSON geometry dict from SRC_CRS to DST_CRS."""
    geom = shape(geom_dict)

    def _proj(x, y, z=None):
        x2, y2 = transformer.transform(x, y)
        return (x2, y2) if z is None else (x2, y2, z)

    new_geom = transform(_proj, geom)
    return mapping(new_geom)


# 1. Load original GeoJSON
with open(INPUT, "r") as f:
    data = json.load(f)

# 2. Reproject every feature geometry
for feature in data["features"]:
    feature["geometry"] = reproject_geometry(feature["geometry"])

# 3. (Optional) fix or remove CRS declaration
# GeoJSON normally assumes EPSG:4326, so you can just drop it:
data.pop("crs", None)

# 4. Save output file
with open(OUTPUT, "w") as f:
    json.dump(data, f)
