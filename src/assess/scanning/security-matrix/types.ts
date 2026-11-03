/** 扫描结果类型（与报告生成、issues.json 持久化共用）。 */

export interface ScanResult {
  source: string;
  path: string;
  resourceType: string;
  resourceName: string;
  issue: string;
  fix?: string;
  priority: string;
  check_id: string;
  status: "Open" | "Suppressed" | "Resolved";
  cdkPath?: string;
  isCustomResource?: boolean;
}
