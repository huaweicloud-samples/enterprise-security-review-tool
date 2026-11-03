import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Vpc001Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/vpc/001-unbound-eip.js";

describe("VPC-001：弹性公网 IP 未绑定业务资源（提示）", () => {
  const rule = new Vpc001Rule();

  it("EIP 资源 → 返回 LOW 提示（需人工确认绑定）", () => {
    const res: IacResource = {
      type: "huaweicloud_vpc_eip",
      name: "floating",
      attributes: { publicip: { type: "5_bgp" }, bandwidth: { size: 5 } },
    };
    const r = rule.evaluate(res, "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("VPC-001");
    expect(r!.priority).toBe("LOW");
  });

  it("非 EIP 资源不适用", () => {
    const res: IacResource = { type: "huaweicloud_vpc", name: "vpc", attributes: {} };
    expect(rule.appliesTo("huaweicloud_vpc")).toBe(false);
    expect(rule.evaluate(res, "stack")).not.toBeNull(); // 直接调用仍返回提示，由引擎层按类型过滤
  });
});
