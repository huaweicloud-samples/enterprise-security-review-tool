#!/usr/bin/env node
/**
 * IaC 安全审查工具（SRT）CLI 入口。
 *
 * 命令：
 *   srt [assess]  对基础设施代码执行安全审查（默认命令）
 *   srt fix       处理审查发现的高危问题
 *   srt config    配置大模型端点与访问密钥
 *   srt status    查看最近一次审查结果
 *   srt update    检查工具新版本
 */
import { Command } from "commander";
import { registerAssessCommand } from "./assess/command.js";
import { registerFixCommand } from "./fix/command.js";
import { registerConfigCommand } from "./config/command.js";
import { registerStatusCommand } from "./status/command.js";
import { registerUpdateCommand } from "./update/command.js";
import { ModelConfig } from "./shared/ai/model-config.js";
import { ConfigManager } from "./config/config-manager.js";

async function main(): Promise<void> {
  // 启动时按配置文件初始化模型配置（密钥从环境变量注入）
  const saved = await ConfigManager.load();
  ModelConfig.initialize(saved.MODEL_ENDPOINT, undefined, saved.MODEL_ID);

  const program = new Command();
  program
    .name("srt")
    .description("IaC 安全审查工具（华为云 Terraform）")
    .version("1.0.0");

  registerAssessCommand(program);
  registerFixCommand(program);
  registerConfigCommand(program);
  registerStatusCommand(program);
  registerUpdateCommand(program);

  // 无子命令时默认执行 assess
  const args = process.argv.slice(2);
  if (args.length === 0 || ["-h", "--help", "-v", "--version"].includes(args[0])) {
    if (args.length === 0) {
      program.parse(["node", "srt", "assess"]);
    } else {
      program.parse();
    }
  } else {
    program.parse();
  }
}

main().catch((error) => {
  console.error(`执行失败: ${(error as Error).message}`);
  process.exitCode = 1;
});
