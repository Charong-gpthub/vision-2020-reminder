# 20-20-20 Vision Reminder

Windows 桌面提醒器 MVP。目标是稳定执行 20-20-20 护眼规则，并保留当天可复盘的本地日志与统计。

## 1. 当前范围
- 平台：Windows 桌面
- 形态：Electron 本地桌面应用
- 数据：项目目录本地文件
- 提醒策略：启动后进入默认 20 分钟节拍，支持在主窗口修改间隔时间
- `SNOOZE` 语义：延后提醒真正弹出后，重置后续节拍锚点
- 主窗口关闭行为：最小化到任务栏，不退出进程

## 2. MVP 功能
- 可配置间隔提醒，默认 20 分钟
- 独立提醒窗，带 20 秒倒计时
- `完成` / `跳过` / `延后`
- 本地 JSONL 日志
- 当日完成数、跳过数、完成率
- 基础烟雾测试与单元测试

## 3. 重要运行约束
- 当前仓库没有自己的 `node_modules`。
- `package.json` 里的 `start` / `test` / `smoke` / `package` 依赖同级历史项目中的本地 Node/Electron 工具链：
  - `..\20260226work001\tools\node\node-v22.17.0-win-x64\`
  - `..\20260226work001\cognitive-training\node_modules\electron\`
- 当前终端环境默认存在 `ELECTRON_RUN_AS_NODE=1`。项目通过 [run-electron.cmd](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/scripts/run-electron.cmd) 和 [package-electron.cmd](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/scripts/package-electron.cmd) 显式清除此变量，否则 Electron 会退化成 Node 进程。

## 4. 快速命令
- 启动：`npm run start`
- 单元测试：`npm run test`
- 烟雾测试：`npm run smoke`
- 打包：`npm run package`

## 5. 目录结构
```text
vision-2020-reminder/
  main.js
  preload.js
  package.json
  src/
    domain/
    main/
    storage/
    ui/
  tests/
  scripts/
  docs/
```

## 6. 代码入口
- 应用启动入口：[main.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/main.js)
- 主流程编排：[app-controller.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/app-controller.js)
- 调度核心：[scheduler.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/scheduler.js)
- 配置存储：[config-store.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/storage/config-store.js)
- 日志存储：[log-store.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/storage/log-store.js)
- 主窗口 UI：[dashboard.html](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/dashboard.html)
- 提醒窗口 UI：[reminder.html](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/reminder.html)

## 7. 必须保持的行为约束
- 同一时刻只允许一个活动提醒窗。
- `DONE` / `SKIP` 都会从关闭提醒窗的时刻重新开始下一轮间隔倒计时。
- `SNOOZE` 不计入完成率分母。
- 提醒窗关闭按钮按 `SKIP` 处理，并写 `source=window_close`。
- 机器长时间挂起恢复后，只补弹一次 `OVERDUE_RESUME` 提醒，不回补多个历史提醒。

## 8. 推荐阅读顺序
1. [docs/INDEX.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/docs/INDEX.md)
2. [工作区项目管理](/c:/Users/Administrator/Documents/trae_projects/PROJECT_MANAGEMENT.md)
3. [docs/current-project-status.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/docs/current-project-status.md)
4. [docs/detailed-design.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/docs/detailed-design.md)
5. [docs/implementation-guide.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/docs/implementation-guide.md)
6. [docs/llm-handoff.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/docs/llm-handoff.md)

## 9. AI 维护入口
- 工作区总览：[PROJECT_MANAGEMENT.md](/c:/Users/Administrator/Documents/trae_projects/PROJECT_MANAGEMENT.md)
- 工作区撰写标准：[AI_WORKSPACE_WRITING_STANDARD.md](/c:/Users/Administrator/Documents/trae_projects/AI_WORKSPACE_WRITING_STANDARD.md)
- 当前项目现状：[docs/current-project-status.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/docs/current-project-status.md)
