import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Gauss001Rule, Gauss002Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/gaussdb/001-instance-security.js";

const gauss = (attributes: Record<string, unknown>): IacResource => ({
  type: "huaweicloud_gaussdb_mysql_instance",
  name: "db",
  attributes,
});

describe("GAUSS-001：数据库实例未启用自动备份", () => {
  const rule = new Gauss001Rule();

  it("backup_strategy 缺失 → 命中 MEDIUM", () => {
    const r = rule.evaluate(gauss({ name: "db" }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("GAUSS-001");
    expect(r!.priority).toBe("MEDIUM");
  });

  it("backup_strategy 已配置 → 不命中", () => {
    const r = rule.evaluate(gauss({ backup_strategy: { keep_days: 7 } }), "stack");
    expect(r).toBeNull();
  });
});

describe("GAUSS-002：数据库实例开放公网访问", () => {
  const rule = new Gauss002Rule();

  it("public_ips 非空 → 命中 HIGH", () => {
    const r = rule.evaluate(gauss({ public_ips: ["1.2.3.4"] }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("GAUSS-002");
    expect(r!.priority).toBe("HIGH");
  });

  it("public_access = true → 命中", () => {
    const r = rule.evaluate(gauss({ public_access: true }), "stack");
    expect(r).not.toBeNull();
  });

  it("未开放公网 → 不命中", () => {
    const r = rule.evaluate(gauss({ private_ips: ["10.0.0.5"] }), "stack");
    expect(r).toBeNull();
  });
});
