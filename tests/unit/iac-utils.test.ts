import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseTerraform, parseCloudFormation, readIacFile } from "../../src/assess/scanning/security-matrix/iac-utils.js";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "srt-iac-utils-test-"));

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("parseTerraform：Terraform → 统一模板", () => {
  it("提取 resource 为统一资源模型（logicalId = type.name）", () => {
    const source = `
resource "huaweicloud_obs_bucket" "logs" {
  bucket = "logs"
}
resource "huaweicloud_networking_secgroup" "web" {
  name = "web"
}
`;
    const template = parseTerraform(source);
    expect(template.format).toBe("tf");
    const ids = Object.keys(template.Resources);
    expect(ids).toContain("huaweicloud_obs_bucket.logs");
    expect(ids).toContain("huaweicloud_networking_secgroup.web");
    expect(template.Resources["huaweicloud_obs_bucket.logs"]).toMatchObject({
      type: "huaweicloud_obs_bucket",
      name: "logs",
    });
  });

  it("嵌套块合并进 attributes（供规则直接读取）", () => {
    const source = `
resource "huaweicloud_rds_instance" "db" {
  name = "db"
  backup_strategy {
    start_time = "01:00-02:00"
    keep_days  = 7
  }
}
`;
    const template = parseTerraform(source);
    const res = template.Resources["huaweicloud_rds_instance.db"];
    expect(res.attributes.backup_strategy).toEqual({ start_time: "01:00-02:00", keep_days: 7 });
  });
});

describe("parseCloudFormation：CFN 模板 → 统一模板（兼容模式）", () => {
  it("解析 YAML 模板（Fn::Sub 原样保留，不做上游伪参数替换）", () => {
    const source = `
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "\${AWS::StackName}-logs"
      AccessControl: Private
`;
    const template = parseCloudFormation(source, ".yaml");
    expect(template.format).toBe("cfn");
    const bucket = template.Resources.Bucket;
    expect(bucket.type).toBe("AWS::S3::Bucket");
    expect(bucket.attributes.AccessControl).toBe("Private");
    // 本仓库为华为云最佳实践产物，不解析上游伪参数；Fn::Sub 占位原样保留
    expect(bucket.attributes.BucketName).toBe("${AWS::StackName}-logs");
  });

  it("解析 JSON 模板（Ref 未知伪参数回退 DEFAULT）", () => {
    const source = JSON.stringify({
      Resources: {
        Vpc: {
          Type: "AWS::EC2::VPC",
          Properties: {
            CidrBlock: "10.0.0.0/16",
            Region: { Ref: "AWS::Region" },
          },
        },
      },
    });
    const template = parseCloudFormation(source, ".json");
    const vpc = template.Resources.Vpc;
    expect(vpc.attributes.CidrBlock).toBe("10.0.0.0/16");
    // 上游伪参数（AWS::Region）非本仓库语义，Ref 未知引用统一回退 DEFAULT
    expect(vpc.attributes.Region).toBe("DEFAULT");
  });

  it("Ref 参数引用回退到 Parameters.Default", () => {
    const source = JSON.stringify({
      Parameters: {
        Env: { Type: "String", Default: "prod" },
      },
      Resources: {
        Bucket: {
          Type: "AWS::S3::Bucket",
          Properties: { Env: { Ref: "Env" } },
        },
      },
    });
    const template = parseCloudFormation(source, ".json");
    expect(template.Resources.Bucket.attributes.Env).toBe("prod");
  });
});

describe("readIacFile：按扩展名分发", () => {
  it(".tf 走 Terraform 解析", async () => {
    const file = path.join(tmpDir, "main.tf");
    fs.writeFileSync(file, `resource "huaweicloud_vpc" "main" { name = "v" }`);
    const template = await readIacFile(file);
    expect(template.format).toBe("tf");
    expect(template.Resources["huaweicloud_vpc.main"]).toBeDefined();
  });

  it(".json 走 CFN 解析", async () => {
    const file = path.join(tmpDir, "template.json");
    fs.writeFileSync(
      file,
      JSON.stringify({ Resources: { Fn: { Type: "AWS::Lambda::Function", Properties: { Handler: "index.h" } } } }),
    );
    const template = await readIacFile(file);
    expect(template.format).toBe("cfn");
    expect(template.Resources.Fn.attributes.Handler).toBe("index.h");
  });

  it("不支持的扩展名抛错", async () => {
    const file = path.join(tmpDir, "notes.txt");
    fs.writeFileSync(file, "hello");
    await expect(readIacFile(file)).rejects.toThrow(/不支持的文件扩展名/);
  });
});
