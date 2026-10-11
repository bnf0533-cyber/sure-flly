export interface Airport {
    code: string;
    city: string;
    name: string;
    lat: number;
    lon: number;
}

export const airports: Airport[] = [
    {
        code: "TLV",
        city: "Tel Aviv",
        name: "Ben Gurion",
        lat: 32.0114,
        lon: 34.8867,
    },
    { code: "LHR", city: "London", name: "Heathrow", lat: 51.47, lon: -0.4543 },
    {
        code: "CDG",
        city: "Paris",
        name: "Charles de Gaulle",
        lat: 49.0097,
        lon: 2.5479,
    },
    {
        code: "JFK",
        city: "New York",
        name: "John F. Kennedy",
        lat: 40.6413,
        lon: -73.7781,
    },
    {
        code: "FCO",
        city: "Rome",
        name: "Fiumicino",
        lat: 41.8003,
        lon: 12.2389,
    },
    {
        code: "ATH",
        city: "Athens",
        name: "Athens International",
        lat: 37.9364,
        lon: 23.9445,
    },
    {
        code: "DXB",
        city: "Dubai",
        name: "Dubai International",
        lat: 25.2532,
        lon: 55.3657,
    },
    {
        code: "BCN",
        city: "Barcelona",
        name: "El Prat",
        lat: 41.2974,
        lon: 2.0833,
    },
    {
        code: "BER",
        city: "Berlin",
        name: "Brandenburg",
        lat: 52.3667,
        lon: 13.5033,
    },
    {
        code: "BKK",
        city: "Bangkok",
        name: "Suvarnabhumi",
        lat: 13.69,
        lon: 100.7501,
    },
];

export function airportCity(code: string): string {
    const airport = airports.find((item) => item.code === code);
    const city = airport?.city || code;
    return city;
}
