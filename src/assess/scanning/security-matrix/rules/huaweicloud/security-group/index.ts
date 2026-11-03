import { Sec001Rule } from "./001-open-ingress.js";
import { Sec002Rule } from "./002-admin-ports-open.js";

export const securityGroupRules = [new Sec001Rule(), new Sec002Rule()];
