/**
 * Terraform HCL 子集解析器。
 *
 * 面向安全审查场景，仅需解析 `resource "type" "name" { ... }` 顶层块及其属性：
 *   - 标量：字符串（"..."）、数字、布尔（true/false）
 *   - 集合：list `[...]`、map/object `{ ... }`
 *   - 嵌套块：`ingress { ... }`、`root_volume { ... }` 等
 *   - 表达式/引用（var.x、resource.name.attr、"${...}"）→ 原样保留为字符串，
 *     规则层可按前缀（如 0.0.0.0/0）或关键字（如 "SSH"）做启发式匹配
 *
 * 不处理：变量声明、data 源、函数调用求值、条件表达式、for 表达式。
 */
export interface HclAttribute {
  key: string;
  value: unknown;
}

export interface HclBlock {
  type: string;
  labels: string[];
  attributes: Record<string, unknown>;
  blocks: HclBlock[];
}

const TOKEN_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** 将源文件解析为 HCL 顶层块列表。 */
export function parseHcl(source: string): HclBlock[] {
  const tokens = tokenize(source);
  const blocks: HclBlock[] = [];
  let pos = 0;

  function parseBlock(expectedType?: string): HclBlock {
    const type = expectedType ?? stripQuotes(tokens[pos++]);
    const labels: string[] = [];
    while (tokens[pos] !== "{" && pos < tokens.length) {
      labels.push(stripQuotes(tokens[pos++]));
    }
    expect("{");
    const block: HclBlock = { type, labels, attributes: {}, blocks: [] };
    parseBody(block);
    expect("}");
    return block;
  }

  function parseBody(block: HclBlock): void {
    while (pos < tokens.length && tokens[pos] !== "}") {
      const key = tokens[pos];
      const next = tokens[pos + 1];
      if (next === "=") {
        // 属性赋值
        pos += 2;
        block.attributes[key] = parseValue();
      } else if (next === "{" || TOKEN_RE.test(key)) {
        // 嵌套块：key { ... } 或 "type" { ... }
        const child = parseBlock();
        block.blocks.push(child);
        // 同名嵌套块（如多个 ingress{}）折叠为对象或数组，便于规则遍历
        if (child.type in block.attributes) {
          const existing = block.attributes[child.type];
          if (Array.isArray(existing)) {
            existing.push(child.attributes);
          } else {
            block.attributes[child.type] = [existing, child.attributes];
          }
        } else {
          block.attributes[child.type] = child.attributes;
        }
      } else {
        // 未知语法，跳过该 token 防止死循环
        pos++;
      }
    }
  }

  function parseValue(): unknown {
    const token = tokens[pos];
    if (token === "[") {
      pos++;
      const items: unknown[] = [];
      while (pos < tokens.length && tokens[pos] !== "]") {
        items.push(parseValue());
        // 跳过元素间逗号分隔符
        if (tokens[pos] === ",") pos++;
      }
      expect("]");
      return items;
    }
    if (token === "{") {
      pos++;
      const map: Record<string, unknown> = {};
      while (pos < tokens.length && tokens[pos] !== "}") {
        const key = stripQuotes(tokens[pos]);
        pos++;
        expect("=");
        map[key] = parseValue();
      }
      expect("}");
      return map;
    }
    // 标量：字符串 / 数字 / 布尔 / 表达式
    pos++;
    return parseScalar(token);
  }

  function parseScalar(token: string): unknown {
    if (token === "true") return true;
    if (token === "false") return false;
    const unquoted = stripQuotes(token);
    if (unquoted !== token) return unquoted; // 原样字符串（含 ${} 表达式）
    const num = Number(token);
    if (!Number.isNaN(num) && token.trim() !== "") return num;
    return token; // 标识符引用如 var.x / resource.y.attr
  }

  function expect(t: string): void {
    if (tokens[pos] !== t) {
      throw new Error(`HCL 解析错误：期望 "${t}"，实际 "${tokens[pos]}"（位置 ${pos}）`);
    }
    pos++;
  }

  while (pos < tokens.length) {
    if (tokens[pos] === "resource") {
      pos++;
      blocks.push(parseBlock("resource"));
    } else {
      // 跳过非 resource 顶层结构（variable/output/data/terraform/locals 等）
      skipTopLevel();
    }
  }

  function skipTopLevel(): void {
    // 跳到该顶层块的 "{" 之后，再按大括号配平跳过整个块
    while (pos < tokens.length && tokens[pos] !== "{") pos++;
    if (pos >= tokens.length) return;
    let depth = 0;
    while (pos < tokens.length) {
      if (tokens[pos] === "{") depth++;
      else if (tokens[pos] === "}") {
        depth--;
        if (depth === 0) {
          pos++;
          return;
        }
      }
      pos++;
    }
  }

  return blocks;
}

/** 从 resource 块提取统一资源表示。 */
export function resourceFromBlock(block: HclBlock): { type: string; name: string } | null {
  if (block.type !== "resource" || block.labels.length < 2) return null;
  return { type: block.labels[0], name: block.labels[1] };
}

function stripQuotes(token: string): string {
  if (token.length >= 2 && (token.startsWith('"') && token.endsWith('"'))) {
    return token.slice(1, -1);
  }
  return token;
}

/** 简易分词：保留引号内内容为整体，其余按空白与括号分隔。 */
function tokenize(source: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"') {
      // 字符串字面量（含转义与 ${} 插值）
      let j = i + 1;
      let buf = '"';
      while (j < n) {
        if (source[j] === "\\" && j + 1 < n) {
          buf += source[j] + source[j + 1];
          j += 2;
          continue;
        }
        if (source[j] === '"') {
          buf += '"';
          j++;
          break;
        }
        buf += source[j];
        j++;
      }
      tokens.push(buf);
      i = j;
      continue;
    }
    if (c === "#") {
      // 行注释
      while (i < n && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      while (i < n && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if ("{}[]=,()".includes(c)) {
      tokens.push(c);
      i++;
      continue;
    }
    // 标识符 / 数字 / 引用链（a.b.c）
    let j = i;
    while (j < n && /[A-Za-z0-9_.\-]/.test(source[j])) j++;
    tokens.push(source.slice(i, j));
    i = j;
  }
  return tokens;
}
