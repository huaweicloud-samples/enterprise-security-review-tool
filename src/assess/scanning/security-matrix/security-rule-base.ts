/**
 * 安全规则基类（适配统一资源模型）。
 *
 * 规则通过 `applicableResourceTypes` 声明可匹配的资源类型（如 "huaweicloud_obs_bucket"），
 * 引擎遍历模板资源后调用 `appliesTo()` 过滤，再执行 `evaluate()`。
 */
import type { IacResource } from "./iac-utils.js";
import type { ScanResult } from "./types.js";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export abstract class BaseRule {
  constructor(
    public id: string,
    public priority: Priority,
    public description: string,
    public applicableResourceTypes: string[],
  ) {}

  public appliesTo(resourceType: string): boolean {
    return this.applicableResourceTypes.includes(resourceType);
  }

  /** 对单个资源求值；命中返回 ScanResult，否则返回 null。 */
  public abstract evaluate(resource: IacResource, stackName: string): ScanResult | null;

  /** 生成扫描结果（统一出口）。 */
  protected createResult(
    resource: IacResource,
    stackName: string,
    issue: string,
    fix?: string,
  ): ScanResult {
    return {
      source: "security-matrix",
      path: stackName,
      resourceType: resource.type,
      resourceName: resource.name,
      issue,
      fix,
      priority: this.priority.toUpperCase(),
      check_id: this.id,
      status: "Open",
    };
  }

  /** 便捷工具：从嵌套块（如 ingress{}）或属性中按 key 取字符串值列表。 */
  protected stringValues(value: unknown): string[] {
    if (value === undefined || value === null) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
      return value.flatMap((v) => this.stringValues(v));
    }
    if (typeof value === "object") {
      return Object.values(value).flatMap((v) => this.stringValues(v));
    }
    return [String(value)];
  }
}
