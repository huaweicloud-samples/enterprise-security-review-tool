/**
 * 安全矩阵扫描引擎。
 *
 * 遍历 IaC 模板中的全部资源，按资源类型匹配规则并执行求值，
 * 产出 ScanResult 列表（供报告生成与 issues.json 持久化）。
 */
import { readIacFile, type IacTemplate } from "./iac-utils.js";
import { allRules, buildRuleIndex } from "./rules/index.js";
import type { BaseRule } from "./security-rule-base.js";
import type { ScanResult } from "./types.js";
import { SrtLogger } from "../../../shared/logging/srt-logger.js";

export interface MatrixScanOptions {
  /** 自定义规则集（默认使用 allRules） */
  rules?: BaseRule[];
  /** 扫描路径，用于报告展示 */
  scanPath?: string;
}

export class SecurityMatrixScannerEngine {
  private ruleIndex: Map<string, BaseRule[]>;

  constructor(rules: BaseRule[] = allRules) {
    this.ruleIndex = buildRuleIndex(rules);
  }

  /** 扫描单个 IaC 文件。 */
  async scanFile(filePath: string, options: MatrixScanOptions = {}): Promise<ScanResult[]> {
    const template = await readIacFile(filePath);
    return this.scanTemplate(template, options.scanPath || filePath);
  }

  /** 对已解析模板执行规则扫描。 */
  scanTemplate(template: IacTemplate, stackName: string): ScanResult[] {
    const results: ScanResult[] = [];

    for (const [logicalId, resource] of Object.entries(template.Resources)) {
      const matchingRules = this.ruleIndex.get(resource.type);
      if (!matchingRules || matchingRules.length === 0) continue;

      for (const rule of matchingRules) {
        try {
          const result = rule.evaluate(resource, stackName);
          if (result) results.push(result);
        } catch (error) {
          SrtLogger.logError(`规则 ${rule.id} 求值失败（资源 ${logicalId}）`, error as Error);
        }
      }
    }

    return results;
  }

  /** 扫描目录下全部支持的 IaC 文件（.tf / .yaml / .yml / .json）。 */
  async scanProject(files: string[]): Promise<ScanResult[]> {
    const all: ScanResult[] = [];
    for (const file of files) {
      try {
        const results = await this.scanFile(file);
        all.push(...results);
      } catch (error) {
        SrtLogger.logError(`扫描文件失败: ${file}`, error as Error);
      }
    }
    return all;
  }
}
