/**
 * Geolocation utilities for attendance radius enforcement.
 */

export interface GeoCoords {
  lat: number;
  lng: number;
}

/**
 * Gets the current GPS position of the device.
 */
export const getCurrentPosition = (): Promise<GeoCoords> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location access was denied. Please enable location permissions to mark attendance.'));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('Location information is unavailable. Please try again.'));
        } else {
          reject(new Error('Location request timed out. Please try again.'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

/**
 * Calculates the distance in meters between two GPS coordinates using the Haversine formula.
 */
export const getDistanceMeters = (a: GeoCoords, b: GeoCoords): number => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  return R * 2 * Math.asin(Math.sqrt(h));
};
