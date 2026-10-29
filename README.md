# Image Generator

一个基于 **Tauri + React + Rust** 的桌面创作应用，提供图像、视频和 3D 三个 DashScope 工作台。

界面按「创作模态」拆分：左侧导航区分 **图像 / 视频 / 3D**，每个模态有自己的主题色、布局和后续参数面板，互不干扰。API 凭据由应用统一管理，三个工作区共用。

## 启动

```bash
rustup update stable
npm install
npm run tauri:dev
```

## 打包

```bash
npm run tauri:build
```

## 界面结构

- **应用外壳**：`src/App.tsx` 负责主题、工作区路由、全局设置与凭据状态；工作区用 `#image` / `#video` / `#3d` 记录当前位置。
- **图像工作台**：`src/components/image/`
  - `ComposerPanel`：模式切换、模型、提示词、参考图、尺寸、数量、高级参数、生成按钮。
  - `ResultStage`：画布、加载骨架、结果网格、空状态、错误提示。
  - `HistorySheet`：本机历史记录与参数复用。
  - `ImageLightbox`：结果放大预览与下载。
- **视频 / 3D 工作区**：`src/components/video/`、`src/components/model3d/`，复用 `src/components/modality/` 的表单、异步任务管理和结果面板；Rust 接口独立在 `src-tauri/src/media.rs`。
- **设计系统**：`src/index.css`。颜色、圆角、阴影、字体、动效都以 CSS 变量集中管理；`modality-image` / `modality-video` / `modality-3d` 三个类负责切换每个工作区的强调色。
- **基础组件**：`src/components/ui/`（button、dialog、select、sheet）。

## 新增一个工作区的步骤

1. 在 `src/lib/types.ts` 的 `Modality` 中加入新的 id。
2. 在 `src/components/shell/SideRail.tsx` 的 `NAV_ITEMS` 中加导航项（可加 `soon` 小圆点）。
3. 在 `src/App.tsx` 的 `WORKSPACE_META` 中补标题、描述和 `accent` 类（如 `modality-video`）。
4. 新建 `src/components/<modality>/<Name>Workspace.tsx`，复用 `lib/api.ts` 的 invoke 封装。
5. 在 `src/index.css` 中为新模态定义 `--modality*` 变量（深色 / 浅色各一套）。

## 配置方式

1. 直接在界面右上角的「API 已配置 / 未配置」入口打开设置，填写 `API Key`、`Base URL`。
2. 或者把 `API Key` 留空，启动应用前在终端里设置环境变量：

```bash
export DASHSCOPE_API_KEY="你的 key"
export DASHSCOPE_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
```

## 请求说明

- 应用会先请求：`{Base URL}/models`，自动读取当前账号可用图像模型
- 你可以在界面手动选择当前模式下可用的模型；不选时走自动选择
- **文生图** 自动优先选：`qwen-image-2.0-pro -> qwen-image-2.0 -> qwen-image-max -> wan2.7-image-pro -> wan2.7-image -> z-image-turbo`
- **图生图** 上传参考图后自动切换，自动优先选：`qwen-image-edit-max -> qwen-image-2.0-pro -> qwen-image-edit-plus -> qwen-image-2.0`
- 界面会显示「文生图自动模型 / 图生图自动模型 / 当前使用」，并提供手动选择下拉框
- 会根据当前模型能力自动限制：是否支持自定义尺寸、最多生成张数、是否支持图生图
- API Key 与其他配置可一起保存到本机 localStorage
- 最近生成历史会保存在本机，支持一键复用参数
- 文生图和图生图都会从兼容地址自动推导到 DashScope 原生多模态接口：`/api/v1/services/aigc/multimodal-generation/generation`
- “高级参数 JSON” 会自动 merge 到请求参数里，适合传 `seed`、`watermark` 等扩展字段

Key 不会写入仓库；只有勾选“记住设置（含 API Key，本机 localStorage）”时，才会保存在当前机器本地。

## 视频与 3D

- 视频：`wan2.7-t2v` 文生视频、`wan2.7-i2v` 首帧／首尾帧生视频，支持 2–15 秒、720P／1080P，结果可播放并打开 MP4 下载链接。
- 3D：`Tripo/Tripo-P1.0`、`Tripo/Tripo-H3.1`，支持文生与单图生模型、PBR 材质、贴图质量；H3.1 可选几何精度。GLB 支持旋转、缩放预览和下载链接。
- 参考图使用可公开访问的 HTTP(S) 图片地址。Tripo 的文本与图片输入互斥，图生模式不会发送提示词。
- Wan 2.7 使用北京／新加坡地域；Tripo 仅支持北京地域，需要先在百炼控制台开通服务。模型选项来自官方文档，不代表账号已获得权限。
- 共用全局 API Key 和 Base URL，后端将兼容地址转换为原生 `/api/v1`；也支持业务空间专属域名。视频与 3D 不使用图像的高级参数 JSON。
- 创建任务后每 15 秒查询状态；切换菜单不打断任务。最近 12 条任务记录（不含 API Key）保存在本机，重启后可恢复查询；查询失败时点击“继续查询”，不会重新创建付费任务。
- 视频链接有效期 24 小时，Tripo 链接有效期 2 小时，请及时下载。历史仅保存任务信息和资源链接，不保存媒体文件。
- 浏览器仅可预览界面，真实调用需运行 Tauri 桌面端。提交发生网络错误时，先到百炼控制台核对，避免重复计费。

官方参考：[文生视频](https://help.aliyun.com/zh/model-studio/text-to-video-api-reference)、[图生视频](https://help.aliyun.com/zh/model-studio/image-to-video-general-api-reference)、[Tripo 3D](https://help.aliyun.com/zh/model-studio/tripo-3d-generation-api-reference)。

验证命令：`npm run build`、`npm run lint`、`cargo test --manifest-path src-tauri/Cargo.toml`。
