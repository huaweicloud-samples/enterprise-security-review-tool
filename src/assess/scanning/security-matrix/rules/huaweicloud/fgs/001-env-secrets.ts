import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * FGS-001：函数环境变量包含明文敏感信息。
 * 检测 huaweicloud_fgs_function 的 env_variables 中键名含
 * password/secret/token/api_key/access_key 等敏感字样的配置。
 */
const SENSITIVE_KEY_RE = /password|passwd|secret|token|api[_ -]?key|access[_ -]?key|private[_ -]?key|credential/i;

export class Fgs001Rule extends BaseRule {
  constructor() {
    super(
      "FGS-001",
      "HIGH",
      "函数环境变量包含明文敏感信息",
      ["huaweicloud_fgs_function"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const envVars = resource.attributes.env_variables;
    if (envVars === undefined || envVars === null) return null;

    const entries =
      typeof envVars === "object" && !Array.isArray(envVars)
        ? Object.entries(envVars as Record<string, unknown>)
        : [];

    for (const [key, value] of entries) {
      if (SENSITIVE_KEY_RE.test(key)) {
        const masked = this.mask(String(value));
        return this.createResult(
          resource,
          stackName,
          `函数环境变量 "${key}" 疑似包含敏感凭据（值: ${masked}），在 IaC 中以明文存储。`,
          "将敏感配置迁移到密钥管理服务（凭据管理服务 DAS/数据加密服务 DEW 的凭据），函数通过运行时读取；同时检查变量值是否曾提交到版本库。",
        );
      }
    }
    return null;
  }

  private mask(value: string): string {
    if (value.length <= 4) return "***";
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
}
