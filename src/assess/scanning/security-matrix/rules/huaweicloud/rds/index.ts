import { Rds001Rule } from "./001-instance-security.js";
import { Rds002Rule } from "./001-instance-security.js";

export const rdsRules = [new Rds001Rule(), new Rds002Rule()];
