import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    loading?: boolean;
    icon?: ReactNode;
}

export function Button({
    children,
    variant = "primary",
    loading,
    icon,
    className,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={clsx("btn", `btn-${variant}`, className)}
        >
            {loading ? (
                <LoaderCircle
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                />
            ) : (
                icon
            )}
            {children}
        </button>
    );
}
