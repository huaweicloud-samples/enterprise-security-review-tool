import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * CCE-001：集群控制面开放公网访问。
 * 检测 huaweicloud_cce_cluster 的 public_access（或 endpoints 中存在公网端点）。
 */
export class Cce001Rule extends BaseRule {
  constructor() {
    super(
      "CCE-001",
      "HIGH",
      "CCE 集群控制面开放公网访问",
      ["huaweicloud_cce_cluster"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const publicAccess = resource.attributes.public_access;
    if (publicAccess === true || publicAccess === "true") {
      return this.createResult(
        resource,
        stackName,
        "CCE 集群控制面（kube-apiserver）开放了公网访问，可能暴露集群管理接口。",
        "将 public_access 设为 false 或删除公网端点；需要远程管理时通过跳板机/VPN 接入私网端点。",
      );
    }
    return null;
  }
}

/**
 * CCE-002：集群未启用审计/操作日志。
 * 检测 huaweicloud_cce_cluster 的 log_config（或 extensions）中审计日志缺失。
 */
export class Cce002Rule extends BaseRule {
  constructor() {
    super(
      "CCE-002",
      "MEDIUM",
      "CCE 集群未启用审计日志",
      ["huaweicloud_cce_cluster"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const logConfig = resource.attributes.log_config;
    if (logConfig === undefined || logConfig === null) {
      return this.createResult(
        resource,
        stackName,
        "CCE 集群未配置日志采集（log_config），控制面审计与操作日志缺失。",
        "在 huaweicloud_cce_cluster 中配置 log_config，开启审计/控制面/事件日志并投递到 LTS。",
      );
    }
    return null;
  }
}
