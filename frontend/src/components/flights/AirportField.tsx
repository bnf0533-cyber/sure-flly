import { MapPin } from "lucide-react";
import { Input } from "../common/Input";
import { airports } from "../../utils/airports";

export interface AirportValue {
    preset: string;
    code: string;
    lat: string;
    lon: string;
}
export function presetAirport(code: string): AirportValue {
    const airport = airports.find((item) => item.code === code)!;
    return {
        preset: code,
        code,
        lat: String(airport.lat),
        lon: String(airport.lon),
    };
}

export function AirportField({
    label,
    id,
    value,
    onChange,
}: {
    label: string;
    id: string;
    value: AirportValue;
    onChange: (value: AirportValue) => void;
}) {
    return (
        <div className="space-y-3">
            <label className="field-label" htmlFor={id}>
                {label}
            </label>
            <select
                id={id}
                className="input"
                value={value.preset}
                onChange={(event) =>
                    onChange(
                        event.target.value === "CUSTOM"
                            ? { preset: "CUSTOM", code: "", lat: "", lon: "" }
                            : presetAirport(event.target.value)
                    )
                }
            >
                {airports.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                        {airport.code} — {airport.city}
                    </option>
                ))}
                <option value="CUSTOM">שדה תעופה אחר…</option>
            </select>
            {value.preset === "CUSTOM" ? (
                <div className="space-y-3 rounded-xl border border-line bg-slate-50/50 p-3">
                    <Input
                        label="קוד IATA"
                        placeholder="למשל AMS"
                        value={value.code}
                        onChange={(event) =>
                            onChange({
                                ...value,
                                code: event.target.value.toUpperCase(),
                            })
                        }
                        pattern="[A-Z]{3}"
                        minLength={3}
                        maxLength={3}
                        required
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="קו רוחב"
                            type="number"
                            step="any"
                            min={-90}
                            max={90}
                            value={value.lat}
                            onChange={(event) =>
                                onChange({ ...value, lat: event.target.value })
                            }
                            placeholder="−90 עד 90"
                            required
                        />
                        <Input
                            label="קו אורך"
                            type="number"
                            step="any"
                            min={-180}
                            max={180}
                            value={value.lon}
                            onChange={(event) =>
                                onChange({ ...value, lon: event.target.value })
                            }
                            placeholder="−180 עד 180"
                            required
                        />
                    </div>
                </div>
            ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-muted">
                    <MapPin size={12} />
                    {
                        airports.find((airport) => airport.code === value.code)
                            ?.name
                    }
                </p>
            )}
        </div>
    );
}
