import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Elb001Rule, Elb002Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/elb/001-listener-security.js";

describe("ELB-001：监听器未启用 TLS 加密", () => {
  const rule = new Elb001Rule();

  it("protocol = HTTP → 命中 HIGH", () => {
    const res: IacResource = {
      type: "huaweicloud_lb_listener",
      name: "http",
      attributes: { protocol: "HTTP", port: 80 },
    };
    const r = rule.evaluate(res, "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("ELB-001");
  });

  it("protocol 缺失 → 命中", () => {
    const res: IacResource = { type: "huaweicloud_lb_listener", name: "l", attributes: {} };
    expect(rule.evaluate(res, "stack")).not.toBeNull();
  });

  it("protocol = HTTPS → 不命中", () => {
    const res: IacResource = {
      type: "huaweicloud_lb_listener",
      name: "https",
      attributes: { protocol: "HTTPS", port: 443 },
    };
    expect(rule.evaluate(res, "stack")).toBeNull();
  });

  it("protocol = TCP（直通场景）→ 不命中", () => {
    const res: IacResource = {
      type: "huaweicloud_lb_listener",
      name: "tcp",
      attributes: { protocol: "TCP" },
    };
    expect(rule.evaluate(res, "stack")).toBeNull();
  });
});

describe("ELB-002：负载均衡未开启访问日志", () => {
  const rule = new Elb002Rule();

  it("access_log 缺失 → 命中 LOW", () => {
    const res: IacResource = { type: "huaweicloud_lb_loadbalancer", name: "lb", attributes: {} };
    const r = rule.evaluate(res, "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("ELB-002");
    expect(r!.priority).toBe("LOW");
  });

  it("access_log 已配置 → 不命中", () => {
    const res: IacResource = {
      type: "huaweicloud_lb_loadbalancer",
      name: "lb",
      attributes: { access_log: { bucket: "logs", enabled: true } },
    };
    expect(rule.evaluate(res, "stack")).toBeNull();
  });
});
