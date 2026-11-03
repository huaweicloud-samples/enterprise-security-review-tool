import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * RDS-001：数据库实例开放公网访问。
 * 检测 huaweicloud_rds_instance 的 public_access / public_ips。
 */
export class Rds001Rule extends BaseRule {
  constructor() {
    super(
      "RDS-001",
      "HIGH",
      "RDS 数据库实例开放公网访问",
      ["huaweicloud_rds_instance"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const publicAccess = resource.attributes.public_access;
    const publicIps = this.stringValues(resource.attributes.public_ips);
    if (publicAccess === true || publicAccess === "true" || publicIps.length > 0) {
      return this.createResult(
        resource,
        stackName,
        "RDS 数据库实例配置了公网访问，数据库端口暴露在公网存在被攻击风险。",
        "移除公网访问配置（public_access=false），应用通过 VPC 内网连接数据库；确需外部访问时使用数据管理服务 DAS 或 VPN。",
      );
    }
    return null;
  }
}

/**
 * RDS-002：未启用自动备份。
 * 检测 huaweicloud_rds_instance 的 backup_strategy（缺失或 enabled=false）。
 */
export class Rds002Rule extends BaseRule {
  constructor() {
    super(
      "RDS-002",
      "MEDIUM",
      "RDS 实例未启用自动备份",
      ["huaweicloud_rds_instance"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const strategy = resource.attributes.backup_strategy;
    if (strategy === undefined || strategy === null) {
      return this.createResult(
        resource,
        stackName,
        "RDS 实例未配置自动备份策略（backup_strategy），数据面临误删/损坏无法恢复的风险。",
        "配置 backup_strategy { start_time, keep_days } 启用自动备份，并按数据重要性设置保留天数。",
      );
    }
    const disabled = (strategy as Record<string, unknown>)?.enabled === false;
    if (disabled) {
      return this.createResult(
        resource,
        stackName,
        "RDS 实例的自动备份策略被显式禁用。",
        "将 backup_strategy.enabled 设为 true 并设置合理的保留天数。",
      );
    }
    return null;
  }
}
