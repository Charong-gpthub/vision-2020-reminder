# 详细设计说明

## 1. 目标
- 用最少交互成本执行 20-20-20 护眼提醒。
- 日志必须可审计，统计必须可复盘。
- MVP 优先稳定、可用、可解释，不追求复杂智能。

## 2. 非目标
- 不做键鼠活跃检测。
- 不做会议识别或专注模式识别。
- 不做云同步。
- 不做多端协同。
- 不做复杂托盘、开机自启、Toast 通知。

## 3. 体系结构
系统分 4 层：

### 3.1 Domain 层
- 负责业务语义和纯逻辑。
- 不依赖 Electron。
- 关键文件：
  - [scheduler.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/scheduler.js)
  - [stats.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/stats.js)
  - [time.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/time.js)
  - [reminder-state.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/reminder-state.js)

### 3.2 Storage 层
- 负责持久化，不承载业务决策。
- 关键文件：
  - [config-store.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/storage/config-store.js)
  - [log-store.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/storage/log-store.js)

### 3.3 Main Process 层
- 负责把 Domain、Storage 和 Electron 窗口系统粘合在一起。
- 关键文件：
  - [main.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/main.js)
  - [app-controller.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/app-controller.js)
  - [window-manager.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/window-manager.js)
  - [ipc.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/ipc.js)

### 3.4 UI 层
- 只负责展示和把按钮动作发回主进程。
- 不直接操作文件系统。
- 关键文件：
  - [dashboard.html](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/dashboard.html)
  - [dashboard.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/dashboard.js)
  - [reminder.html](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/reminder.html)
  - [reminder.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/reminder.js)

## 4. 主状态机
### 4.1 等待态
- 调度器维护 `anchorAt`、`nextDueAt`、`nextReason`。
- 主进程每秒调用一次 `tick(now)`。

### 4.2 提醒显示态
- `tick()` 返回 `SHOW_REMINDER` 时：
  - 写 `REMINDER_SHOWN`
  - 打开提醒窗
  - 广播最新状态到所有窗口

### 4.3 用户动作态
- `DONE`
  - 写 `ACTION`
  - 关闭提醒窗
  - 把当前动作时间设为新的节拍起点
  - 下一次提醒时间为 `now + intervalSec`
- `SKIP`
  - 逻辑同 `DONE`
- `SNOOZE`
  - 写 `ACTION`
  - 下一次提醒时间改为 `now + snoozeSec`
  - 当该次延后提醒真正显示时，把 `anchorAt` 重置为这次显示时刻

## 5. 调度语义
### 5.1 固定节拍
- 首次节拍锚点为应用启动时间。
- 首次提醒为 `launchAt + intervalSec`。

### 5.2 完成/跳过后的下一次提醒
- 以用户关闭提醒窗的动作时间作为新锚点。
- 下一次提醒时间直接计算为 `actionAt + intervalSec`。
- 这样主窗口倒计时会从用户刚完成动作的时刻重新开始。

### 5.3 延后后的重置规则
- `SNOOZE` 不立即重置锚点。
- 真正等延后提醒显示时，才把新的显示时刻作为锚点。
- 这样能忠实表达“延后的提醒成为新的节拍起点”。

### 5.4 睡眠恢复补弹
- 如果两次 `tick()` 的时间差大于 `overdueGapMs` 且已经错过提醒，则发一次 `OVERDUE_RESUME`。
- 只补一次，不回放多个历史提醒。

## 6. 数据设计
### 6.1 配置文件
路径：`data/config.json`

配置目的：
- 存储可调参数
- 保证首次启动自动生成默认值
- 保证 UI 切换声音开关和提醒间隔可写回

### 6.2 日志文件
路径：`data/logs/YYYY-MM-DD.jsonl`

事件类型：
- `SESSION_STARTED`
- `REMINDER_SHOWN`
- `ACTION`

设计理由：
- JSONL 便于追加写入和逐行审计
- 按天切分可直接统计“今日表现”

### 6.3 统计口径
- 只统计 `ACTION` 中的 `DONE`、`SKIP`
- `completionRate = done / (done + skip)`
- `SNOOZE` 不进入分母

## 7. IPC 合约
- `bootstrap:get`
  - 用途：页面首次加载时获取完整状态快照
- `settings:update`
  - 用途：更新配置，如声音开关、提醒间隔
- `reminder:act`
  - 用途：提醒窗按钮回传
- `app:quit`
  - 用途：显式退出
- `app:open-data-dir`
  - 用途：打开数据目录
- `state:changed`
  - 用途：主进程广播最新状态

## 8. 窗口策略
### 8.1 主窗口
- 常驻但允许最小化
- 关闭行为被拦截，改为最小化到任务栏

### 8.2 提醒窗口
- 同一时刻只开一个
- 使用系统标题栏
- 用户点击 `X` 或 `Alt+F4` 视为 `SKIP`

## 9. 环境与部署设计
### 9.1 当前实现选择
- 使用 Electron 本地工具链
- 不在线安装依赖
- 依赖同级已有 Electron/Node 路径

### 9.2 原因
- 当前执行环境已存在可用 Electron 28.3.3 与 Node 22.17.0
- 当前目录没有 Python 运行时
- 这样能最快形成可运行 MVP

### 9.3 已知代价
- 仓库当前不是完全自包含
- 新机器上需要重新安装依赖或改写脚本路径

## 10. 演进建议
- 把外部工具链依赖收敛为本仓库自己的 `devDependencies`
- 增加系统托盘
- 增加开机自启
- 增加更细粒度的日志错误事件
- 增加真实 E2E 界面测试
