/**
 * assess 流程编排：
 *   1. 发现项目 IaC 文件
 *   2. 矩阵规则扫描（确定性引擎）
 *   3. AI 威胁建模（可选）
 *   4. 生成 Excel / HTML / issues.json 报告
 */
import * as path from "path";
import { discoverIacFiles } from "../shared/project/project-context.js";
import { SecurityMatrixScannerEngine } from "./scanning/security-matrix/matrix-scanner-engine.js";
import { writeExcelReport, writeHtmlReport, writeIssuesJson } from "./reporting/report-generator.js";
import { ThreatModeler } from "./template-processing/threat-modeler.js";
import { ensureDir } from "../shared/utils/file-utils.js";
import type { ScanResult } from "./scanning/security-matrix/types.js";

export interface AssessOptions {
  projectPath: string;
  skipThreatModels?: boolean;
  skipDiagrams?: boolean;
  outputDir?: string;
}

export interface AssessOutcome {
  projectName: string;
  scannedFiles: number;
  results: ScanResult[];
  reports: { excel?: string; html?: string; issuesJson: string; threatModel?: string };
}

export class AssessCoordinator {
  async run(options: AssessOptions): Promise<AssessOutcome> {
    const projectPath = path.resolve(options.projectPath);
    const projectName = path.basename(projectPath);
    const outputDir = options.outputDir || path.join(projectPath, ".srt");
    ensureDir(outputDir);

    console.log(`\n=== 开始安全审查：${projectName} ===\n`);

    // 1. 发现 IaC 文件
    const files = discoverIacFiles(projectPath);
    console.log(`发现 IaC 文件: ${files.length} 个`);
    if (files.length === 0) {
      console.log("未找到 .tf/.yaml/.yml 基础设施代码文件。");
    }

    // 2. 矩阵扫描
    const engine = new SecurityMatrixScannerEngine();
    const results = await engine.scanProject(files);
    const high = results.filter((r) => r.priority === "HIGH").length;
    console.log(`\n扫描完成: 共 ${results.length} 项发现（高危 ${high} 项）\n`);

    // 3. AI 威胁建模
    let threatModel: string | null = null;
    if (!options.skipThreatModels) {
      const modeler = new ThreatModeler();
      threatModel = await modeler.generateThreatModel(results, projectName);
      if (threatModel) {
        const tmPath = path.join(outputDir, "threat-model.md");
        const { writeFile } = await import("../shared/utils/file-utils.js");
        await writeFile(tmPath, threatModel, "utf-8");
        console.log("威胁模型已生成 → .srt/threat-model.md");
      }
    }

    // 4. 报告
    const excel = await writeExcelReport(results, outputDir, projectName);
    const html = await writeHtmlReport(results, outputDir, projectName);
    const issuesJson = await writeIssuesJson(results, outputDir);

    console.log("\n报告已生成：");
    console.log(`  Excel: ${excel}`);
    console.log(`  HTML:  ${html}`);
    console.log(`  问题:  ${issuesJson}`);
    if (threatModel) console.log(`  威胁模型: ${path.join(outputDir, "threat-model.md")}`);

    return {
      projectName,
      scannedFiles: files.length,
      results,
      reports: { excel, html, issuesJson, threatModel: threatModel ?? undefined },
    };
  }
}
