# 实现说明

## 1. 实现总览
本项目围绕一个核心原则实现：业务决策集中在主进程控制器和纯逻辑调度器，UI 只展示状态并回传动作。

这带来两个好处：
- 关键行为可以通过单元测试稳定验证
- 未来替换 UI 样式或窗口结构时，不需要改调度规则和日志规则

## 2. 启动链路
### 2.1 入口
[main.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/main.js) 负责：
- 解析运行数据目录
- 构建 `configStore`、`logStore`、`statsProvider`
- 构建 `windowManager`
- 构建 `appController`
- 注册 IPC
- 启动 1 秒轮询
- 监听系统 `resume`

### 2.2 数据目录解析
优先级：
1. `VISION2020_DATA_DIR`
2. 打包应用目录旁的 `data/`
3. 开发环境根目录下的 `data/`

### 2.3 自动化模式
通过环境变量控制：
- `VISION2020_AUTOMATION=1`
- `VISION2020_AUTOMATION_ACTION=DONE`
- `VISION2020_AUTOMATION_DELAY_MS=600`

这个模式只用于烟雾测试，不应该作为正式用户路径依赖。

## 3. 控制器职责
[app-controller.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/app-controller.js) 是全项目最重要的协调层。

它负责：
- 初始化会话
- 写 `SESSION_STARTED`
- 处理调度器产出的提醒事件
- 处理用户动作
- 更新配置
- 推送状态到窗口
- 拦截主窗口关闭
- 打开数据目录
- 请求退出应用

### 3.1 为什么控制器不直接操作 DOM
- 主进程和渲染进程职责分离
- 测试可以用 stub 替代 `windowManager`
- 降低 UI 实现变化对业务逻辑的影响

## 4. 调度器实现
[scheduler.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/scheduler.js) 是纯函数风格的状态容器。

内部状态：
- `anchorAtMs`
- `nextDueAtMs`
- `nextReason`
- `activeReminder`
- `lastTickAtMs`
- `pendingParentReminderId`

### 4.1 `tick(now)`
用途：
- 判断是否需要显示提醒
- 处理睡眠恢复补弹
- 避免在已有活动提醒时重复出窗

### 4.2 `applyAction(...)`
用途：
- 根据用户动作推进下一次提醒
- 清空当前活动提醒

### 4.3 `updateConfig(...)`
用途：
- 在修改提醒间隔后，从保存时刻重置锚点和下一次提醒时间
- 丢弃旧的等待节拍和待触发的 `SNOOZE` 计划

## 5. 存储实现
### 5.1 配置存储
[config-store.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/storage/config-store.js)

实现要点：
- 首次运行自动生成默认配置
- 更新配置时做深合并
- 自动创建 `data/` 和 `data/logs/`

### 5.2 日志存储
[log-store.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/storage/log-store.js)

实现要点：
- 每次写入打开文件、写入、`fsync`、关闭
- 牺牲一点性能，换取更高日志可靠性
- 适合低频桌面提醒场景

## 6. UI 实现
### 6.1 主窗口
[dashboard.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/dashboard.js)

职责：
- 读取 `bootstrap:get`
- 监听 `state:changed`
- 展示下一次提醒、倒计时、统计信息
- 调整提醒间隔，默认 20 分钟
- 切换声音开关
- 打开数据目录
- 退出应用

### 6.2 提醒窗口
[reminder.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/reminder.js)

职责：
- 展示 20 秒倒计时
- 播放一次简短提示音
- 把按钮动作通过 IPC 发回主进程

### 6.3 为什么倒计时在渲染进程本地更新
- 主进程每秒广播只需要维护“全局状态”
- 250ms 本地刷新可让倒计时更平滑
- 即使广播间隔是 1 秒，用户看到的倒计时也不会卡顿

## 7. 测试实现
### 7.1 单元测试
路径：[tests](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/tests)

覆盖内容：
- 调度器节拍、延后、补弹
- 日志追加和跨日切分
- 统计口径
- 控制器对窗口和日志的协调行为

### 7.2 烟雾测试
[smoke-launch.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/scripts/smoke-launch.js)

用途：
- 用临时目录生成配置
- 启动 Electron
- 自动完成一次提醒动作
- 轮询检查日志是否出现 `SESSION_STARTED`、`REMINDER_SHOWN`、`DONE`

## 8. 当前实现中的特殊环境处理
### 8.1 `ELECTRON_RUN_AS_NODE`
当前宿主环境默认把这个变量设为 `1`。如果不清除：
- Electron 主进程不会真正以 Electron API 启动
- `require('electron')` 或 Electron 入口行为会异常

处理方式：
- [run-electron.cmd](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/scripts/run-electron.cmd)
- [package-electron.cmd](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/scripts/package-electron.cmd)
- [smoke-launch.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/scripts/smoke-launch.js) 中显式删除该变量

### 8.2 外部工具链路径
当前 `package.json` 脚本直接引用上级历史项目中的 Node 和 Electron。

这意味着：
- 当前机器上可直接运行
- 换机器或单独克隆仓库后，不一定能直接运行

## 9. 后续修改建议
### 9.1 如果要改提醒策略
- 先看 [scheduler.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/scheduler.js)
- 先改测试，再改实现

### 9.2 如果要改统计口径
- 先看 [stats.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/stats.js)
- 注意别让 `SNOOZE` 进入完成率分母，除非明确改变产品定义

### 9.3 如果要改窗口行为
- 先看 [window-manager.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/window-manager.js)
- 再看 [app-controller.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/app-controller.js)

## 10. 已知限制
- 当前没有系统托盘
- 当前没有开机自启
- 当前没有独立安装器
- 当前仓库没有本地 `electron` 依赖
- 当前没有真正的 UI 自动化回归，只做了烟雾验证
