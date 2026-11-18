import { withRequestAudit } from "@backend/http/request-handler";
import { GET as handleGET } from "@backend/http/customers/handlers";

export const GET = withRequestAudit(handleGET);

