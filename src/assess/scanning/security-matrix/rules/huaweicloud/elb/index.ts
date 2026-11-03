import { Elb001Rule } from "./001-listener-security.js";
import { Elb002Rule } from "./001-listener-security.js";

export const elbRules = [new Elb001Rule(), new Elb002Rule()];
