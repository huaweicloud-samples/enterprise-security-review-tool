/**
 * 项目 IaC 文件发现。
 * 递归扫描项目目录下支持的 IaC 文件（.tf / .yaml / .yml / .json），
 * 排除常见无关目录。
 */
import { glob } from "glob";

const EXCLUDE_DIRS = [
  "node_modules",
  ".git",
  ".terraform",
  "build",
  "dist",
  "cdk.out",
  ".srt",
  "venv",
  ".venv",
];

export function discoverIacFiles(projectRoot: string): string[] {
  const patterns = ["**/*.tf", "**/*.yaml", "**/*.yml", "**/*.json"];
  const ignores = EXCLUDE_DIRS.map((d) => `**/${d}/**`);

  const files = glob.sync(patterns, {
    cwd: projectRoot,
    absolute: true,
    ignore: ignores,
    nodir: true,
  });

  // 过滤掉明显不属于 IaC 的 json（package.json / tsconfig 等），保留模板风格文件
  return files.filter((f) => {
    if (!f.endsWith(".json")) return true;
    return /template|stack|config|parameter/i.test(f);
  });
}
