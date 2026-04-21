import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { SubArea } from '../lib/iamsar';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  lkp: { lat: number; lng: number } | null;
  datum: { lat: number; lng: number } | null;
  subAreas: SubArea[];
}

function MapBoundsHelper({ lkp, datum, subAreas }: MapProps) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    if (lkp) points.push([lkp.lat, lkp.lng]);
    if (datum) points.push([datum.lat, datum.lng]);
    
    subAreas.forEach(sa => {
      points.push([sa.port.lat, sa.port.lng]);
      if (sa.bounds) {
        points.push(sa.bounds[0], sa.bounds[1]);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds.pad(0.2));
    }
  }, [lkp, datum, subAreas, map]);
  return null;
}

export default function SearchMap({ lkp, datum, subAreas }: MapProps) {
  return (
    <MapContainer center={[20.86, 106.68]} zoom={8} className="w-full h-full z-0 bg-[#0A0F19]">
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
      />
      <MapBoundsHelper lkp={lkp} datum={datum} subAreas={subAreas} />
      
      {lkp && (
        <Marker position={[lkp.lat, lkp.lng]}>
          <Popup><b>Vị trí cuối cùng (LKP)</b><br/>{lkp.lat.toFixed(4)}, {lkp.lng.toFixed(4)}</Popup>
        </Marker>
      )}
      
      {datum && (
        <Marker position={[datum.lat, datum.lng]}>
          <Popup><b>Vị trí dự đoán (Datum)</b><br/>{datum.lat.toFixed(4)}, {datum.lng.toFixed(4)}</Popup>
        </Marker>
      )}

      {subAreas.map((sa) => (
        <React.Fragment key={sa.id}>
          <Marker position={[sa.port.lat, sa.port.lng]}>
            <Popup><b>Cảng: {sa.name}</b><br/>{sa.port.lat.toFixed(4)}, {sa.port.lng.toFixed(4)}</Popup>
          </Marker>

          {datum && (
            <Polyline positions={[[sa.port.lat, sa.port.lng], [datum.lat, datum.lng]]} color={sa.color} dashArray="5, 10" opacity={0.6}>
              <Popup>Đường cơ động: {sa.name}</Popup>
            </Polyline>
          )}

          {sa.bounds && (
            <Rectangle bounds={sa.bounds} color={sa.color} fillOpacity={0.15} weight={2}>
              <Popup><b>Vùng Tìm Kiếm: {sa.name}</b><br/>DT: {sa.areaToCover.toFixed(1)} NM²</Popup>
            </Rectangle>
          )}
        </React.Fragment>
      ))}

      {lkp && datum && (
        <Polyline positions={[[lkp.lat, lkp.lng], [datum.lat, datum.lng]]} color="#EF4444" dashArray="5, 10" weight={2}>
          <Popup>Đường trôi dạt (Drift)</Popup>
        </Polyline>
      )}
    </MapContainer>
  );
}
