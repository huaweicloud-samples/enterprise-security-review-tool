/**
 * 文件系统工具。
 */
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

export const readFile = promisify(fs.readFile);
export const writeFile = promisify(fs.writeFile);
export const mkdir = promisify(fs.mkdir);

/** 确保目录存在（递归）。 */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/** 读取 JSON 文件，解析失败返回 null。 */
export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/** 写 JSON 文件（自动创建目录）。 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
  ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
