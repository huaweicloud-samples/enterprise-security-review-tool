/**
 * srt config 命令：配置模型端点、模型 ID 与访问密钥。
 */
import { Command } from "commander";
import { ConfigManager, ModelValidator, ensureConfigFile } from "./config-manager.js";
import { ModelConfig } from "../shared/ai/model-config.js";

export function registerConfigCommand(program: Command): void {
  program
    .command("config")
    .description("配置大模型端点与访问密钥")
    .option("--endpoint <url>", "MaaS 预置模型服务 OpenAI 兼容端点 URL")
    .option("--model-id <id>", "模型名称（如 DeepSeek-V3.2 / GLM-4）")
    .option("--api-key <key>", "访问密钥（仅用于本次校验，不写入配置文件）")
    .action(async (options: { endpoint?: string; modelId?: string; apiKey?: string }) => {
      ensureConfigFile();
      await ConfigManager.configure({
        endpoint: options.endpoint,
        modelId: options.modelId,
        apiKey: options.apiKey,
      });

      console.log("配置已保存：");
      console.log(`  端点: ${ModelConfig.getEndpoint()}`);
      console.log(`  模型: ${ModelConfig.getModelId()}`);
      console.log("  密钥: 从环境变量 MODEL_API_KEY 注入（不落盘）");
      console.log("");

      const result = await ModelValidator.validate();
      console.log(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
    });
}
