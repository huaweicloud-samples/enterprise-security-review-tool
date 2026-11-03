import { describe, it, expect } from "vitest";
import { SecurityMatrixScannerEngine } from "../../src/assess/scanning/security-matrix/matrix-scanner-engine.js";
import { parseTerraform } from "../../src/assess/scanning/security-matrix/iac-utils.js";

describe("扫描引擎端到端：Terraform → 规则求值 → ScanResult", () => {
  const engine = new SecurityMatrixScannerEngine();

  const source = `
resource "huaweicloud_obs_bucket" "logs" {
  bucket = "logs"
  acl    = "public-read"
}

resource "huaweicloud_networking_secgroup" "web" {
  name = "web-sg"
  rules {
    direction  = "ingress"
    protocol   = "tcp"
    port_range = "22"
    cidr       = "0.0.0.0/0"
  }
}

resource "huaweicloud_rds_instance" "db" {
  name = "db"
}

resource "huaweicloud_cce_cluster" "prod" {
  name = "prod"
}

resource "huaweicloud_fgs_function" "handler" {
  name          = "handler"
  env_variables = {
    API_KEY = "sk-12345678-ab"
  }
}
`;

  it("全链路：扫描模板命中 7 条规则（OBS-001/002、SEC-001/002、RDS-002、CCE-002、FGS-001）", () => {
    const template = parseTerraform(source);
    const results = engine.scanTemplate(template, "demo-stack");

    const ids = results.map((r) => r.check_id).sort();
    // OBS-001（无加密）+ OBS-002（acl public-read）+ SEC-001（0.0.0.0/0 入站）
    // + SEC-002（22 端口全网）+ RDS-002（无备份）+ CCE-002（无审计日志）+ FGS-001（明文密钥）
    expect(ids).toContain("OBS-001");
    expect(ids).toContain("OBS-002");
    expect(ids).toContain("SEC-001");
    expect(ids).toContain("SEC-002");
    expect(ids).toContain("RDS-002");
    expect(ids).toContain("CCE-002");
    expect(ids).toContain("FGS-001");
    expect(ids).toHaveLength(7);
    expect(results.every((r) => r.status === "Open")).toBe(true);
    expect(results.every((r) => r.path === "demo-stack")).toBe(true);
  });

  it("规则索引按资源类型匹配：不适用类型不产生结果", () => {
    const template = parseTerraform(`
resource "huaweicloud_vpc" "main" {
  name = "vpc"
  cidr = "10.0.0.0/16"
}
`);
    const results = engine.scanTemplate(template, "vpc-only");
    // VPC-001 只适用于 huaweicloud_vpc_eip，不适用于 huaweicloud_vpc
    expect(results).toHaveLength(0);
  });
});
