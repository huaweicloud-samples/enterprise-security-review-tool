# 部署指导�?

## 1. 前置条件

| �? | 要求 | 说明 |
|---|---|---|
| 运行�? | Node.js �? 22 | 使用 `npx` 运行测试/构建；也�? `npm run build` 后直接运行编译产�? |
| 包管理器 | npm �? 10 | �? Node 自带 |
| 模型密钥（可选） | MaaS 预置模型服务 API Key | 用于威胁建模 / 修复建议增强；不配置仅损�? AI 增强，确定性扫描不受影�? |
| 网络 | 可访问模型推理端�? | 默认 `https://api.modelarts-maas.com/v2`，可配置 |

## 2. 安装

```bash
# 进入工具目录
cd iac-security-review-tool

# 安装依赖
npm install

# 构建
npm run build

# 全局软链（可选，便于随处调用�?
npm link
```

验证安装�?

```bash
srt --help
# 或未 link �?
node build/index.js --help
```

预期输出包含：`assess` / `fix` / `config` / `status` / `update` 五个子命令�?

## 3. 配置模型（可选）

方式一：环境变量注入（推荐，CI 友好，凭据不落盘�?

```bash
export MODEL_ENDPOINT="https://api.modelarts-maas.com/v2"
export MODEL_API_KEY="<YOUR_API_KEY>"
export MODEL_ID="DeepSeek-V3.2"  # 默认；亦可填 GLM-4 / Qwen3-32B 等订阅内预置模型
```

方式二：`srt config` 交互配置（API Key 仅用于校验，不写入配置文件）

```bash
srt config --endpoint "https://api.modelarts-maas.com/v2" \
           --model-id "DeepSeek-V3.2" \  # Ĭ�ϣ������ GLM-4 / Qwen3-32B ��
           --api-key "<YOUR_API_KEY>"
```

> 配置写入 `<项目>/.srt/srtconfig.json`；`--api-key` 只触发一次连通性校验，之后仍需通过 `MODEL_API_KEY` 环境变量注入�?

## 4. 运行审查

```bash
# 审查当前目录下的 IaC 文件
srt assess

# 审查指定目录
srt assess -p ./infra

# 跳过 AI 增强（离线环�? / 无密钥时�?
srt assess -p ./infra --no-threat-models
```

### 预期输出

```
[安全矩阵扫描] 发现 12 �? IaC 文件
  命中规则 7 项：
    HIGH   3 �?
    MEDIUM 3 �?
    LOW    1 �?
报告已生成：.srt/security-report.xlsx
```

## 5. 报告产物

| 文件 | 说明 |
|---|---|
| `.srt/security-report.xlsx` | Excel 报告：按服务分组的全部问题与修复建议 |
| `.srt/dashboard.html` | 可视化仪表盘：优先级分布 + 按服务统�? |
| `.srt/issues.json` | 机器可读问题清单（Open 状态），供 CI 断言�? `srt fix` / `srt status` 使用 |

## 6. CI 集成示例（GitLab CI�?

```yaml
security-scan:
  stage: test
  image: node:22
  script:
    - cd iac-security-review-tool && npm ci && npm run build
    - node build/index.js assess -p ${CI_PROJECT_DIR}/infra --no-threat-models
    # 高危�? > 0 即失败（示例�?
    - node -e '
        const issues = require("./.srt/issues.json");
        const high = issues.issues.filter(i => i.priority === "HIGH").length;
        process.exit(high > 0 ? 1 : 0);'
  artifacts:
    paths:
      - .srt/
```

## 7. 其他命令

| 命令 | 用�? |
|---|---|
| `srt status` | 展示最近一次审查分级摘要，并打开 HTML 报告（`--no-open` 禁止自动打开�? |
| `srt fix` | 列出 Open 状态高危问题清�? |
| `srt update` | 检查工具新版本（更新源可用环境变量 `SRT_UPDATE_URL` 覆盖，如切换到内网制品库�? |

## 8. 故障排查

| 现象 | 处理 |
|---|---|
| 扫描结果为空 | 确认目标目录存在 `.tf` / `.yaml` / `.yml` / `.json` 文件；JSON 需�? template/stack 等关键字 |
| 威胁建模未执�? | 检�? `MODEL_API_KEY` 是否已设置；`srt config` 校验连通性；确认端点/模型 ID 正确 |
| 解析报错 | HCL 解析器支持资源块子集；`data` / `variable` / 函数表达式不会参与规则匹配，属预期行�? |
| 报告未生�? | 检查工作目录写权限；报告落�? `<项目>/.srt/` �? |
