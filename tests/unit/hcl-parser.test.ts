import { describe, it, expect } from "vitest";
import { parseHcl, resourceFromBlock } from "../../src/assess/scanning/security-matrix/hcl-parser.js";

describe("HCL 子集解析器", () => {
  it("解析基本 resource 块：字符串/数字/布尔属性", () => {
    const source = `
resource "huaweicloud_obs_bucket" "logs" {
  bucket        = "my-log-bucket"
  acl           = "private"
  storage_class = "STANDARD"
  multi_az      = true
  keep_days     = 7
}
`;
    const blocks = parseHcl(source);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("resource");
    expect(blocks[0].labels).toEqual(["huaweicloud_obs_bucket", "logs"]);
    expect(blocks[0].attributes.bucket).toBe("my-log-bucket");
    expect(blocks[0].attributes.acl).toBe("private");
    expect(blocks[0].attributes.multi_az).toBe(true);
    expect(blocks[0].attributes.keep_days).toBe(7);
  });

  it("多个同名嵌套块折叠为数组（安全组多条 rules）", () => {
    const source = `
resource "huaweicloud_networking_secgroup" "web" {
  name = "web-sg"
  rules {
    direction      = "ingress"
    protocol       = "tcp"
    port_range     = "80"
    cidr           = "0.0.0.0/0"
  }
  rules {
    direction      = "ingress"
    protocol       = "tcp"
    port_range     = "443"
    cidr           = "10.0.0.0/8"
  }
}
`;
    const blocks = parseHcl(source);
    const rules = blocks[0].attributes.rules;
    expect(Array.isArray(rules)).toBe(true);
    expect(rules).toHaveLength(2);
    expect(rules[0].port_range).toBe("80");
    expect(rules[1].cidr).toBe("10.0.0.0/8");
  });

  it("单个嵌套块解析为对象", () => {
    const source = `
resource "huaweicloud_obs_bucket" "encrypted" {
  bucket = "enc"
  server_side_encryption {
    algorithm = "kms"
    kms_key_id = "k-123"
  }
}
`;
    const blocks = parseHcl(source);
    const sse = blocks[0].attributes.server_side_encryption as Record<string, unknown>;
    expect(sse.algorithm).toBe("kms");
    expect(sse.kms_key_id).toBe("k-123");
  });

  it("list 与 map 值解析", () => {
    const source = `
resource "huaweicloud_rds_instance" "db" {
  name                = "db"
  availability_zone   = ["cn-north-4a", "cn-north-4b"]
  tags = {
    env = "prod"
    team = "platform"
  }
}
`;
    const blocks = parseHcl(source);
    const azs = blocks[0].attributes.availability_zone;
    expect(azs).toEqual(["cn-north-4a", "cn-north-4b"]);
    expect(blocks[0].attributes.tags).toEqual({ env: "prod", team: "platform" });
  });

  it("忽略 #、//、/* */ 三种注释", () => {
    const source = `
# 顶层注释
resource "huaweicloud_vpc" "main" {
  // 行注释
  name = "vpc-main"
  /* 块注释
     跨行 */
  cidr = "10.0.0.0/16"
}
`;
    const blocks = parseHcl(source);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].attributes.name).toBe("vpc-main");
    expect(blocks[0].attributes.cidr).toBe("10.0.0.0/16");
  });

  it("字符串插值 ${...} 原样保留", () => {
    const source = `
resource "huaweicloud_obs_bucket" "b" {
  bucket = "\${var.project}-logs"
}
`;
    const blocks = parseHcl(source);
    expect(blocks[0].attributes.bucket).toBe("${var.project}-logs");
  });

  it("引用表达式（var.x / resource.y.attr）保留为字符串", () => {
    const source = `
resource "huaweicloud_networking_secgroup_rule" "r" {
  security_group_id = huaweicloud_networking_secgroup.web.id
  remote_ip_prefix  = var.allowed_cidr
}
`;
    const blocks = parseHcl(source);
    expect(blocks[0].attributes.security_group_id).toBe("huaweicloud_networking_secgroup.web.id");
    expect(blocks[0].attributes.remote_ip_prefix).toBe("var.allowed_cidr");
  });

  it("跳过非 resource 顶层结构（variable/output/data/terraform/provider/locals）", () => {
    const source = `
variable "project" {
  default = "demo"
}
terraform {
  required_version = ">= 1.3"
}
provider "huaweicloud" {
  region = "cn-north-4"
}
data "huaweicloud_availability_zones" "this" {}
output "zone" {
  value = data.huaweicloud_availability_zones.this.names
}
resource "huaweicloud_obs_bucket" "b" {
  bucket = "only-resource"
}
`;
    const blocks = parseHcl(source);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].labels[0]).toBe("huaweicloud_obs_bucket");
  });

  it("resourceFromBlock：非 resource 顶层块被跳过（返回空列表）", () => {
    const blocks = parseHcl(`variable "x" { default = "1" }`);
    expect(blocks).toHaveLength(0);
  });

  it("resourceFromBlock：labels 不足返回 null", () => {
    const blocks = parseHcl(`resource "foo" {}`);
    expect(resourceFromBlock(blocks[0])).toBeNull();
  });

  it("空输入返回空数组", () => {
    expect(parseHcl("")).toEqual([]);
    expect(parseHcl("   \n  # 只有注释\n")).toEqual([]);
  });
});
