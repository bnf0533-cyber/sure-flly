import { LoaderCircle } from "lucide-react";

export function Loader({
    label = "טוען את המסע שלך…",
    fullPage = false,
}: {
    label?: string;
    fullPage?: boolean;
}) {
    return (
        <div
            role="status"
            className={`flex flex-col items-center justify-center gap-3 text-sm text-muted ${fullPage ? "min-h-screen" : "min-h-48"}`}
        >
            <LoaderCircle
                size={24}
                className="animate-spin text-teal-600"
                aria-hidden="true"
            />
            {label}
        </div>
    );
}
