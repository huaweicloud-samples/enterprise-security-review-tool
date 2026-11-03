import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Ecs001Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/ecs/001-public-ip.js";

describe("ECS-001：云服务器直接绑定弹性公网 IP", () => {
  const rule = new Ecs001Rule();

  it("compute_instance 配置 eip_id → 命中 MEDIUM", () => {
    const res: IacResource = {
      type: "huaweicloud_compute_instance",
      name: "web",
      attributes: { name: "web", eip_id: "eip-123" },
    };
    const r = rule.evaluate(res, "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("ECS-001");
    expect(r!.priority).toBe("MEDIUM");
  });

  it("compute_instance 配置 eip 嵌套块 → 命中", () => {
    const res: IacResource = {
      type: "huaweicloud_compute_instance",
      name: "web",
      attributes: { eip: { bandwidth: 5 } },
    };
    expect(rule.evaluate(res, "stack")).not.toBeNull();
  });

  it("eip_associate 独立资源 → 命中", () => {
    const res: IacResource = {
      type: "huaweicloud_compute_eip_associate",
      name: "assoc",
      attributes: { instance_id: "i-1", public_ip: "1.2.3.4" },
    };
    expect(rule.evaluate(res, "stack")).not.toBeNull();
  });

  it("未绑定 EIP → 不命中", () => {
    const res: IacResource = {
      type: "huaweicloud_compute_instance",
      name: "internal",
      attributes: { name: "internal" },
    };
    expect(rule.evaluate(res, "stack")).toBeNull();
  });
});
