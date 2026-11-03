import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Obs001Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/obs/001-server-side-encryption.js";
import { Obs002Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/obs/002-public-access.js";

const obs = (attributes: Record<string, unknown>): IacResource => ({
  type: "huaweicloud_obs_bucket",
  name: "logs",
  attributes,
});

describe("OBS-001：桶未启用服务端加密", () => {
  const rule = new Obs001Rule();

  it("未配置 server_side_encryption → 命中 HIGH", () => {
    const r = rule.evaluate(obs({ bucket: "logs" }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("OBS-001");
    expect(r!.priority).toBe("HIGH");
  });

  it("server_side_encryption 为空对象（未指定算法）→ 命中", () => {
    const r = rule.evaluate(obs({ server_side_encryption: {} }), "stack");
    expect(r).not.toBeNull();
  });

  it("algorithm = kms → 不命中", () => {
    const r = rule.evaluate(
      obs({ server_side_encryption: { algorithm: "kms", kms_key_id: "k-1" } }),
      "stack",
    );
    expect(r).toBeNull();
  });

  it("algorithm = AES256 → 不命中", () => {
    const r = rule.evaluate(obs({ server_side_encryption: { algorithm: "AES256" } }), "stack");
    expect(r).toBeNull();
  });
});

describe("OBS-002：桶存在公开读/写访问配置", () => {
  const rule = new Obs002Rule();

  it("acl = public-read → 命中 HIGH", () => {
    const r = rule.evaluate(obs({ acl: "public-read" }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("OBS-002");
  });

  it("acl = public-read-write → 命中", () => {
    const r = rule.evaluate(obs({ acl: "public-read-write" }), "stack");
    expect(r).not.toBeNull();
  });

  it("策略含 * Principal + obs:GetObject 匿名动作 → 命中", () => {
    const r = rule.evaluate(
      obs({
        policy: {
          Version: "2012-10-17",
          Statement: [
            { Effect: "Allow", Principal: "*", Action: "obs:GetObject", Resource: "arn:obs:::logs/*" },
          ],
        },
      }),
      "stack",
    );
    expect(r).not.toBeNull();
  });

  it("acl = private 且策略无匿名主体 → 不命中", () => {
    const r = rule.evaluate(
      obs({
        acl: "private",
        policy: {
          Statement: [
            {
              Effect: "Allow",
              Principal: { ID: "urn:iam:example:agency:ops" },
              Action: "obs:GetObject",
            },
          ],
        },
      }),
      "stack",
    );
    expect(r).toBeNull();
  });
});
