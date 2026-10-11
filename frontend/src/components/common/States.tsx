import type { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                {icon}
            </div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                {description}
            </p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function ErrorState({
    message,
    onRetry,
}: {
    message: string;
    onRetry?: () => void;
}) {
    return (
        <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
        >
            <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
            <span className="flex-1">{message}</span>
            {onRetry && (
                <Button
                    variant="ghost"
                    onClick={onRetry}
                    icon={<RefreshCw size={14} />}
                >
                    נסה שוב
                </Button>
            )}
        </div>
    );
}
