import React from "react";
import { createPortal } from "react-dom";
import { FloatingPortalContainerProvider } from "@/shared/ui/kit/floating-portal/FloatingPortalContext";
import { CloseIcon } from "@/shared/ui/kit/Icons/CloseIcon";
import { UupDesignScope } from "@/shared/ui/kit/theme/desktop/UupDesignScope";
import { useModalStack } from "@/shared/ui/kit/modal/modalStack";
import styles from "@/shared/ui/kit/modal/Modal.module.css";

export interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	preventClose?: boolean;
	showCloseButton?: boolean;
	wrapperStyle?: React.CSSProperties;
	innerStyle?: React.CSSProperties;
	overlayClassName?: string;
	contentClassName?: string;
	/** Apply UUP inside the portal only; omitted preserves the page design. */
	designScope?: "uup";
	title?: string;
}

let bodyLocks = 0;
let previousOverflow = "";
let background: { element: HTMLElement; inert: boolean }[] = [];

/**
 * Модальное окно, рендерится через portal в `document.body`.
 *
 * Пока открыта, участвует в глобальном стеке z-index и оборачивает `children`
 * в {@link FloatingPortalContainerProvider}, поэтому SelectInput, TimeInput
 * и другие floating-компоненты рисуются внутри слоя модалки (а не в глобальном
 * {@link FloatingPortalRoot}).
 *
 * Для собственной реализации модалки используйте {@link useModalStack} для стека
 * и {@link FloatingPortalContainerProvider} для порталов выпадающих полей.
 */
export const Modal = ({
	isOpen,
	onClose,
	children,
	preventClose = false,
	showCloseButton = false,
	wrapperStyle,
	innerStyle,
	overlayClassName,
	contentClassName,
	designScope,
	title,
}: ModalProps) => {
	const modalContentRef = React.useRef<HTMLDivElement>(null);
	const [floatingHost, setFloatingHost] = React.useState<HTMLElement | null>(null);
	const { isTop, zIndex } = useModalStack(isOpen);

	const handleClose = () => {
		if (!preventClose) {
			onClose();
		}
	};

	React.useEffect(() => {
		if (!isOpen) return;
		const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		if (bodyLocks++ === 0) {
			previousOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			background = [...document.querySelectorAll<HTMLElement>("main")].map(element => ({ element, inert: element.inert }));
			background.forEach(({ element }) => { element.inert = true; });
		}
		return () => {
			if (--bodyLocks === 0) {
				document.body.style.overflow = previousOverflow;
				background.forEach(({ element, inert }) => { element.inert = inert; });
				background = [];
			}
			if (previousFocus?.isConnected) previousFocus.focus();
		};
	}, [isOpen]);

	React.useEffect(() => {
		if (isOpen && isTop) modalContentRef.current?.focus();
	}, [isOpen, isTop]);

	React.useEffect(() => {
		if (!isOpen || !isTop) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.defaultPrevented) return;
			if (e.key === "Escape" && !preventClose) {
				e.preventDefault();
				onClose();
			}
			if (e.key === "Tab") {
				const controls = [...(modalContentRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? [])].filter(element => element.getClientRects().length > 0);
				const first = controls[0];
				const last = controls[controls.length - 1];
				if (!first) { e.preventDefault(); return; }
				if (e.shiftKey && (document.activeElement === first || document.activeElement === modalContentRef.current)) { e.preventDefault(); last.focus(); }
				else if (!e.shiftKey && (document.activeElement === last || document.activeElement === modalContentRef.current)) { e.preventDefault(); first.focus(); }
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, isTop, onClose, preventClose]);

	const handleContentRef = React.useCallback((node: HTMLDivElement | null) => {
		modalContentRef.current = node;
	}, []);

	if (!isOpen || zIndex === undefined || typeof document === "undefined") return null;

	const showClose = showCloseButton && !preventClose;

	const overlay = (
		<div
			className={[styles.modalOverlay, overlayClassName].filter(Boolean).join(" ")}
			onPointerDown={event => { if (event.target === event.currentTarget && isTop) handleClose(); }}
			inert={!isTop}
			aria-hidden={!isTop || undefined}
			style={{ ...wrapperStyle, zIndex }}>
			<div ref={setFloatingHost} className={styles.modalFloatingHost} />
			<div
				ref={handleContentRef}
				role="dialog"
				aria-modal="true"
				aria-label={title ?? "Диалог"}
				tabIndex={-1}
				className={[styles.modalContent, contentClassName].filter(Boolean).join(" ")}
				style={innerStyle}>
				{showClose ? (
					<button type="button" aria-label="Закрыть" className={styles.closeButton} onClick={handleClose}>
						<CloseIcon className={styles.closeButtonIcon} aria-hidden />
					</button>
				) : null}
				<FloatingPortalContainerProvider container={floatingHost}>
					{children}
				</FloatingPortalContainerProvider>
			</div>
		</div>
	);

	return createPortal(
		designScope === "uup" ? <UupDesignScope>{overlay}</UupDesignScope> : overlay,
		document.body,
	);
};

