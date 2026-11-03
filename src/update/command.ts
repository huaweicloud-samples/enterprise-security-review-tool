/**
 * srt update 命令：检查工具新版本。
 * 更新源可通过环境变量 SRT_UPDATE_URL 指定（默认指向制品发布页占位地址，
 * 正式发布后替换为实际制品仓地址）。
 */
import { Command } from "commander";
import * as path from "path";
import { readJson } from "../shared/utils/file-utils.js";

const DEFAULT_UPDATE_URL = "https://example.com/srt/releases/latest";

export function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("检查工具新版本")
    .action(async () => {
      const updateUrl = process.env.SRT_UPDATE_URL || DEFAULT_UPDATE_URL;
      const pkg = await readJson<{ version: string }>(
        path.join(process.cwd(), "package.json"),
      );
      const current = pkg?.version ?? "0.0.0";

      try {
        const res = await fetch(updateUrl, { headers: { "User-Agent": "srt-cli" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const latest = (await res.json()) as { tag_name?: string; html_url?: string };
        const tag = latest.tag_name ?? "未知";
        console.log(`当前版本: ${current}`);
        console.log(`最新版本: ${tag}`);
        console.log(`下载地址: ${latest.html_url ?? "—"}`);
      } catch (error) {
        console.log(`当前版本: ${current}`);
        console.log(`检查更新失败（${(error as Error).message}）。可通过 SRT_UPDATE_URL 指定更新源。`);
      }
    });
}
