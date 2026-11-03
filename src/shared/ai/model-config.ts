/**
 * 大模型配置（端点 / API Key / 模型 ID）。
 *
 * 从环境变量读取，凭据不落盘：
 *   - MODEL_ENDPOINT   MaaS 预置模型服务 OpenAI 兼容端点，如 https://api.modelarts-maas.com/v2
 *   - MODEL_API_KEY    访问密钥（控制台「API Key 管理」创建，从 CI 密钥或本地环境注入）
 *   - MODEL_ID         模型名称，如 DeepSeek-V3.2 / GLM-4 / Qwen3-32B / openPangu-2.0-Flash（取订阅的 MaaS 模型名）
 */
export interface ModelSpec {
  id: string;
  name: string;
}

export class ModelConfig {
  private static instance: ModelConfig;
  private static errorMessage = "ModelConfig not initialized. Call ModelConfig.initialize() first.";

  static readonly DEFAULT_MODEL_ID = "DeepSeek-V3.2";
  static readonly DEFAULT_ENDPOINT = "https://api.modelarts-maas.com/v2";

  private endpoint: string;
  private apiKey: string;
  private modelId: string;

  private constructor(endpoint: string, apiKey: string, modelId: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  static initialize(endpoint?: string, apiKey?: string, modelId?: string): void {
    const resolvedApiKey = apiKey || process.env.MODEL_API_KEY || "";
    ModelConfig.instance = new ModelConfig(
      endpoint || process.env.MODEL_ENDPOINT || ModelConfig.DEFAULT_ENDPOINT,
      resolvedApiKey,
      modelId || process.env.MODEL_ID || ModelConfig.DEFAULT_MODEL_ID,
    );
  }

  static getEndpoint(): string {
    if (!ModelConfig.instance) throw new Error(ModelConfig.errorMessage);
    return ModelConfig.instance.endpoint;
  }

  static getApiKey(): string {
    if (!ModelConfig.instance) throw new Error(ModelConfig.errorMessage);
    return ModelConfig.instance.apiKey;
  }

  static getModelId(): string {
    if (!ModelConfig.instance) throw new Error(ModelConfig.errorMessage);
    return ModelConfig.instance.modelId;
  }

  static getModel(): ModelSpec {
    return { id: ModelConfig.getModelId(), name: ModelConfig.getModelId() };
  }

  static isConfigured(): boolean {
    if (!ModelConfig.instance) return false;
    return ModelConfig.instance.apiKey.length > 0;
  }
}
