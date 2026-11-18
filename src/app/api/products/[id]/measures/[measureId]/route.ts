import { withRequestAudit } from "@backend/http/request-handler";
import { PATCH_MEASURE, DELETE_MEASURE } from "@backend/http/products/handlers";

export const PATCH = withRequestAudit(PATCH_MEASURE);
export const DELETE = withRequestAudit(DELETE_MEASURE);
