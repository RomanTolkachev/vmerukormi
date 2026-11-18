import { withRequestAudit } from "@backend/http/request-handler";
import { PATCH_NUTRIENT, DELETE_NUTRIENT } from "@backend/http/products/handlers";

export const PATCH = withRequestAudit(PATCH_NUTRIENT);
export const DELETE = withRequestAudit(DELETE_NUTRIENT);
