import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: string;
    error?: string;
    icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, hint, error, icon, className, id, ...props },
    ref
) {
    const generatedId = useId();
    const fieldId = id || generatedId;
    return (
        <div className="space-y-2">
            <label htmlFor={fieldId} className="field-label">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <span
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                        aria-hidden="true"
                    >
                        {icon}
                    </span>
                )}
                <input
                    {...props}
                    id={fieldId}
                    ref={ref}
                    aria-invalid={!!error}
                    aria-describedby={
                        error || hint ? `${fieldId}-hint` : undefined
                    }
                    className={clsx(
                        "input",
                        icon && "pl-11",
                        error && "border-red-400",
                        className
                    )}
                />
            </div>
            {(hint || error) && (
                <p
                    id={`${fieldId}-hint`}
                    className={clsx(
                        "text-xs leading-relaxed",
                        error ? "text-red-700" : "text-muted"
                    )}
                >
                    {error || hint}
                </p>
            )}
        </div>
    );
});
