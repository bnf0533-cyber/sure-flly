export function currency(value: number): string {
    const formattedCurrency = new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
    }).format(value);
    return formattedCurrency;
}

export function number(value: number): string {
    const formattedNumber = new Intl.NumberFormat("he-IL", {
        maximumFractionDigits: 0,
    }).format(value);
    return formattedNumber;
}

export function shortDate(value: string): string {
    const date = new Date(value).toLocaleDateString("he-IL", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    return date;
}

export function shortTime(value: string): string {
    const time = new Date(value).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return time;
}

export const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function initials(name: string): string {
    const userInitials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
    return userInitials;
}

export function compensationEstimate(distanceKm: number): number {
    let estimate = 3670;
    if (distanceKm <= 2000) {
        estimate = 1530;
    } else if (distanceKm <= 4500) {
        estimate = 2450;
    }
    return estimate;
}

export function delayLabel(minutes: number): string {
    const label = `${Math.floor(minutes / 60)} שעות${minutes % 60 ? ` ו-${minutes % 60} דקות` : ""}`;
    return label;
}

export function toLocalInput(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

export function distanceBetween(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const rad = (degrees: number) => (degrees * Math.PI) / 180;
    const a =
        Math.sin(rad(lat2 - lat1) / 2) ** 2 +
        Math.cos(rad(lat1)) *
            Math.cos(rad(lat2)) *
            Math.sin(rad(lon2 - lon1) / 2) ** 2;
    const distance =
        6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
    return distance;
}
