/**
 * 模型配置管理（srt config 命令核心）。
 * 配置写入 <应用目录>/.srt/srtconfig.json；敏感字段（API Key）仅提示从环境变量注入。
 */
import * as path from "path";
import * as fs from "fs";
import { readJson, writeJson } from "../shared/utils/file-utils.js";
import { ModelConfig } from "../shared/ai/model-config.js";

export interface SrtConfigFile {
  MODEL_ENDPOINT?: string;
  MODEL_ID?: string;
  INSTALLATION_ID?: string;
  TELEMETRY_ENABLED?: boolean;
}

export class ConfigManager {
  private static readonly CONFIG_FILE = ".srt/srtconfig.json";

  static getConfigPath(): string {
    return path.join(process.cwd(), ConfigManager.CONFIG_FILE);
  }

  static async load(): Promise<SrtConfigFile> {
    return (await readJson<SrtConfigFile>(ConfigManager.getConfigPath())) ?? {};
  }

  static async save(config: SrtConfigFile): Promise<void> {
    await writeJson(ConfigManager.getConfigPath(), config);
  }

  static async configure(input: {
    endpoint?: string;
    modelId?: string;
    apiKey?: string;
  }): Promise<void> {
    const current = await ConfigManager.load();

    const endpoint = input.endpoint || current.MODEL_ENDPOINT || ModelConfig.DEFAULT_ENDPOINT;
    const modelId = input.modelId || current.MODEL_ID || ModelConfig.DEFAULT_MODEL_ID;

    await ConfigManager.save({
      ...current,
      MODEL_ENDPOINT: endpoint,
      MODEL_ID: modelId,
    });

    // API Key 不写入配置文件：运行时从环境变量 MODEL_API_KEY 读取。
    // 若交互式输入了 apiKey，仅校验后提示通过环境变量注入。
    if (input.apiKey) {
      ModelConfig.initialize(endpoint, input.apiKey, modelId);
    } else {
      ModelConfig.initialize(endpoint, undefined, modelId);
    }
  }
}

/** 校验模型连通性。 */
export class ModelValidator {
  static async validate(): Promise<{ ok: boolean; message: string }> {
    if (!ModelConfig.isConfigured()) {
      return {
        ok: false,
        message:
          "未配置模型访问密钥。请设置环境变量 MODEL_API_KEY，或运行 `srt config` 完成配置。",
      };
    }
    const { validateModelConnection } = await import("../shared/ai/maas-client.js");
    const ok = await validateModelConnection();
    return ok
      ? { ok: true, message: `模型连通性校验通过（${ModelConfig.getModelId()}）` }
      : {
          ok: false,
          message: "模型连通性校验失败，请检查 MODEL_ENDPOINT 与 MODEL_API_KEY。",
        };
  }
}

export function ensureConfigFile(): void {
  const dir = path.join(process.cwd(), ".srt");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
