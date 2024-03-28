# 实现最简浏览器渲染模型

## 渲染流水线

- （1）渲染进程把 HTML 转变为 DOM 树型结构
- （2）渲染进程把 CSS 文本转为浏览器中的 stylesheet
- （3）通过 stylesheet 计算出 DOM 节点的样式
- （4）根据 DOM 树创建布局树
- （5）并计算各个元素的布局信息
- （6）根据布局树生成分层树
- （7）根据分层树进行生成绘制步骤
- （8）把绘制步骤交给渲染进程中的合成线程进行合成
- （9）合成线程将图层分成图块(tile)
- （10）合成线程会把分好的图块发给栅格化线程池，栅格化线程会把图片(tile)转化为位图
- （11）而其实栅格化线程在工作的时候会把栅格化的工作交给 GPU 进程来完成，最终生成的位图就保存在了 GPU 内存中
- （12）当所有的图块都光栅化之后合成线程会发送绘制图块的命令给浏览器主进程
- （13）浏览器主进程然后会从 GPU 内存中取出位图显示到页面上

## HTML 转 DOM 树

- 浏览器中的 HTML 解析器可以把 HTML 字符串转换成 DOM 结构
- HTML 解析器边接收网络数据边解析 HTML
- 解析 DOM
  - HTML 字符串转 Token
  - Token 栈用来维护节点之间的父子关系，Token 会依次压入栈中
  - 如果是开始标签，把 Token 压入栈中并且创建新的 DOM 节点并添加到父节点的 children 中
  - 如果是文本 Token，则把文本节点添加到栈顶元素的 children 中，文本 Token 不需要入栈
  - 如果是结束标签，此开始标签出栈

## CSS 转 stylesheet

- 渲染进程把 CSS 文本转为浏览器中的 stylesheet
- CSS 来源可能有 link 标签、style 标签和 style 行内样式
- 渲染引擎会把 CSS 转换为 document.styleSheets

## 计算出 DOM 节点的样式

- 根据 CSS 的继承和层叠规则计算 DOM 节点的样式
- DOM 节点的样式保存在了 ComputedStyle 中

## 创建布局树

- 创建布局树
- 创建一棵只包含可见元素的布局树

## 计算布局

- 计算各个元素的布局

## 生成分层树

- 根据布局树生成分层树
- 渲染引擎需要为某些节点生成单独的图层，并组合成图层树
  - z-index
  - 绝对定位和固定定位
  - 滤镜
  - 透明
  - 裁剪
- 这些图层合成最终的页面

## 绘制

- 根据分层树进行生成绘制步骤复合图层
- 每个图层会拆分成多个绘制指令，这些指令组合在一起成为绘制列表

## 合成线程

- 合成线程将图层分成图块(tile)
- 合成线程会把分好的图块发给栅格化线程池，栅格化线程会把图片(tile)转化为位图
- 而其实栅格化线程在工作的时候会把栅格化的工作交给 GPU 进程来完成，最终生成的位图就保存在了 GPU 内存中
- 当所有的图块都光栅化之后合成线程会发送绘制图块的命令给浏览器主进程
- 浏览器主进程然后会从 GPU 内存中取出位图显示到页面上
- 合成线程

## 图块

- 图块渲染也称基于瓦片渲染或基于小方块渲染
- 它是一种通过规则的网格细分计算机图形图像并分别渲染图块(tile)各部分的过程

## 栅格化

- 栅格化是将矢量图形格式表示的图像转换成位图以用于显示器输出的过程
- 栅格即像素
- 栅格化即将矢量图形转化为位图(栅格图像)

## 资源加载

- CSS 加载不会影响 DOM 解析
- CSS 加载不会阻塞 JS 加载，但是会阻塞 JS 执行
- JS 会依赖 CSS 加载，JS 会阻塞 DOM 解析
