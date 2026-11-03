import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // 源码内 import 使用 .js 后缀（nodenext 约定），测试运行时需映射到 .ts 源文件
    extensionAlias: {
      ".js": [".js", ".ts"],
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "build", "aws"],
  },
});
