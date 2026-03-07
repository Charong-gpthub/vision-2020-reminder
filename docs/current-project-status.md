---
doc_type: current_project_status
project_name: vision-2020-reminder
status: active
last_verified: 2026-03-07
primary_audience: human_and_ai
---

# 当前项目现状

## 1. 项目定位
- 项目名称：`vision-2020-reminder`
- 类型：Windows 桌面 Electron MVP
- 目标：执行 20-20-20 护眼提醒，并保留本地配置、日志和当日统计
- 仓库地址：`https://github.com/Charong-gpthub/vision-2020-reminder`

## 2. 当前功能范围
- 主窗口展示下一次提醒时间、剩余倒计时和今日统计
- 主窗口支持修改顶部启动文字，并写回本地配置
- 用户可修改提醒间隔，默认 20 分钟
- 到点弹出提醒窗口，包含 20 秒倒计时
- 用户可执行 `完成`、`跳过`、`延后`
- `SNOOZE` 弹出后会重置后续节拍锚点
- 数据写入项目目录下的 `data/config.json` 和 `data/logs/YYYY-MM-DD.jsonl`

## 3. 当前架构梳理
### 3.1 启动层
- `main.js`：Electron 入口
- `preload.js`：向渲染进程暴露最小 IPC API

### 3.2 主进程编排层
- `src/main/app-controller.js`：主流程协调、状态推进、日志写入触发
- `src/main/window-manager.js`：主窗口和提醒窗口创建、尺寸、定位与显示时机
- `src/main/ipc.js`：渲染进程与主进程的 IPC 通道

### 3.3 领域层
- `src/domain/scheduler.js`：提醒节拍、延后、恢复补弹、下一次提醒计算
- `src/domain/reminder-state.js`：提醒状态模型
- `src/domain/stats.js`：今日统计口径
- `src/domain/time.js`：时间格式和计算辅助

### 3.4 存储层
- `src/storage/config-store.js`：配置加载和保存
- `src/storage/log-store.js`：JSONL 事件日志

### 3.5 UI 层
- `src/ui/dashboard.*`：主窗口
- `src/ui/reminder.*`：提醒窗口

## 4. 当前关键行为补充说明
- 保存新的提醒间隔后，倒计时和下一次提醒时间从保存时刻开始重新计算。
- 点击 `完成` 或 `跳过` 后，下一轮提醒从点掉弹窗的时刻重新开始计时。
- 点击提醒窗口 `X` 或 `Alt+F4`，按 `SKIP` 处理。
- 主窗口关闭不退出，只最小化到任务栏。
- 机器睡眠或时间跳变后，只补弹一次 `OVERDUE_RESUME`，不会回补多个历史提醒。
- 提醒窗口已加入分辨率适配，目标是避免在不同屏幕下出现过小或裁切。

## 5. 当前测试覆盖
- `tests/config-store.test.js`：配置默认值回填
- `tests/scheduler.test.js`：调度逻辑
- `tests/log-store.test.js`：JSONL 日志写入
- `tests/stats.test.js`：今日统计口径
- `tests/app-controller.test.js`：主流程和窗口交互
- `tests/dashboard.test.js`：主窗口设置和前端交互
- `tests/window-manager.test.js`：提醒窗口显示时机、尺寸与分辨率适配
- `tests/reminder-layout.test.js`：提醒页面布局约束
- `tests/launcher-scripts.test.js`：启动和打包脚本路径

## 6. 当前运行方式
- 启动：`npm run start`
- 测试：`npm run test`
- 烟雾测试：`npm run smoke`
- 打包：`npm run package`

## 7. 当前外部依赖约束
- 仓库当前没有内置 `node_modules`
- `package.json` 脚本依赖同级历史项目中的 Node 与 Electron 工具链
- 启动脚本会显式清理 `ELECTRON_RUN_AS_NODE=1`
- 这意味着当前仓库不是完全自包含的开发环境

## 8. 当前文档体系
- `README.md`：总览和快速入口
- `c:\Users\Administrator\Documents\trae_projects\PROJECT_MANAGEMENT.md`：工作区级项目总览
- `c:\Users\Administrator\Documents\trae_projects\AI_WORKSPACE_WRITING_STANDARD.md`：工作区级 AI 撰写标准
- `docs/detailed-design.md`：设计边界和不变量
- `docs/implementation-guide.md`：实现组织方式
- `docs/llm-handoff.md`：面向其他大模型的最小上下文
- `docs/runbook.md`：运行与操作说明
- `docs/release-plan.md`：发布相关说明

## 9. 当前已完成的重要修正
- 支持主窗口配置启动文字，并持久化到本地配置
- 支持主窗口配置提醒间隔，默认 20 分钟
- 修正修改间隔后倒计时不重置的问题
- 修正 `DONE` / `SKIP` 后仍沿用旧节拍的问题
- 修正提醒窗口初次显示时的竞态问题
- 修正提醒窗口只显示上半截的问题
- 补充提醒窗口分辨率适配逻辑
- 修正桌面快捷方式启动链路

## 10. 当前已知问题和风险
- 待确认：极端 DPI 缩放下提醒窗口是否仍完全稳定
- 待确认：便携打包产物在全新 Windows 环境上的回归结果
- 推断：如果历史工具链目录被移动，当前脚本会失效

## 11. 建议的后续工作
- 建议：把 Node/Electron 依赖收敛到本仓库，降低环境耦合
- 建议：补更明确的打包后验收脚本
- 建议：为提醒窗口增加更系统的 DPI 与多显示器测试
- 建议：补充错误日志的现场排查说明
