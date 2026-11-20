import { POST as create } from "@backend/http/species/handlers";
import { withRequestAudit } from "@backend/http/request-handler";
export const POST = withRequestAudit(create);
