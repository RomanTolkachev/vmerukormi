import { withRequestAudit } from "@backend/http/request-handler";
import { POST_MEASURE } from "@backend/http/products/handlers";

export const POST = withRequestAudit(POST_MEASURE);
