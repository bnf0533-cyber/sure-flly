import type { ReactNode } from "react";

export function PageHeading({
    eyebrow,
    title,
    description,
    action,
}: {
    eyebrow?: string;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
            <div>
                {eyebrow && (
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-teal-600">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[32px]">
                    {title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                    {description}
                </p>
            </div>
            {action}
        </div>
    );
}
