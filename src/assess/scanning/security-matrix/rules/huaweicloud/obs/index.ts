import { Obs001Rule } from "./001-server-side-encryption.js";
import { Obs002Rule } from "./002-public-access.js";

export const obsRules = [new Obs001Rule(), new Obs002Rule()];
