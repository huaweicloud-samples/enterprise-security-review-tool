import { BaseRule } from "../../../security-rule-base.js";
import type { IacResource } from "../../../iac-utils.js";
import type { ScanResult } from "../../../types.js";

/**
 * ECS-001：云服务器直接绑定弹性公网 IP。
 * 检测 huaweicloud_compute_instance 的 eip_id / eip_ids / eip，以及
 * huaweicloud_compute_eip_associate 关联资源。
 */
export class Ecs001Rule extends BaseRule {
  constructor() {
    super(
      "ECS-001",
      "MEDIUM",
      "云服务器直接绑定弹性公网 IP",
      ["huaweicloud_compute_instance", "huaweicloud_compute_eip_associate"],
    );
  }

  public evaluate(resource: IacResource, stackName: string): ScanResult | null {
    if (resource.type === "huaweicloud_compute_eip_associate") {
      return this.createResult(
        resource,
        stackName,
        "检测到云服务器与弹性公网 IP 的直接关联，实例直接暴露在公网。",
        "通过负载均衡（ELB）对外提供服务，将 EIP 绑定到 ELB 而非实例；确需直连时收敛安全组入站规则。",
      );
    }

    const eip = resource.attributes.eip_id ?? resource.attributes.eip_ids ?? resource.attributes.eip;
    if (eip !== undefined && eip !== null) {
      return this.createResult(
        resource,
        stackName,
        "云服务器配置了弹性公网 IP，计算实例直接暴露在公网。",
        "通过负载均衡对外提供服务，将 EIP 绑定到 ELB 而非实例；确需直连时收敛安全组入站规则。",
      );
    }
    return null;
  }
}
