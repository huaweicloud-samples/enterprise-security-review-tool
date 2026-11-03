import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Sec001Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/security-group/001-open-ingress.js";
import { Sec002Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/security-group/002-admin-ports-open.js";

const secgroup = (attributes: Record<string, unknown>): IacResource => ({
  type: "huaweicloud_networking_secgroup",
  name: "web",
  attributes,
});

const secgroupRule = (attributes: Record<string, unknown>): IacResource => ({
  type: "huaweicloud_networking_secgroup_rule",
  name: "r1",
  attributes,
});

describe("SEC-001：入站规则允许全网访问", () => {
  const rule = new Sec001Rule();

  it("rules 单对象（解析后形态）含 0.0.0.0/0 → 命中 HIGH", () => {
    const r = rule.evaluate(
      secgroup({ rules: { direction: "ingress", protocol: "tcp", cidr: "0.0.0.0/0" } }),
      "stack",
    );
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("SEC-001");
  });

  it("rules 数组含 ::/0 → 命中", () => {
    const r = rule.evaluate(
      secgroup({
        rules: [
          { direction: "ingress", protocol: "tcp", cidr: "10.0.0.0/8" },
          { direction: "ingress", protocol: "tcp", cidr: "::/0" },
        ],
      }),
      "stack",
    );
    expect(r).not.toBeNull();
  });

  it("独立 rule 资源 remote_ip_prefix = 0.0.0.0/0 → 命中", () => {
    const r = rule.evaluate(
      secgroupRule({ direction: "ingress", protocol: "tcp", remote_ip_prefix: "0.0.0.0/0" }),
      "stack",
    );
    expect(r).not.toBeNull();
  });

  it("出方向规则不误报", () => {
    const r = rule.evaluate(
      secgroupRule({ direction: "egress", protocol: "tcp", remote_ip_prefix: "0.0.0.0/0" }),
      "stack",
    );
    expect(r).toBeNull();
  });

  it("来源为内网网段 → 不命中", () => {
    const r = rule.evaluate(secgroup({ rules: { direction: "ingress", cidr: "10.0.0.0/8" } }), "stack");
    expect(r).toBeNull();
  });
});

describe("SEC-002：SSH/RDP 管理端口对全网开放", () => {
  const rule = new Sec002Rule();

  it("tcp + port_range 22 + 0.0.0.0/0 → 命中 HIGH", () => {
    const r = rule.evaluate(
      secgroup({ rules: { direction: "ingress", protocol: "tcp", port_range: "22", cidr: "0.0.0.0/0" } }),
      "stack",
    );
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("SEC-002");
  });

  it("port_range_min/max 3389 + ::/0 → 命中", () => {
    const r = rule.evaluate(
      secgroupRule({
        direction: "ingress",
        protocol: "tcp",
        port_range_min: "3389",
        port_range_max: "3389",
        remote_ip_prefix: "::/0",
      }),
      "stack",
    );
    expect(r).not.toBeNull();
  });

  it("管理端口但来源受限 → 不命中", () => {
    const r = rule.evaluate(
      secgroup({ rules: { direction: "ingress", protocol: "tcp", port_range: "22", cidr: "10.20.0.0/16" } }),
      "stack",
    );
    expect(r).toBeNull();
  });

  it("全网开放但端口为 80 → 不命中", () => {
    const r = rule.evaluate(
      secgroup({ rules: { direction: "ingress", protocol: "tcp", port_range: "80", cidr: "0.0.0.0/0" } }),
      "stack",
    );
    expect(r).toBeNull();
  });

  it("未声明端口范围（保守）→ 不命中", () => {
    const r = rule.evaluate(
      secgroup({ rules: { direction: "ingress", protocol: "tcp", cidr: "0.0.0.0/0" } }),
      "stack",
    );
    expect(r).toBeNull();
  });
});
