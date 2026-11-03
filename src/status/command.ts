/**
 * srt status 命令：展示最近一次审查结果摘要并打开 HTML 报告。
 */
import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import { exec } from "node:child_process";
import { readJson } from "../shared/utils/file-utils.js";

function openInBrowser(filePath: string): void {
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? `open "${filePath}"` : platform === "win32" ? `start "" "${filePath}"` : `xdg-open "${filePath}"`;
  // 非阻塞执行
  exec(cmd, () => {});
}

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("查看最近一次安全审查结果摘要")
    .option("-p, --path <path>", "项目根目录（默认当前目录）", process.cwd())
    .option("--no-open", "不自动打开 HTML 报告")
    .action(async (options: { path: string; open?: boolean }) => {
      const srtDir = path.join(options.path, ".srt");
      const issuesPath = path.join(srtDir, "issues.json");
      const payload = await readJson<{ generatedAt: string; issues: { priority: string }[] }>(
        issuesPath,
      );

      if (!payload) {
        console.log("尚未生成审查报告。请先运行 `srt assess`。");
        return;
      }

      const issues = payload.issues ?? [];
      const high = issues.filter((i) => i.priority === "HIGH").length;
      const medium = issues.filter((i) => i.priority === "MEDIUM").length;
      const low = issues.filter((i) => i.priority === "LOW").length;

      console.log(`\n最近审查时间: ${payload.generatedAt}`);
      console.log(`  高危: ${high} 项`);
      console.log(`  中危: ${medium} 项`);
      console.log(`  低危: ${low} 项`);

      const dashboard = path.join(srtDir, "dashboard.html");
      if (options.open !== false && fs.existsSync(dashboard)) {
        openInBrowser(dashboard);
        console.log(`已打开报告: ${dashboard}`);
      }
    });
}
