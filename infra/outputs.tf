# 报告归档桶（可选，默认不创建）
resource "huaweicloud_obs_bucket" "srt_reports" {
  count         = var.enabled ? 1 : 0
  bucket        = var.bucket_name
  acl           = "private"
  sse_algorithm = "AES256"

  lifecycle_rule {
    name    = "expire-reports"
    enabled = true
    prefix  = var.report_path_prefix
    expiration {
      days = 180
    }
  }

  tags = {
    purpose = "iac-security-review-reports"
  }

  # 运行期可能被控制台/脚本改写的字段（标签、生命周期规则、版本控制），所有权让给运行期，
  # 避免下次 apply 静默回滚（C10）
  lifecycle {
    ignore_changes = [tags, lifecycle_rule, versioning]
  }
}

output "report_bucket" {
  description = "报告归档桶信息（未启用时为空）"
  value = var.enabled ? {
    name          = huaweicloud_obs_bucket.srt_reports[0].bucket
    bucket_domain = huaweicloud_obs_bucket.srt_reports[0].bucket_domain_name
    region        = var.region
  } : null
}

output "usage_note" {
  description = "使用说明"
  value       = "本地 CLI 运行无需云资源；如需归档报告，设置 enabled=true 并指定 bucket_name 后 apply。"
}
