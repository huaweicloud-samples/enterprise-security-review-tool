import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Fgs001Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/fgs/001-env-secrets.js";

const fgs = (attributes: Record<string, unknown>): IacResource => ({
  type: "huaweicloud_fgs_function",
  name: "handler",
  attributes,
});

describe("FGS-001：函数环境变量包含明文敏感信息", () => {
  const rule = new Fgs001Rule();

  it("API_KEY 环境变量 → 命中 HIGH 且值被掩码", () => {
    const r = rule.evaluate(
      fgs({ name: "handler", env_variables: { API_KEY: "sk-12345678-ab" } }),
      "stack",
    );
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("FGS-001");
    expect(r!.priority).toBe("HIGH");
    expect(r!.issue).toContain("sk***ab");
    expect(r!.issue).not.toContain("sk-12345678-ab");
  });

  it("password 键 → 命中", () => {
    const r = rule.evaluate(fgs({ env_variables: { DB_PASSWORD: "p@ssw0rd" } }), "stack");
    expect(r).not.toBeNull();
  });

  it("access_key 键 → 命中", () => {
    const r = rule.evaluate(fgs({ env_variables: { ACCESS_KEY: "AK-123" } }), "stack");
    expect(r).not.toBeNull();
  });

  it("普通配置项 → 不命中", () => {
    const r = rule.evaluate(
      fgs({ env_variables: { LOG_LEVEL: "info", REGION: "cn-north-4" } }),
      "stack",
    );
    expect(r).toBeNull();
  });

  it("无 env_variables → 不命中", () => {
    expect(rule.evaluate(fgs({ name: "handler" }), "stack")).toBeNull();
  });
});
