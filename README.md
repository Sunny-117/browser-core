# Browser Core

实现最简浏览器渲染模型。一个用于学习浏览器渲染原理的迷你浏览器内核实现。通过模拟浏览器的多进程架构，实现从 HTML 解析到页面渲染的完整流水线。

## 项目架构

```
browser-core/
├── client/                    # 模拟浏览器客户端
│   ├── main.js               # 主进程 - 事件调度中心
│   ├── network.js            # 网络进程 - HTTP 请求
│   ├── render.js             # 渲染进程 - 页面渲染
│   ├── gpu.js                # GPU 进程 - 位图存储
│   └── request.js            # 核心渲染引擎
├── server/                    # 静态资源服务器
│   ├── index.js              # Express 服务器
│   └── public/               # 示例页面
│       ├── index.html        # 内联样式示例
│       ├── load.html         # 外部资源加载示例
│       └── layout.html       # 布局分层示例
└── result.png                 # 渲染输出结果
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 运行 Demo

**方式一：分步运行**

```bash
# 终端 1: 启动服务器
pnpm server

# 终端 2: 运行渲染引擎
pnpm start
```

**方式二：一键运行 (macOS/Linux)**

```bash
pnpm demo
```

运行后会在项目根目录生成 `result.png`，这就是浏览器渲染的结果。

### 切换示例页面

修改 `client/request.js` 最后一行：

```javascript
// 示例 1: 内联样式
main.emit('request', { host, port, path: '/index.html' });

// 示例 2: 外部资源加载 (默认)
main.emit('request', { host, port, path: '/load.html' });

// 示例 3: 布局分层
main.emit('request', { host, port, path: '/layout.html' });
```

## 渲染流水线

本项目实现了浏览器渲染的 13 个核心步骤：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   HTML      │────>│   DOM Tree  │────>│  Computed   │
│   解析      │     │   构建      │     │   Style     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   分层树    │<────│   布局计算  │<────│   布局树    │
│   Layer     │     │   Layout    │     │   创建      │
└─────────────┘     └─────────────┘     └─────────────┘
       │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   绘制步骤  │────>│   图块分割  │────>│   栅格化    │
│   Paint     │     │   Tiling    │     │   Raster    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────┐     ┌─────────────┐
                    │   显示页面  │<────│   GPU合成   │
                    │   Display   │     │   Composite │
                    └─────────────┘     └─────────────┘
```

### 详细步骤说明

| 步骤 | 进程 | 描述 |
|------|------|------|
| 1 | 渲染进程 | HTML 转换为 DOM 树结构 |
| 2 | 渲染进程 | CSS 转换为 Stylesheet |
| 3 | 渲染进程 | 计算 DOM 节点的 ComputedStyle |
| 4 | 渲染进程 | 创建布局树（过滤不可见元素）|
| 5 | 渲染进程 | 计算元素布局信息（位置、尺寸）|
| 6 | 渲染进程 | 生成分层树（处理 z-index、position 等）|
| 7 | 渲染进程 | 生成绘制步骤列表 |
| 8 | 合成线程 | 接收绘制步骤 |
| 9 | 合成线程 | 将图层分割为图块 |
| 10 | 栅格化线程 | 图块转换为位图 |
| 11 | GPU 进程 | 存储位图到 GPU 内存 |
| 12 | 合成线程 | 发送绘制命令 |
| 13 | 主进程 | 从 GPU 取出位图显示 |

## 技术栈

| 技术 | 用途 |
|------|------|
| [htmlparser2](https://github.com/fb55/htmlparser2) | HTML 解析，生成 DOM 树 |
| [css](https://github.com/reworkcss/css) | CSS 解析，生成 CSSOM |
| [node-canvas](https://github.com/Automattic/node-canvas) | 绘制渲染结果为 PNG |
| [Express](https://expressjs.com/) | 静态资源服务器 |
| EventEmitter | 进程间通信机制 |

## 核心概念

### DOM 树构建

使用 Token 栈维护节点父子关系：
- 开始标签：创建节点并压入栈
- 文本节点：添加到栈顶元素的 children
- 结束标签：栈顶元素出栈

### 样式计算

支持三种 CSS 来源：
- `<link>` 标签引入的外部样式
- `<style>` 标签内的内联样式
- 元素 `style` 属性的行内样式

### 布局树

从 DOM 树创建布局树时过滤：
- `<head>` 和 `<script>` 标签
- `display: none` 的元素

### 分层树

以下情况会创建新图层：
- `position: absolute` / `fixed`
- `z-index` 设置
- 透明度、滤镜等

### 资源加载规则

- CSS 加载不阻塞 DOM 解析
- CSS 加载阻塞 JS 执行
- JS 执行阻塞 DOM 解析

## 示例输出

运行 `load.html` 示例后生成的 `result.png`：

![渲染结果](./result.png)

## 学习资源

- [浏览器工作原理与实践](https://time.geekbang.org/column/intro/100033601)
- [How Browsers Work](https://web.dev/howbrowserswork/)
- [Inside look at modern web browser](https://developer.chrome.com/blog/inside-browser-part1/)

## License

MIT
