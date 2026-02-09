# 四川麻将运势（Vue 3 + Vite）

基于生日八字、五行生克、当日黄历（建除）推演四川麻将三门局势，并给出可读性更好的策略建议。

## 功能概览

- 手气指数：`基础盘势 + 八字修正 + 当日气场`
- 三门局势：旺门 / 平门 / 忌门（万、条、筒）
- 八字与五行：保留专业字段，同时做通俗解释
- 今日黄历：宜、忌、吉时、忌时（与麻将信息分区展示）
- 一键截图分享、复制结果
- 同输入同日期结果稳定可复现

## 评分逻辑

评分规则已配置化，位于：`src/utils/fortune/scoring_rules.js`

- 基础盘势区间：`58 ~ 72`
- 八字修正：季节、强弱、用神喜忌、流年流月
- 当日气场：由建除、宜忌、吉时推导后按系数折算
- 最终分数：钳制到 `0 ~ 100`

核心计算入口：`src/utils/fortune_optimized.js`

## 代码结构（优化后）

- `src/App.vue`：页面装配
- `src/composables/useFortuneState.js`：页面状态与交互逻辑
- `src/components/FortuneHeader.vue`：顶部品牌与主标题
- `src/components/FortuneForm.vue`：输入卡片
- `src/components/FortuneResult.vue`：结果展示卡片
- `src/assets/fortune-page.css`：页面样式（含响应式）
- `src/utils/fortune/scoring_rules.js`：评分权重配置
- `src/utils/fortune/sanitize_result.js`：结果兜底清洗，避免 `undefined/null` 污染展示

## 开发与校验

```bash
npm install
npm run dev
```

```bash
npm run check
```

拆分检查命令：

```bash
npm run check:vue
npm run check:fortune
```

## 部署

```bash
git add .
git commit -m "feat: optimize ui and fortune engine"
git push origin main
```

## 常见问题

### 1) `vite` 不是内部或外部命令

依赖未安装或 `node_modules` 不完整：

```bash
npm install
npm run dev
```

### 2) `vite build` 报 `spawn EPERM`

通常是本机安全策略或权限导致 `esbuild` 子进程无法拉起。

建议依次检查：

1. 关闭占用该目录的安全软件实时拦截
2. 终端使用管理员权限重试
3. 删除 `node_modules` 与 `package-lock.json` 后重新安装
4. 确认项目路径有可执行权限且未被系统策略限制

### 3) `git push` 失败 `Recv failure: Connection was reset`

多为网络链路中断，可直接重试：

```bash
git push origin main
```

若仍失败，建议切换网络或代理后再试。
