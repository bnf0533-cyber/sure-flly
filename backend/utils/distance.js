const EARTH_RADIUS_KM = 6371.0088;
function radians(degrees) {
    const value = (degrees * Math.PI) / 180;
    return value;
}

/** Great-circle distance in km; retain precision until display, never round a tier. */
export function calculateDistance(
    departureLat,
    departureLon,
    arrivalLat,
    arrivalLon
) {
    for (const [value, limit] of [
        [departureLat, 90],
        [arrivalLat, 90],
        [departureLon, 180],
        [arrivalLon, 180],
    ]) {
        if (!Number.isFinite(value) || Math.abs(value) > limit)
            throw new RangeError("Invalid airport coordinates");
    }
    const latitudeDelta = radians(arrivalLat - departureLat);
    const longitudeDelta = radians(arrivalLon - departureLon);
    const a =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(radians(departureLat)) *
            Math.cos(radians(arrivalLat)) *
            Math.sin(longitudeDelta / 2) ** 2;
    const distance =
        EARTH_RADIUS_KM *
        2 *
        Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
    return distance;
}

export const haversineDistance = calculateDistance;
