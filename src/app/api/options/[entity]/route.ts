import { withRequestAudit } from "@backend/http/request-handler";
import { getOptions } from "@backend/http/options/handlers";

export const GET = withRequestAudit(getOptions);
