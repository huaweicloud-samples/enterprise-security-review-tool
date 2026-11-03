import { ModelConfig } from "./model-config.js";
import type { ModelClient } from "./model-client.js";
import { SrtLogger } from "../logging/srt-logger.js";

/**
 * MaaS 模型客户端（OpenAI 兼容实现）。
 *
 * 通过标准 OpenAI Chat Completions 协议调用华为云 ModelArts Studio MaaS 预置模型服务：
 *   POST {endpoint}/chat/completions
 *   Authorization: Bearer {apiKey}
 *
 * 不使用任何平台专属 SDK，保证可移植到任意 OpenAI 兼容服务。
 *
 * MaaS 预置服务统一接入点（region-independent）：
 *   https://api.modelarts-maas.com/v2/chat/completions
 * 控制台开通路径：ModelArts → 模型推理 → 在线推理 → 预置服务（须控制台勾选服务声明并领取免费额度）。
 * API Key 在「API Key 管理」创建，仅显示一次，从环境变量 MODEL_API_KEY 注入，不落盘。
 */
export class MaasModelClient implements ModelClient {
  async sendPrompt(
    prompt: string,
    context?: string,
    onProgress?: (message: string) => void,
  ): Promise<string> {
    const endpoint = ModelConfig.getEndpoint();
    const apiKey = ModelConfig.getApiKey();
    const modelId = ModelConfig.getModelId();

    if (!apiKey) {
      throw new Error(
        "未配置模型访问密钥：请设置环境变量 MODEL_API_KEY（或在 `srt config` 中配置）。",
      );
    }

    const userContent = context ? `${prompt}\n\n## IaC 模板\n\`\`\`\n${context}\n\`\`\`` : prompt;

    const progressTimer = onProgress
      ? setInterval(() => onProgress("  正在调用模型分析..."), 15000)
      : null;

    try {
      const response = await fetch(`${endpoint.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: userContent }],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`模型调用失败 HTTP ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? "";
    } catch (error) {
      SrtLogger.logError("模型调用失败", error as Error, {
        endpoint,
        modelId,
        promptLength: prompt.length,
        contextLength: context?.length || 0,
      });
      throw error;
    } finally {
      if (progressTimer) clearInterval(progressTimer);
    }
  }

  async validate(): Promise<boolean> {
    try {
      const result = await this.sendPrompt("请回复 OK。");
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }
}

/** 模块级单例，保持与源仓库 `sendPrompt` 同签名调用方兼容。 */
let client: ModelClient | null = null;

function getClient(): ModelClient {
  if (!client) client = new MaasModelClient();
  return client;
}

export async function sendPrompt(
  prompt: string,
  context?: string,
  onProgress?: (message: string) => void,
): Promise<string> {
  return getClient().sendPrompt(prompt, context, onProgress);
}

export async function validateModelConnection(): Promise<boolean> {
  return getClient().validate();
}
