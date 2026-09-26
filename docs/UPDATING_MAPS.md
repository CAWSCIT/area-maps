## Updating interactive maps

To edit the GeoJSON, we recommend using an interactive tool such as [https://geojson.io/](https://geojson.io/). (Note: C.A. is not affiliated nor do we endorse this service.)

To update these maps, you'll want to:

1. Download the [Areas.json](src/areas/Areas.json) file (right-click and select "Save Link As..." to download).
2. Upload that file to [https://geojson.io/](https://geojson.io/) (or any other GeoJSON service) using the "Import" feature.
3. Edit the plots, or add more as you see fit. All the shapes are selectable and can be re-shaped.
4. Download the edits by clicking the "Export" button with the following settings:
  * File Format: GeoJSON
  * Do **not** truncate coordinates
  * Do **Indent & Format** (if you forget this step that's OK, it will fix itself)
5. [Edit this file](https://github.com/CAWSCIT/area-maps/edit/main/src/areas/Areas.json) by copying and pasting the new data into this file. (At this point you could ask a software engineer for help as well)
6. Click the green "Commit changes..." button. Name the change and add details to what you added.
7. A software engineer _should_ review this code before "accepting" it.
8. Once the code is merged (accepted) into this repository, it will automatically recreate the website and deploy it.

#### Caveats
##### United Kingdom
The UK is tricky to draw borders around. They have an open source repo found at [addictedToRecovery/uk-ca-map](https://github.com/addictedToRecovery/uk-ca-map). They are using CRS 3857 rather than CRS 4326 (Latitude and Longitude) for [their GeoJSON](https://github.com/addictedToRecovery/uk-ca-map/blob/main/src/assets/ukca-area-boundaries-simple.geojson). If you ever need to convert their coordinates to Lat/Lon, look in the `helpers/` directory for a a python script that can convert it.
