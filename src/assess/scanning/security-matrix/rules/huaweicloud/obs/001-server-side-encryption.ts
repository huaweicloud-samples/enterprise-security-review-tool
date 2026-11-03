import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * OBS-001：桶未启用服务端加密。
 * 对应 huaweicloud_obs_bucket.server_side_encryption（缺失或 algorithm 为空）。
 */
export class Obs001Rule extends BaseRule {
  constructor() {
    super(
      "OBS-001",
      "HIGH",
      "OBS 桶未启用服务端加密（SSE）",
      ["huaweicloud_obs_bucket"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const sse = resource.attributes.server_side_encryption;
    if (sse === undefined || sse === null) {
      return this.createResult(
        resource,
        stackName,
        "OBS 桶未配置服务端加密，对象数据在静态存储时可能明文暴露。",
        "在 huaweicloud_obs_bucket 中配置 server_side_encryption { algorithm = \"kms\"（或 \"AES256\"）} 启用服务端加密。",
      );
    }
    const algo = (sse as Record<string, unknown>)?.algorithm;
    if (!algo) {
      return this.createResult(
        resource,
        stackName,
        "OBS 桶的 server_side_encryption 未指定加密算法。",
        "在 server_side_encryption 块中显式指定 algorithm，推荐使用 KMS 托管密钥。",
      );
    }
    return null;
  }
}
