/**
 * srt assess 命令：对项目执行安全审查。
 */
import { Command } from "commander";
import { AssessCoordinator } from "./coordinator.js";

export function registerAssessCommand(program: Command): void {
  program
    .command("assess")
    .description("对华为云 Terraform 基础设施代码执行安全审查")
    .option("-p, --path <path>", "项目根目录（默认当前目录）", process.cwd())
    .option("--no-threat-models", "跳过大模型威胁建模（加快审查）")
    .option("--no-diagrams", "跳过图表生成（当前版本默认不生成，保留兼容）")
    .action(async (options: { path: string; threatModels?: boolean; diagrams?: boolean }) => {
      const coordinator = new AssessCoordinator();
      await coordinator.run({
        projectPath: options.path,
        skipThreatModels: options.threatModels === false,
        skipDiagrams: options.diagrams === false,
      });
    });
}
