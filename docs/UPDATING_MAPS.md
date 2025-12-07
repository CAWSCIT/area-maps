## Updating interactive maps

To edit the GeoJSON, we recommend using an interactive tool such as [https://vector.rocks/](https://vector.rocks/). (Note: C.A. is not affiliated nor do we endorse this service.)

To update these maps, you'll want to:

1. Download the [Areas.json](src/areas/Areas.json) file (right-click and select "Save Link As..." to download).
2. Upload that file to [https://vector.rocks/](https://vector.rocks/) (or any other GeoJSON service).
3. Edit the plots, or add more as you see fit. All the shapes are selectable and can be re-shaped.
4. Download the edits by clicking the "Download as GeoJSON" button.
5. Open a "Pull Request" to change the Areas.json file. (Or ask a developer to help you with this).
6. Once the code is merged into this repository, it will automatically recreate the website and deploy it.

#### Caveats
##### United Kingdom
The UK is tricky to draw borders around. They have an open source repo found at [addictedToRecovery/uk-ca-map](https://github.com/addictedToRecovery/uk-ca-map). They are using CRS 3857 rather than CRS 4326 (Latitude and Longitude) for [their GeoJSON](https://github.com/addictedToRecovery/uk-ca-map/blob/main/src/assets/ukca-area-boundaries-simple.geojson). If you ever need to convert their coordinates to Lat/Lon, look in the `helpers/` directory for a a python script that can convert it.
