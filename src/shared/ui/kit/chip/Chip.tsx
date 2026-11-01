import React, { type PropsWithChildren } from "react";
import styles from "@/shared/ui/kit/chip/Chip.module.css";
import { CloseIcon } from "@/shared/ui/kit/Icons/CloseIcon";
export interface ChipProps extends PropsWithChildren {
    variant?: "primary" | "alert";
    size?: "sm" | "md" | "lg";
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onRemove?: () => void;
    removeLabel?: string;
    removeDisabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    title?: string;
}

const variantClassMap = {
    primary: styles.chipPrimary,
    alert: styles.chipAlert,
} as const;

const sizeClassMap = {
    sm: styles.chipSizeSm,
    md: styles.chipSizeMd,
    lg: styles.chipSizeLg,
} as const;


export const Chip = ({
    children,
    variant = "primary",
    size = "sm",
    onClick,
    onRemove,
    removeLabel = "Удалить",
    removeDisabled = false,
    className,
    style,
    title,
}: ChipProps) => {
    const clickable = Boolean(onClick);
    const classNames = [
        styles.chip,
        variantClassMap[variant],
        sizeClassMap[size],
        clickable && styles.chipClickable,
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            className={classNames}
            style={style}
            title={title}
            onClick={onClick}
        >
            <span className={styles.label}>{children}</span>
            {onRemove && (
                <button
                    type="button"
                    aria-label={removeLabel}
                    disabled={removeDisabled}
                    className={styles.removeButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    <CloseIcon aria-hidden="true" />
                </button>
            )}
        </div>
    );
};


