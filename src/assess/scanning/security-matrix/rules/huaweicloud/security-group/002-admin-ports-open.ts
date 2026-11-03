import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * SEC-002：SSH (22) / RDP (3389) 管理端口对全网开放。
 * 检测规则中 protocol=tcp + 端口范围含 22/3389 + 来源 0.0.0.0/0。
 */
export class Sec002Rule extends BaseRule {
  constructor() {
    super(
      "SEC-002",
      "HIGH",
      "SSH/RDP 管理端口对全网开放",
      ["huaweicloud_networking_secgroup", "huaweicloud_networking_secgroup_rule"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    if (resource.type === "huaweicloud_networking_secgroup") {
      const rules = this.rulesList(resource.attributes.rules);
      for (const rule of rules) {
        if (this.isAdminPortOpen(rule)) {
          return this.createResult(
            resource,
            stackName,
            "管理端口 (22/3389) 允许 0.0.0.0/0 来源访问，存在暴力破解风险。",
            "将管理端口来源收敛到运维网段，或使用跳板机/堡垒机（云堡垒机 CBH）接入。",
          );
        }
      }
      return null;
    }

    const direction = this.stringValues(resource.attributes.direction);
    if (direction.length > 0 && !direction.includes("ingress")) return null;
    if (this.isAdminPortOpen(resource.attributes)) {
      return this.createResult(
        resource,
        stackName,
        "管理端口 (22/3389) 允许 0.0.0.0/0 来源访问，存在暴力破解风险。",
        "将管理端口来源收敛到运维网段，或使用云堡垒机接入。",
      );
    }
    return null;
  }

  private rulesList(value: unknown): Array<Record<string, unknown>> {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
    return [value as Record<string, unknown>];
  }

  private isAdminPortOpen(rule: Record<string, unknown>): boolean {
    const protocol = this.stringValues(rule.protocol).join("").toLowerCase();
    if (protocol && protocol !== "tcp" && protocol !== "all" && protocol !== "any") return false;

    const cidrs = [
      ...this.stringValues(rule.cidr),
      ...this.stringValues(rule.remote_ip_prefix),
    ];
    const open = cidrs.some((c) => {
      const v = c.trim();
      return v === "0.0.0.0/0" || v === "::/0" || v.startsWith("0.0.0.0/0") || v.startsWith("::/0");
    });
    if (!open) return false;

    const ports = [
      ...this.stringValues(rule.ports),
      ...this.stringValues(rule.port_range),
      this.stringValues(rule.port_range_min).join(","),
      this.stringValues(rule.port_range_max).join(","),
    ].join(",");

    if (!ports) return false; // 未声明端口范围，保守起见不判命中
    return ports.includes("22") || ports.includes("3389") || ports.includes("22-") || ports.includes("-22");
  }
}
