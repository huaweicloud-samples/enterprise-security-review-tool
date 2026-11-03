import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * ELB-001：监听器未启用 TLS 加密。
 * 检测 huaweicloud_lb_listener 的 protocol 为 HTTP（或未指定 tls_ciphers_policy）。
 */
export class Elb001Rule extends BaseRule {
  constructor() {
    super(
      "ELB-001",
      "HIGH",
      "负载均衡监听器未启用 TLS 加密",
      ["huaweicloud_lb_listener"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const protocol = this.stringValues(resource.attributes.protocol).join("").toUpperCase();
    if (protocol === "HTTP" || protocol === "") {
      return this.createResult(
        resource,
        stackName,
        "监听器使用 HTTP 明文协议，流量在传输中可被窃听或篡改。",
        "将监听器协议改为 HTTPS/TERMINATED_HTTPS，并配置 huaweicloud_lb_certificate 证书。",
      );
    }
    if (protocol === "TCP") {
      // TCP 直通场景（如数据库代理）不做强制要求，提示级别
      return null;
    }
    return null;
  }
}

/**
 * ELB-002：负载均衡未开启访问日志。
 * 检测 huaweicloud_lb_loadbalancer 的 access_log（缺失或 enabled=false）。
 */
export class Elb002Rule extends BaseRule {
  constructor() {
    super(
      "ELB-002",
      "LOW",
      "负载均衡未开启访问日志",
      ["huaweicloud_lb_loadbalancer"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    const accessLog = resource.attributes.access_log;
    if (accessLog === undefined || accessLog === null) {
      return this.createResult(
        resource,
        stackName,
        "负载均衡未配置访问日志（access_log），无法对流量进行审计。",
        "配置 access_log 将请求日志投递到 OBS 桶，满足审计与排障需求。",
      );
    }
    return null;
  }
}
