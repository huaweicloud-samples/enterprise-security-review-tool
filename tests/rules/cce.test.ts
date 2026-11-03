import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Cce001Rule, Cce002Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/cce/001-cluster-security.js";

const cceCluster = (attributes: Record<string, unknown>): IacResource => ({
  type: "huaweicloud_cce_cluster",
  name: "prod",
  attributes,
});

describe("CCE-001：集群控制面开放公网访问", () => {
  const rule = new Cce001Rule();

  it("public_access = true → 命中 HIGH", () => {
    const r = rule.evaluate(cceCluster({ public_access: true }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("CCE-001");
  });

  it("public_access = \"true\" → 命中", () => {
    const r = rule.evaluate(cceCluster({ public_access: "true" }), "stack");
    expect(r).not.toBeNull();
  });

  it("public_access = false → 不命中", () => {
    const r = rule.evaluate(cceCluster({ public_access: false }), "stack");
    expect(r).toBeNull();
  });
});

describe("CCE-002：集群未启用审计日志", () => {
  const rule = new Cce002Rule();

  it("log_config 缺失 → 命中 MEDIUM", () => {
    const r = rule.evaluate(cceCluster({ name: "prod" }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("CCE-002");
    expect(r!.priority).toBe("MEDIUM");
  });

  it("log_config 已配置 → 不命中", () => {
    const r = rule.evaluate(cceCluster({ log_config: { enabled: true, type: "audit" } }), "stack");
    expect(r).toBeNull();
  });
});
