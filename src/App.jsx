import 'leaflet/dist/leaflet.css';
import Areas from './areas/Areas.json';

import GeoMapComponent from './GeoMapComponent.jsx';

function App() {
  return (
    <>
      <div>
        <GeoMapComponent initialData={Areas} />
      </div>
    </>
  )
}

export default App
