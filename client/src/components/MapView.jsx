import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

function MapUpdater({ userLocation, results, selectedIndex }) {
  const map = useMap();

  useEffect(() => {
    if (!userLocation) return;

    if (results && results.length > 0 && selectedIndex != null) {
      const toilet = results[selectedIndex];
      const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [toilet.latitude, toilet.longitude]
      );
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    } else {
      map.setView([userLocation.lat, userLocation.lng], 16);
    }
  }, [userLocation, results, selectedIndex, map]);

  return null;
}

export default function MapView({ userLocation, results, selectedIndex }) {
  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [35.6762, 139.6503]; // Default to Tokyo

  const selectedToilet = results && selectedIndex != null ? results[selectedIndex] : null;

  return (
    <MapContainer
      center={center}
      zoom={16}
      zoomControl={false}
      attributionControl={false}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MapUpdater
        userLocation={userLocation}
        results={results}
        selectedIndex={selectedIndex}
      />

      {userLocation && (
        <>
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            fillColor="#4285f4"
            fillOpacity={1}
            color="#fff"
            weight={3}
          />
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={20}
            fillColor="#4285f4"
            fillOpacity={0.2}
            color="#4285f4"
            weight={1}
          />
        </>
      )}

      {results && results.map((toilet, i) => (
        <CircleMarker
          key={toilet.id || i}
          center={[toilet.latitude, toilet.longitude]}
          radius={i === selectedIndex ? 10 : 7}
          fillColor="var(--accent)"
          fillOpacity={i === selectedIndex ? 1 : 0.7}
          color={i === selectedIndex ? '#fff' : 'var(--accent-dim)'}
          weight={i === selectedIndex ? 3 : 1}
        />
      ))}

      {userLocation && selectedToilet && (
        <Polyline
          positions={[
            [userLocation.lat, userLocation.lng],
            [selectedToilet.latitude, selectedToilet.longitude]
          ]}
          color="#00e676"
          weight={3}
          opacity={0.8}
          dashArray="8, 12"
        />
      )}
    </MapContainer>
  );
}
