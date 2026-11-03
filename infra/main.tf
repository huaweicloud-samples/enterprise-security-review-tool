/**
 * 可选：审查报告归档基础设施。
 *
 * 本工具为本地 CLI，运行不依赖任何云资源。
 * 此目录仅提供「将 .srt/ 报告归档到 OBS 桶」的可选能力，默认关闭（enabled = false）。
 * 启用：terraform apply -var "enabled=true" -var "bucket_name=my-srt-reports"
 */
terraform {
  required_version = ">= 1.3"
  required_providers {
    huaweicloud = {
      source  = "huaweicloud/huaweicloud"
      version = "~> 1.60"
    }
  }
}

provider "huaweicloud" {
  region = var.region
}
