/**
 * AI 威胁建模（可选增强）。
 * 调用大模型对扫描结果生成威胁模型与修复建议摘要。
 * 未配置模型密钥时优雅降级（跳过该步骤）。
 */
import { ModelConfig } from "../../shared/ai/model-config.js";
import { SrtLogger } from "../../shared/logging/srt-logger.js";
import type { ScanResult } from "../scanning/security-matrix/types.js";

export class ThreatModeler {
  /**
   * 对高危发现生成威胁模型与建议。
   * @returns 模型输出文本；未配置密钥时返回 null。
   */
  async generateThreatModel(results: ScanResult[], projectName: string): Promise<string | null> {
    if (!ModelConfig.isConfigured()) {
      SrtLogger.logInfo("未配置模型密钥，跳过威胁建模（可通过设置 MODEL_API_KEY 启用）");
      return null;
    }

    const highRisk = results.filter((r) => r.priority === "HIGH");
    if (highRisk.length === 0) {
      return "未发现高危问题，无需生成威胁模型。";
    }

    const { sendPrompt } = await import("../../shared/ai/maas-client.js");
    const prompt = `你是云安全专家。请对以下 IaC 安全审查结果生成威胁模型，包括：攻击路径、潜在影响、缓解建议。用中文输出，简洁分点。

项目：${projectName}
发现的高危问题：
${highRisk
  .map(
    (r, i) =>
      `${i + 1}. [${r.check_id}] ${r.resourceType}.${r.resourceName}: ${r.issue}（修复建议：${r.fix ?? "无"}）`,
  )
  .join("\n")}`;

    try {
      return await sendPrompt(prompt);
    } catch (error) {
      SrtLogger.logError("威胁建模调用失败", error as Error);
      return null;
    }
  }
}
