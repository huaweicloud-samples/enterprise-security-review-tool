import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Rds001Rule, Rds002Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/rds/001-instance-security.js";

const rds = (attributes: Record<string, unknown>): IacResource => ({
  type: "huaweicloud_rds_instance",
  name: "db",
  attributes,
});

describe("RDS-001：数据库实例开放公网访问", () => {
  const rule = new Rds001Rule();

  it("public_access = true → 命中 HIGH", () => {
    const r = rule.evaluate(rds({ public_access: true }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("RDS-001");
  });

  it("public_ips 非空 → 命中", () => {
    const r = rule.evaluate(rds({ public_ips: ["1.2.3.4"] }), "stack");
    expect(r).not.toBeNull();
  });

  it("未开放公网 → 不命中", () => {
    const r = rule.evaluate(rds({ public_access: false, availability_zone: "cn-north-4a" }), "stack");
    expect(r).toBeNull();
  });
});

describe("RDS-002：未启用自动备份", () => {
  const rule = new Rds002Rule();

  it("backup_strategy 缺失 → 命中 MEDIUM", () => {
    const r = rule.evaluate(rds({ name: "db" }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("RDS-002");
    expect(r!.priority).toBe("MEDIUM");
  });

  it("backup_strategy.enabled = false → 命中", () => {
    const r = rule.evaluate(rds({ backup_strategy: { enabled: false } }), "stack");
    expect(r).not.toBeNull();
  });

  it("backup_strategy 正常配置 → 不命中", () => {
    const r = rule.evaluate(
      rds({ backup_strategy: { start_time: "01:00-02:00", keep_days: 7 } }),
      "stack",
    );
    expect(r).toBeNull();
  });
});
