import { describe, it, expect } from "vitest";
import type { IacResource } from "../../src/assess/scanning/security-matrix/iac-utils.js";
import { Iam001Rule } from "../../src/assess/scanning/security-matrix/rules/huaweicloud/iam/001-agency-overprivileged.js";

const agency = (attributes: Record<string, unknown>): IacResource => ({
  type: "huaweicloud_iam_agency",
  name: "ops",
  attributes,
});

describe("IAM-001：委托授予过高权限", () => {
  const rule = new Iam001Rule();

  it("domain_roles 含 Administrator → 命中 HIGH", () => {
    const r = rule.evaluate(agency({ domain_roles: ["Administrator"] }), "stack");
    expect(r).not.toBeNull();
    expect(r!.check_id).toBe("IAM-001");
    expect(r!.priority).toBe("HIGH");
  });

  it("project_roles 含 FullAccess → 命中", () => {
    const r = rule.evaluate(agency({ project_roles: ["OBS FullAccess"] }), "stack");
    expect(r).not.toBeNull();
  });

  it("domain_roles 含 * → 命中", () => {
    const r = rule.evaluate(agency({ domain_roles: ["*"] }), "stack");
    expect(r).not.toBeNull();
  });

  it("最小权限角色 → 不命中", () => {
    const r = rule.evaluate(
      agency({ domain_roles: ["OBS ReadOnlyAccess"], project_roles: ["VPC Viewer"] }),
      "stack",
    );
    expect(r).toBeNull();
  });

  it("未声明角色 → 不命中", () => {
    expect(rule.evaluate(agency({ name: "ops" }), "stack")).toBeNull();
  });
});
