import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * OBS-002：桶 ACL 或策略允许公开读。
 * 检测 acl = public-read / public-read-write，或 policy 含 "*" Principal。
 */
export class Obs002Rule extends BaseRule {
  constructor() {
    super(
      "OBS-002",
      "HIGH",
      "OBS 桶存在公开读/写访问配置",
      ["huaweicloud_obs_bucket"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const acl = this.stringValues(resource.attributes.acl);
    if (acl.some((v) => /public-read|public-read-write|public-read-delivered/i.test(v))) {
      return this.createResult(
        resource,
        stackName,
        "OBS 桶 ACL 为 public-read 或 public-read-write，任何人可读取/写入对象。",
        "将 acl 改为 private，或使用桶策略限定到指定 IAM 委托/账号。",
      );
    }

    const policy = resource.attributes.policy;
    if (policy !== undefined && policy !== null) {
      const policyText = JSON.stringify(policy);
      // 匿名主体：Principal 为 "*" 字符串，或 Principal 对象内任意键值为 "*"
      const hasAnonymousPrincipal =
        /"Principal"\s*:\s*"\*"/.test(policyText) ||
        /"Principal"\s*:\s*\{\s*"[^"]+"\s*:\s*"\*"\s*\}/.test(policyText);
      // 匿名读写动作：Action 为 "*" 或 OBS 对象级读写动作（字符串或数组形态）
      const hasObjectReadWrite =
        /"Action"\s*:\s*"(?:\*|obs:[A-Za-z]*(?:GetObject|PutObject|ListBucket)[A-Za-z]*|\*)"/.test(
          policyText,
        ) ||
        /"Action"\s*:\s*\[[^\]]*(?:\*|GetObject|PutObject|ListBucket)[^\]]*\]/.test(policyText);
      if (hasAnonymousPrincipal && hasObjectReadWrite) {
        return this.createResult(
          resource,
          stackName,
          "OBS 桶策略允许匿名主体执行读写操作。",
          "移除策略中的 \"*\" Principal，改用最小授权的 IAM 委托与指定账号。",
        );
      }
    }
    return null;
  }
}
