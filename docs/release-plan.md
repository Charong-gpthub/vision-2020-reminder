# Release Plan

## 发布前检查
- 运行 `npm run test`
- 运行 `npm run smoke`
- 确认 `scripts/package-electron.cmd` 能清理 `ELECTRON_RUN_AS_NODE`
- 确认打包机仍能访问外部 Electron 工具链路径

## Packaging
- 执行 `npm run package`
- 输出目录：`dist/`
- 交付形态：便携目录包，不做安装器

## 回滚方案
- 可回滚项：
  - 代码
  - 打包目录
  - 配置文件
- 回滚步骤：
  - 停止当前版本
  - 替换为上一个稳定打包目录
  - 如有异常配置，删除新版本生成的 `data/config.json`
- 风险与一致性说明：
  - 日志为追加式 JSONL，回滚不会自动迁移或合并历史日志
  - 如果改变日志字段，回滚后要确认新旧版本兼容
- 回滚验证：
  - 应用可以启动
  - `SESSION_STARTED` 正常出现
  - 一次提醒流程可完成

## 监控与告警建议
- 关键指标：
  - 应用是否成功启动
  - 提醒是否按时出现
  - `ACTION` 是否与提醒数量大致匹配
- 日志关键字：
  - `SESSION_STARTED`
  - `REMINDER_SHOWN`
  - `ACTION`
- 人工巡检建议：
  - 首次打包后抽查 5 次提醒
  - 做一次加速 4 小时等效长跑
- 仪表盘建议：
  - 当前 MVP 不带独立监控面板，建议先通过 JSONL 抽查
