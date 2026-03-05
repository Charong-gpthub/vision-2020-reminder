# LLM 接手说明

这份文档是给其他大模型/代理的最小必要上下文。

## 1. 先读什么
1. [README.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/README.md)
2. [detailed-design.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/docs/detailed-design.md)
3. [implementation-guide.md](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/docs/implementation-guide.md)

## 2. 项目核心不变量
- 任何时刻只能有一个活动提醒。
- `DONE` / `SKIP` 都是“进入下一个严格晚于动作时间的节拍”。
- `SNOOZE` 只影响当前提醒；延后提醒真正显示后才重置节拍锚点。
- `SNOOZE` 不计入完成率分母。
- 提醒窗关闭按钮等价于 `SKIP`。
- 恢复补弹只发生一次，不补多个历史提醒。

## 3. 修改前优先级
### 3.1 如果改行为
- 先改测试
- 再改实现
- 最后跑 `npm run test`

### 3.2 如果改 UI
- 不要把业务逻辑搬进渲染进程
- UI 只消费状态、发送动作

### 3.3 如果改运行环境
- 注意当前脚本依赖外部 Node/Electron 路径
- 注意清除 `ELECTRON_RUN_AS_NODE`

## 4. 常见任务入口
- 改提醒节拍： [scheduler.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/scheduler.js) 和 [dashboard.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/ui/dashboard.js)
- 改日志结构： [log-store.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/storage/log-store.js) 和 [app-controller.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/app-controller.js)
- 改统计口径： [stats.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/domain/stats.js)
- 改窗口行为： [window-manager.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/window-manager.js)
- 改 IPC： [ipc.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/src/main/ipc.js) 和 [preload.js](/c:/Users/Administrator/Documents/trae_projects/vision-2020-reminder/preload.js)

## 5. 当前验证状态
- 单元测试已覆盖核心域逻辑和控制器协作
- 烟雾测试已验证一次真实 Electron 启动与日志产出
- 尚未执行真实打包后的手工验收

## 6. 风险地图
### 高风险
- 调度逻辑
- 关闭窗口语义
- 日志格式兼容性

### 中风险
- 外部工具链路径
- Electron 环境变量
- 打包脚本

### 低风险
- CSS 样式
- 展示性文案

## 7. 推荐工作流
- 先用 `rg` 定位模块
- 先理解 `app-controller` 和 `scheduler`
- 先写或更新测试
- 保持日志字段向后兼容，除非明确迁移

## 8. 如果你要把仓库做成真正自包含
- 在本仓库执行 `npm install --save-dev electron electron-packager`
- 把 `package.json` 中的外部路径脚本替换为本地依赖命令
- 验证 `scripts/run-electron.cmd` 和 `scripts/package-electron.cmd` 仍正确清理 `ELECTRON_RUN_AS_NODE`
