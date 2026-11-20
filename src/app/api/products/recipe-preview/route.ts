import { withRequestAudit } from "@backend/http/request-handler";
import { PREVIEW } from "@backend/http/products/handlers";
export const POST = withRequestAudit(PREVIEW);
