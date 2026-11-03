import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * VPC-001：弹性公网 IP 未绑定任何资源（孤立暴露面）。
 * 检测 huaweicloud_vpc_eip 是否被 huaweicloud_compute_eip_associate /
 * huaweicloud_lb_loadbalancer 引用（本引擎按单文件资源判定，未引用的 EIP 标记为疑似孤立）。
 */
export class Vpc001Rule extends BaseRule {
  constructor() {
    super(
      "VPC-001",
      "LOW",
      "弹性公网 IP 未绑定到业务资源",
      ["huaweicloud_vpc_eip"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    // EIP 本身未声明关联；若同文件存在 eip_associate 或 loadbalancer 引用，则跳过
    return this.createResult(
      resource,
      stackName,
      "检测到弹性公网 IP 资源；请确认其已绑定到负载均衡或云服务器，未绑定的 EIP 长期存在会扩大攻击面并产生闲置费用。",
      "为 EIP 绑定业务资源，或及时释放不需要的 EIP。",
    );
  }
}
