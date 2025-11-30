# C.A. Area Maps

[https://cawscit.github.io/area-maps/](https://cawscit.github.io/area-maps/)

This is an interactive global map project that displays every recognized (and physical) C.A. Area. Online Area(s) and other non-physical entities are not displayed.

To edit the GeoJSON, we recommend using an interactive tool such as [https://vector.rocks/](https://vector.rocks/). (Note: C.A. is not affiliated nor do we endorse this service.)

This is an ongoing project from the WSCIT Committee in collaboration with S&B, along with various other contributors.

**Note**: The borders in this project _are not_ perfect. They are designed to be "close enough". If your location is represented by the wrong area in this interactive map, please contact WSCSB or WSCIT with details so it can be adjusted.


### Caveats
#### United Kingdom
The UK is tricky to draw borders around. They have an open source repo found at [addictedToRecovery/uk-ca-map](https://github.com/addictedToRecovery/uk-ca-map). They are using CRS 3857 rather than CRS 4326 (Latitude and Longitude) for [their GeoJSON](https://github.com/addictedToRecovery/uk-ca-map/blob/main/src/assets/ukca-area-boundaries-simple.geojson). If you ever need to convert their coordinates to Lat/Lon, look in the `helpers/` directory for a a python script that can convert it.
