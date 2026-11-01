import { UZGSM_FLOATING_PORTAL_ID } from "@/shared/ui/kit/floating-portal/constants";
import styles from "@/shared/ui/kit/floating-portal/FloatingPortal.module.css";

export function FloatingPortalRoot() {
	return <div id={UZGSM_FLOATING_PORTAL_ID} className={styles.root} />;
}

