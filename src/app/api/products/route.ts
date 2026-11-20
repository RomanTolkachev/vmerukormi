import { withRequestAudit } from "@backend/http/request-handler";
import { POST as create } from "@backend/http/products/handlers";
export const POST = withRequestAudit(create);
