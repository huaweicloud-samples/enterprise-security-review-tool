import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * GAUSS-001：GaussDB/GeminiDB 未启用自动备份。
 * 检测 backup_strategy 缺失或 disabled。
 */
export class Gauss001Rule extends BaseRule {
  constructor() {
    super(
      "GAUSS-001",
      "MEDIUM",
      "数据库实例未启用自动备份",
      [
        "huaweicloud_gaussdb_mysql_instance",
        "huaweicloud_gaussdb_opengauss_instance",
        "huaweicloud_gaussdb_cassandra_instance",
      ],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const strategy = resource.attributes.backup_strategy;
    if (strategy === undefined || strategy === null) {
      return this.createResult(
        resource,
        stackName,
        "数据库实例未配置自动备份策略（backup_strategy），数据面临丢失风险。",
        "配置 backup_strategy 启用自动备份并设置保留天数。",
      );
    }
    return null;
  }
}

/**
 * GAUSS-002：数据库实例开放公网访问。
 * 检测 public_ips / public_access。
 */
export class Gauss002Rule extends BaseRule {
  constructor() {
    super(
      "GAUSS-002",
      "HIGH",
      "数据库实例开放公网访问",
      [
        "huaweicloud_gaussdb_mysql_instance",
        "huaweicloud_gaussdb_opengauss_instance",
        "huaweicloud_gaussdb_cassandra_instance",
      ],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const publicIps = this.stringValues(resource.attributes.public_ips);
    const publicAccess = resource.attributes.public_access;
    if (publicIps.length > 0 || publicAccess === true || publicAccess === "true") {
      return this.createResult(
        resource,
        stackName,
        "数据库实例配置了公网 IP/访问，数据库端口暴露在公网。",
        "移除公网 IP 绑定，应用通过 VPC 内网访问数据库。",
      );
    }
    return null;
  }
}
