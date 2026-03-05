# Runbook

## 服务/产物名称
- `vision-2020-reminder`

## 运行环境
- Windows 桌面
- Electron 28.3.3
- Node 22.17.0 本地工具链

## 启动/停止/重启
- 启动：`npm run start`
- 停止：主窗口点击“退出应用”或 `Ctrl+Q`
- 重启：退出后再次执行 `npm run start`

## 配置项
- `env`
- `profile`
- `intervalSec`：提醒间隔秒数，默认 `1200`，主窗口按“分钟”编辑
- `countdownSec`
- `snoozeDefaultSec`
- `soundEnabled`
- `mainWindow`
- `reminderWindow`

## 数据位置
- 开发模式：`vision-2020-reminder/data/`
- 烟雾测试：`VISION2020_DATA_DIR`
- 打包模式：可执行文件同级 `data/`

## 常见故障与处理
- 症状：Electron 启动后像普通 Node 进程一样失败
  - 检查 `ELECTRON_RUN_AS_NODE`
  - 必须通过 `scripts/run-electron.cmd` 启动
- 症状：提醒不弹出
  - 检查 `data/logs/YYYY-MM-DD.jsonl` 是否有 `REMINDER_SHOWN`
  - 检查主窗口是否仍在运行
- 症状：统计不更新
  - 检查是否只有 `SNOOZE`
  - 当前完成率只统计 `DONE` / `SKIP`
- 症状：配置异常
  - 删除 `data/config.json`
  - 重启应用，让默认配置重建

## 日志检查
- `SESSION_STARTED`：确认应用真正启动
- `REMINDER_SHOWN`：确认调度和窗口显示成功
- `ACTION`：确认用户操作或自动测试动作被记录

## 负责人/交付说明
- 当前仓库已具备本地开发、测试、烟雾验证能力
- 当前仓库仍依赖同级历史项目中的 Node/Electron 工具链
