/**
 * 统一 IaC 解析入口。
 *
 * 支持两类基础设施代码：
 *   - Terraform（.tf）——通过 hcl-parser 解析 `resource` 块（华为云 provider 资源）
 *   - 通用模板（.yaml/.yml/.json）——解析资源声明（Ref/Fn::Sub/Fn::FindInMap 求值）
 *
 * 两者归一化为统一资源模型，供规则引擎按资源类型字符串匹配。
 */
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { yamlParse } from "./cfn-yaml.js";
import { parseHcl, resourceFromBlock } from "./hcl-parser.js";

/** 统一资源模型 */
export interface IacResource {
  /** 资源类型：如 "huaweicloud_obs_bucket" */
  type: string;
  /** 逻辑名称：Terraform 资源名或 CFN 逻辑 ID */
  name: string;
  /** 展开后的属性（嵌套块合并为对象/数组） */
  attributes: Record<string, unknown>;
  /** CFN 特有元数据（保留以兼容） */
  metadata?: Record<string, unknown>;
}

export interface IacTemplate {
  format: "tf" | "cfn";
  Resources: Record<string, IacResource>;
  Parameters?: Record<string, { Default?: unknown }>;
  Mappings?: Record<string, Record<string, Record<string, unknown>>>;
}

const readFile = promisify(fs.readFile);

/** 按扩展名读取并解析 IaC 文件为统一模板。 */
export async function readIacFile(filePath: string): Promise<IacTemplate> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".tf") {
    const source = await readFile(filePath, "utf-8");
    return parseTerraform(source);
  }
  if (ext === ".yaml" || ext === ".yml" || ext === ".json") {
    const source = await readFile(filePath, "utf-8");
    return parseCloudFormation(source, ext);
  }
  throw new Error(`不支持的文件扩展名：${ext}（支持 .tf / .yaml / .yml / .json）`);
}

/** 解析 Terraform 源码 → 统一模板。 */
export function parseTerraform(source: string): IacTemplate {
  const blocks = parseHcl(source);
  const Resources: Record<string, IacResource> = {};

  for (const block of blocks) {
    const ref = resourceFromBlock(block);
    if (!ref) continue;
    const logicalId = `${ref.type}.${ref.name}`;
    const attributes: Record<string, unknown> = { ...block.attributes };
    // 嵌套块合并进属性（同名嵌套块已由解析器折叠）
    for (const child of block.blocks) {
      if (child.labels.length === 0) {
        attributes[child.type] = child.attributes;
      }
    }
    Resources[logicalId] = {
      type: ref.type,
      name: ref.name,
      attributes,
    };
  }

  return { format: "tf", Resources };
}

/** 解析 CloudFormation YAML/JSON → 统一模板（兼容源仓库语义）。 */
export function parseCloudFormation(source: string, ext: string): IacTemplate {
  const raw = ext === ".json" ? JSON.parse(source) : yamlParse(source);
  const template = parseCfnTemplate(raw) as Record<string, any>;
  const Resources: Record<string, IacResource> = {};

  if (template.Resources) {
    for (const [logicalId, res] of Object.entries<any>(template.Resources)) {
      Resources[logicalId] = {
        type: res.Type || "Unknown",
        name: logicalId,
        attributes: res.Properties || {},
        metadata: res.Metadata,
      };
    }
  }

  return {
    format: "cfn",
    Resources,
    Parameters: template.Parameters,
    Mappings: template.Mappings,
  };
}

/**
 * 解析模板内建函数与占位引用（兼容源仓库 cfn-utils 行为）。
 * 对 Ref / Fn::Sub / Fn::FindInMap 做通用求值，便于规则对属性做确定性匹配。
 */
function parseCfnTemplate(template: Record<string, any>): Record<string, any> {
  function replaceRecursively(val: any): any {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      if ("Ref" in val) {
        const ref = val.Ref;
        if (template.Parameters && ref in template.Parameters) {
          return template.Parameters[ref].Default ?? "DEFAULT";
        }
        if (template.Resources && ref in template.Resources) return ref;
        return "DEFAULT";
      }
      if ("Fn::Sub" in val) {
        const result = val["Fn::Sub"];
        return Array.isArray(result) ? result[0] : result;
      }
      if ("Fn::FindInMap" in val) {
        try {
          const [map, key, name] = val["Fn::FindInMap"];
          return template.Mappings?.[map]?.[key]?.[name];
        } catch {
          return "DEFAULT";
        }
      }
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) out[k] = replaceRecursively(v);
      return out;
    }
    if (Array.isArray(val)) return val.map(replaceRecursively);
    return val;
  }

  return replaceRecursively(template);
}
