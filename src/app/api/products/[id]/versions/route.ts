import { withRequestAudit } from "@backend/http/request-handler";
import { HISTORY, RESTORE } from "@backend/http/products/handlers";
export const GET = HISTORY;
export const POST = withRequestAudit(RESTORE);
