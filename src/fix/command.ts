/**
 * srt fix 命令：逐个展示高危问题，支持抑制（Suppress）/跳过。
 * 问题清单来自 .srt/issues.json。
 */
import { Command } from "commander";
import * as path from "path";
import { readJson, writeJson } from "../shared/utils/file-utils.js";
import type { ScanResult } from "../assess/scanning/security-matrix/types.js";

export function registerFixCommand(program: Command): void {
  program
    .command("fix")
    .description("逐项处理安全审查发现的高危问题")
    .option("-p, --path <path>", "项目根目录（默认当前目录）", process.cwd())
    .action(async (options: { path: string }) => {
      const issuesPath = path.join(options.path, ".srt", "issues.json");
      const payload = await readJson<{ issues: ScanResult[] }>(issuesPath);

      if (!payload || payload.issues.length === 0) {
        console.log("未找到问题清单。请先运行 `srt assess`。");
        return;
      }

      const openIssues = payload.issues.filter((i) => i.status === "Open");
      const highRisk = openIssues.filter((i) => i.priority === "HIGH");

      console.log(`\n待处理高危问题: ${highRisk.length} 项\n`);

      for (const issue of highRisk) {
        console.log(`[${issue.check_id}] ${issue.resourceType}.${issue.resourceName}`);
        console.log(`  问题: ${issue.issue}`);
        console.log(`  建议: ${issue.fix ?? "无"}\n`);
      }

      // 非交互模式下仅列出问题；交互处理（抑制/修复）由后续版本扩展。
      console.log(
        "提示：完整交互式修复流程将在后续版本提供。当前可编辑 .srt/issues.json 将已确认项标记为 Suppressed。",
      );
    });
}
