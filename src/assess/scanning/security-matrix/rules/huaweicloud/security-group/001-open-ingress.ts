import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * SEC-001：安全组入站规则允许全网 0.0.0.0/0 访问。
 * 支持两种形态：
 *   - huaweicloud_networking_secgroup 的 rules 嵌套块（cidr = 0.0.0.0/0）
 *   - huaweicloud_networking_secgroup_rule 独立资源（direction=ingress + remote_ip_prefix=0.0.0.0/0）
 */
export class Sec001Rule extends BaseRule {
  constructor() {
    super(
      "SEC-001",
      "HIGH",
      "安全组入站规则允许全网 (0.0.0.0/0) 访问",
      ["huaweicloud_networking_secgroup", "huaweicloud_networking_secgroup_rule"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    if (resource.type === "huaweicloud_networking_secgroup") {
      const rules = this.rulesList(resource.attributes.rules);
      for (const rule of rules) {
        const cidrs = this.stringValues(rule.cidr);
        if (cidrs.some((c) => this.isOpenToWorld(c))) {
          return this.createResult(
            resource,
            stackName,
            "安全组存在允许 0.0.0.0/0 入站访问的规则，任意来源均可访问关联实例。",
            "将入站规则收敛到业务所需的最小来源网段；必须公网暴露的场景应置于负载均衡之后并加安全组限制。",
          );
        }
      }
      return null;
    }

    // 独立安全组规则资源
    const direction = this.stringValues(resource.attributes.direction);
    if (direction.length > 0 && !direction.includes("ingress")) return null;
    const prefixes = this.stringValues(resource.attributes.remote_ip_prefix);
    if (prefixes.some((p) => this.isOpenToWorld(p))) {
      return this.createResult(
        resource,
        stackName,
        "安全组入站规则允许 0.0.0.0/0 来源访问。",
        "将 remote_ip_prefix 收敛到业务所需的最小来源网段。",
      );
    }
    return null;
  }

  private rulesList(value: unknown): Array<Record<string, unknown>> {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
    return [value as Record<string, unknown>];
  }

  private isOpenToWorld(cidr: string): boolean {
    const v = cidr.trim();
    return v === "0.0.0.0/0" || v === "::/0" || v.startsWith("0.0.0.0/0") || v.startsWith("::/0");
  }
}
