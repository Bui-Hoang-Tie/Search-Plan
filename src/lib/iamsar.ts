import { destination, point, distance } from '@turf/turf';

const LEEWAY_MULTIPLIERS: Record<string, number> = {
  PIW: 0.015,     // Person in water
  RAFT: 0.03,     // Liferaft
  BOAT: 0.05,     // Small boat
};

export interface DriftResult {
  speed: number;
  direction: number;
  leewaySpeed: number;
  leewayDir: number;
}

export function calculateDrift(
  windSpeed: number, 
  windDir: number, 
  currentSpeed: number, 
  currentDir: number, 
  type: string
): DriftResult {
  const leewayFactor = LEEWAY_MULTIPLIERS[type] || 0.03;
  const leewaySpeed = windSpeed * leewayFactor;
  let leewayDir = (windDir + 180) % 360;
  if (leewayDir < 0) leewayDir += 360;

  const cx = Math.sin((currentDir * Math.PI) / 180) * currentSpeed;
  const cy = Math.cos((currentDir * Math.PI) / 180) * currentSpeed;

  const lx = Math.sin((leewayDir * Math.PI) / 180) * leewaySpeed;
  const ly = Math.cos((leewayDir * Math.PI) / 180) * leewaySpeed;

  const dx = cx + lx;
  const dy = cy + ly;

  const driftSpeed = Math.sqrt(dx * dx + dy * dy);
  let driftDir = (Math.atan2(dx, dy) * 180) / Math.PI;
  if (driftDir < 0) driftDir += 360;

  return { speed: driftSpeed, direction: driftDir, leewaySpeed, leewayDir };
}

export function movePoint(lat: number, lng: number, distanceNM: number, bearing: number) {
  const pt = point([lng, lat]);
  const dest = destination(pt, distanceNM, bearing, { units: 'nauticalmiles' });
  return {
    lat: dest.geometry.coordinates[1],
    lng: dest.geometry.coordinates[0],
  };
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const p1 = point([lng1, lat1]);
  const p2 = point([lng2, lat2]);
  return distance(p1, p2, { units: 'nauticalmiles' });
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  portLat: number;
  portLng: number;
  speed: number;
  endurance: number;
  sweepWidth: number;
  color: string;
}

export interface SubArea {
  id: string;
  name: string;
  color: string;
  port: { lat: number; lng: number };
  areaToCover: number;
  timeOnScene: number;
  productiveTime: number;
  transitTime: number;
  bounds: [[number, number], [number, number]] | null;
  success: boolean;
}

export function calculateMultiFacilitySearchArea(
  datum: { lat: number; lng: number },
  facilities: Facility[]
) {
  let totalArea = 0;
  const validFacilities: SubArea[] = [];
  const invalidFacilities: SubArea[] = [];

  for (const f of facilities) {
    const dist = calculateDistance(f.portLat, f.portLng, datum.lat, datum.lng);
    const transitTime = dist / f.speed;
    const timeOnScene = f.endurance - 2 * transitTime;
    
    if (timeOnScene <= 0) {
      invalidFacilities.push({
        id: f.id,
        name: f.name,
        color: f.color,
        port: { lat: f.portLat, lng: f.portLng },
        areaToCover: 0,
        timeOnScene: 0,
        productiveTime: 0,
        transitTime,
        bounds: null,
        success: false,
      });
      continue;
    }

    const productiveTime = timeOnScene * 0.85;
    const effortArea = productiveTime * f.speed * f.sweepWidth;
    totalArea += effortArea;

    validFacilities.push({
      id: f.id,
      name: f.name,
      color: f.color,
      port: { lat: f.portLat, lng: f.portLng },
      areaToCover: effortArea,
      timeOnScene,
      productiveTime,
      transitTime,
      bounds: null,
      success: true,
    });
  }

  const totalLength = Math.sqrt(totalArea);
  
  if (validFacilities.length > 0 && totalLength > 0) {
    const pt = point([datum.lng, datum.lat]);
    const southPt = destination(pt, totalLength / 2, 180, { units: 'nauticalmiles' });
    const swPt = destination(southPt, totalLength / 2, 270, { units: 'nauticalmiles' });
    
    let currentSW = swPt;

    for (const vf of validFacilities) {
      const widthFraction = vf.areaToCover / totalArea;
      const stripWidth = totalLength * widthFraction;
      
      const sePt = destination(currentSW, stripWidth, 90, { units: 'nauticalmiles' });
      const nePt = destination(sePt, totalLength, 0, { units: 'nauticalmiles' });

      vf.bounds = [
        [currentSW.geometry.coordinates[1], currentSW.geometry.coordinates[0]], 
        [nePt.geometry.coordinates[1], nePt.geometry.coordinates[0]] 
      ];

      currentSW = sePt;
    }
  }

  return { totalArea, totalLength, subAreas: [...validFacilities, ...invalidFacilities] };
}
