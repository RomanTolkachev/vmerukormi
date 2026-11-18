import { withRequestAudit } from "@backend/http/request-handler";
import { POST_NUTRIENT } from "@backend/http/products/handlers";

export const POST = withRequestAudit(POST_NUTRIENT);
