import { obsRules } from "./huaweicloud/obs/index.js";
import { securityGroupRules } from "./huaweicloud/security-group/index.js";
import { cceRules } from "./huaweicloud/cce/index.js";
import { rdsRules } from "./huaweicloud/rds/index.js";
import { ecsRules } from "./huaweicloud/ecs/index.js";
import { elbRules } from "./huaweicloud/elb/index.js";
import { gaussdbRules } from "./huaweicloud/gaussdb/index.js";
import { fgsRules } from "./huaweicloud/fgs/index.js";
import { iamRules } from "./huaweicloud/iam/index.js";
import { vpcRules } from "./huaweicloud/vpc/index.js";
import type { BaseRule } from "../security-rule-base.js";

/** 全部华为云安全规则（按服务聚合）。新增规则在此登记。 */
export const allRules: BaseRule[] = [
  ...obsRules,
  ...securityGroupRules,
  ...cceRules,
  ...rdsRules,
  ...ecsRules,
  ...elbRules,
  ...gaussdbRules,
  ...fgsRules,
  ...iamRules,
  ...vpcRules,
];

/** 按资源类型索引规则，加速引擎匹配。 */
export function buildRuleIndex(rules: BaseRule[]): Map<string, BaseRule[]> {
  const index = new Map<string, BaseRule[]>();
  for (const rule of rules) {
    for (const type of rule.applicableResourceTypes) {
      if (!index.has(type)) index.set(type, []);
      index.get(type)!.push(rule);
    }
  }
  return index;
}
