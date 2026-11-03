/**
 * CFN YAML 解析（兼容 yaml-cfn 的 short-form intrinsic 标签）。
 * 使用 js-yaml 并注册 !Ref / !Sub / !GetAtt / !Join 等标签。
 */
import * as fs from "fs";
import { promisify } from "util";
import yaml from "js-yaml";

const readFile = promisify(fs.readFile);

const SHORT_FORM_TAGS: Record<string, string> = {
  "!Ref": "Ref",
  "!Sub": "Fn::Sub",
  "!GetAtt": "Fn::GetAtt",
  "!Join": "Fn::Join",
  "!Split": "Fn::Split",
  "!Select": "Fn::Select",
  "!FindInMap": "Fn::FindInMap",
  "!ImportValue": "Fn::ImportValue",
  "!Base64": "Fn::Base64",
  "!Cidr": "Fn::Cidr",
  "!GetAZs": "Fn::GetAZs",
  "!If": "Fn::If",
  "!And": "Fn::And",
  "!Or": "Fn::Or",
  "!Not": "Fn::Not",
  "!Equals": "Fn::Equals",
  "!Condition": "Condition",
};

const cfnSchema = yaml.DEFAULT_SCHEMA.extend(
  Object.entries(SHORT_FORM_TAGS).map(
    ([tag, key]) =>
      new yaml.Type(tag, {
        kind: "scalar" as const,
        construct: (data: string) => ({ [key]: data }),
        predicate: () => false,
        represent: () => "",
      }),
  ),
);

export async function readCfnYaml(filePath: string): Promise<unknown> {
  const source = await readFile(filePath, "utf-8");
  return yamlParse(source);
}

export function yamlParse(source: string): unknown {
  return yaml.load(source, { schema: cfnSchema });
}
