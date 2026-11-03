/**
 * 审查报告生成：Excel（xlsx）+ JSON issues 持久化 + HTML 摘要。
 */
import ExcelJS from "exceljs";
import * as path from "path";
import type { ScanResult } from "../scanning/security-matrix/types.js";
import { toService } from "../scanning/security-matrix/resource-mapper.js";
import { ensureDir, writeFile } from "../../shared/utils/file-utils.js";

/** 按服务分组统计问题。 */
export function aggregateByService(results: ScanResult[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of results) {
    const svc = toService(r.resourceType);
    map.set(svc, (map.get(svc) ?? 0) + 1);
  }
  return map;
}

/** 写 Excel 报告。 */
export async function writeExcelReport(
  results: ScanResult[],
  outputDir: string,
  projectName: string,
): Promise<string> {
  ensureDir(outputDir);
  const filePath = path.join(outputDir, "security-report.xlsx");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("安全审查结果");

  sheet.columns = [
    { header: "检查项", key: "check_id", width: 14 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "资源类型", key: "resourceType", width: 32 },
    { header: "资源名", key: "resourceName", width: 24 },
    { header: "问题描述", key: "issue", width: 60 },
    { header: "修复建议", key: "fix", width: 60 },
    { header: "文件", key: "path", width: 40 },
  ];

  for (const r of results) {
    sheet.addRow({
      check_id: r.check_id,
      priority: r.priority,
      resourceType: r.resourceType,
      resourceName: r.resourceName,
      issue: r.issue,
      fix: r.fix ?? "",
      path: r.path,
    });
  }

  // 表头样式
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2F6FED" },
  };

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

/** 写 HTML 摘要报告（含统计与按服务分组）。 */
export async function writeHtmlReport(
  results: ScanResult[],
  outputDir: string,
  projectName: string,
): Promise<string> {
  ensureDir(outputDir);
  const filePath = path.join(outputDir, "dashboard.html");

  const byService = aggregateByService(results);
  const rows = results
    .map(
      (r) => `<tr>
        <td>${r.check_id}</td>
        <td><span class="prio prio-${r.priority.toLowerCase()}">${r.priority}</span></td>
        <td>${r.resourceType}</td>
        <td>${r.resourceName}</td>
        <td>${r.issue}</td>
        <td>${r.fix ?? ""}</td>
        <td>${r.path}</td>
      </tr>`,
    )
    .join("\n");

  const serviceSummary = [...byService.entries()]
    .map(([svc, count]) => `<li><strong>${svc}</strong>: ${count} 项</li>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>安全审查报告 - ${projectName}</title>
<style>
  body { font-family: -apple-system, "PingFang SC", sans-serif; margin: 24px; color: #1f2328; }
  h1 { font-size: 20px; }
  .summary { display: flex; gap: 24px; margin: 16px 0; }
  .card { border: 1px solid #d0d7de; border-radius: 8px; padding: 12px 20px; }
  .card b { font-size: 24px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #d0d7de; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; }
  .prio { padding: 2px 8px; border-radius: 10px; color: #fff; font-size: 12px; }
  .prio-high { background: #d1242f; }
  .prio-medium { background: #d4a72c; }
  .prio-low { background: #57606a; }
</style>
</head>
<body>
  <h1>IaC 安全审查报告</h1>
  <p>项目: <strong>${projectName}</strong> · 扫描时间: ${new Date().toISOString()}</p>
  <div class="summary">
    <div class="card"><b>${results.length}</b><br>发现问题</div>
    <div class="card"><b>${results.filter((r) => r.priority === "HIGH").length}</b><br>高危</div>
    <div class="card"><b>${results.filter((r) => r.priority === "MEDIUM").length}</b><br>中危</div>
    <div class="card"><b>${results.filter((r) => r.priority === "LOW").length}</b><br>低危</div>
  </div>
  <h2>按服务分布</h2>
  <ul>${serviceSummary || "<li>无</li>"}</ul>
  <h2>明细</h2>
  <table>
    <thead><tr><th>检查项</th><th>优先级</th><th>资源类型</th><th>资源名</th><th>问题</th><th>修复建议</th><th>文件</th></tr></thead>
    <tbody>${rows || "<tr><td colspan='7'>未发现问题</td></tr>"}</tbody>
  </table>
</body>
</html>`;

  await writeFile(filePath, html, "utf-8");
  return filePath;
}

/** 写 issues.json（与 fix 命令共享的问题清单）。 */
export async function writeIssuesJson(results: ScanResult[], outputDir: string): Promise<string> {
  ensureDir(outputDir);
  const filePath = path.join(outputDir, "issues.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    issues: results.map((r) => ({ ...r, status: "Open" as const })),
  };
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
  return filePath;
}
