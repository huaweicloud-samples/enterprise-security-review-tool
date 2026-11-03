/**
 * 资源类型 → 服务领域映射。
 *
 * 将华为云 Terraform 资源类型（huaweicloud_*）归一化到服务领域名称，
 * 用于规则匹配与报告分组。
 */
const TF_TO_SERVICE: Record<string, string> = {
  huaweicloud_obs_bucket: "OBS",
  huaweicloud_obs_bucket_object: "OBS",
  huaweicloud_networking_secgroup: "安全组",
  huaweicloud_networking_secgroup_rule: "安全组",
  huaweicloud_cce_cluster: "CCE",
  huaweicloud_cce_node_pool: "CCE",
  huaweicloud_cce_node: "CCE",
  huaweicloud_rds_instance: "RDS",
  huaweicloud_rds_read_replica_instance: "RDS",
  huaweicloud_compute_instance: "ECS",
  huaweicloud_compute_eip_associate: "ECS",
  huaweicloud_vpc_eip: "VPC",
  huaweicloud_vpc: "VPC",
  huaweicloud_vpc_subnet: "VPC",
  huaweicloud_lb_loadbalancer: "ELB",
  huaweicloud_lb_listener: "ELB",
  huaweicloud_lb_certificate: "ELB",
  huaweicloud_gaussdb_cassandra_instance: "GeminiDB",
  huaweicloud_gaussdb_mysql_instance: "GaussDB",
  huaweicloud_gaussdb_opengauss_instance: "GaussDB",
  huaweicloud_fgs_function: "FunctionGraph",
  huaweicloud_iam_agency: "IAM",
  huaweicloud_iam_role: "IAM",
  huaweicloud_iam_policy: "IAM",
  huaweicloud_csbs_backup: "云备份",
  huaweicloud_cbr_backup: "云备份",
};

/** 将任意资源类型映射到服务领域名称；未知类型返回 "其他"。 */
export function toService(resourceType: string): string {
  if (resourceType.startsWith("huaweicloud_")) {
    return TF_TO_SERVICE[resourceType] ?? "其他";
  }
  return "其他";
}
