import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * IAM-001：委托授予过高权限。
 * 检测 huaweicloud_iam_agency 的 domain_roles 含 "*" / "Administrator" / "FullAccess"。
 */
export class Iam001Rule extends BaseRule {
  constructor() {
    super(
      "IAM-001",
      "HIGH",
      "IAM 委托授予过高权限",
      ["huaweicloud_iam_agency"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const roles = [
      ...this.stringValues(resource.attributes.domain_roles),
      ...this.stringValues(resource.attributes.project_roles),
    ];
    if (roles.length === 0) return null;

    const overPrivileged = roles.some(
      (r) => r === "*" || r === "Administrator" || /FullAccess|Admin$/.test(r),
    );
    if (overPrivileged) {
      return this.createResult(
        resource,
        stackName,
        `IAM 委托授予了过高权限角色（${roles.join(", ")}），可能导致权限滥用。`,
        "遵循最小权限原则，将委托角色收敛为业务所需的具体操作权限（如指定服务的只读/读写权限）。",
      );
    }
    return null;
  }
}
