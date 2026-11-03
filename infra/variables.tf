variable "region" {
  description = "华为云区域"
  type        = string
  default     = "cn-north-4"
}

variable "enabled" {
  description = "是否创建报告归档桶（默认不创建，本地 CLI 运行无需云资源）"
  type        = bool
  default     = false
}

variable "bucket_name" {
  description = "报告归档桶名称（enabled=true 时必须显式指定）"
  type        = string
  default     = ""
}

variable "report_path_prefix" {
  description = "归档对象前缀（如 reports/2026-08）"
  type        = string
  default     = "reports"
}
