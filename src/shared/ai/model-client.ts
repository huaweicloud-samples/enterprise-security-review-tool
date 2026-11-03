/**
 * 大模型客户端抽象接口。
 *
 * 默认实现为 MaaS 预置模型服务（OpenAI 兼容 chat/completions 协议）。只要实现本接口
 * 即可无缝替换模型后端（如私有化部署的推理服务）。
 */
export interface ModelClient {
  /**
   * 发送提示词，返回模型文本输出。
   * @param prompt 提示词
   * @param context 可选上下文（如被审查的 IaC 模板内容）
   * @param onProgress 可选进度回调（长耗时调用时周期性触发）
   */
  sendPrompt(prompt: string, context?: string, onProgress?: (message: string) => void): Promise<string>;

  /** 校验模型端点可达、凭据有效（返回是否可用）。 */
  validate(): Promise<boolean>;
}
