const htmlparser2 = require('htmlparser2');
const http = require('http');
const css = require("css");
const main = require('./main.js');
const network = require('./network.js');
const render = require('./render.js');
const { createCanvas } = require('canvas')
const fs = require('fs')
const host = 'localhost';
const port = 80;

const loadingLinks = {}
const loadingScripts = {}

Array.prototype.top = function () {
    return this[this.length - 1];
}

/** 浏览器主进程 **/
main.on('request', function (options) {
    //2.主进程把该URL转发给网络进程
    network.emit('request', options);
})
//开始准备渲染页面
main.on('prepareRender', function (response) {
    //5.主进程发送提交导航消息到渲染进程
    render.emit('commitNavigation', response);
})
main.on('confirmNavigation', function () {
    console.log('confirmNavigation');
})
main.on('DOMContentLoaded', function () {
    console.log('DOMContentLoaded');
})
main.on('Load', function () {
    console.log('Load');
})
main.on('drawQuad', function () {
    //14.浏览器主进程然后会从GPU内存中取出位图显示到页面上
    let drawSteps = gpu.bitMaps.flat();
    const canvas = createCanvas(150, 250);
    const ctx = canvas.getContext('2d');
    eval(drawSteps.join('\r\n'));
    fs.writeFileSync('result.png', canvas.toBuffer('image/png'));
})

/** 网络进程 **/
network.on('request', function (options) {
    //3.在网络进程中发起URL请求
    let request = http.request(options, (response) => {
        //4.网络进程接收到响应头数据并转发给主进程
        main.emit('prepareRender', response);
    });
    //结束请求体
    request.end();
})

/** 渲染进程 **/
//6.渲染进程开始从网络进程接收HTML数据
render.on('commitNavigation', function (response) {
    const headers = response.headers;
    const contentType = headers['content-type'];
    if (contentType.indexOf('text/html') !== -1) {
        //1. 渲染进程把HTML转变为DOM树型结构
        const document = { type: 'document', attributes: {}, children: [] };
        const cssRules = [];
        const tokenStack = [document];
        const parser = new htmlparser2.Parser({
            onopentag(name, attributes = {}) {
                const parent = tokenStack.top();
                const element = {
                    type: 'element',
                    tagName: name,
                    children: [],
                    attributes,
                    parent
                }
                parent.children.push(element);
                tokenStack.push(element);
            },
            ontext(text) {
                if (!/^[\r\n\s]*$/.test(text)) {
                    const parent = tokenStack.top();
                    const textNode = {
                        type: 'text',
                        children: [],
                        attributes: {},
                        parent,
                        text
                    }
                    parent.children.push(textNode);
                }
            },
            /**
             * 在预解析阶段，HTML发现CSS和JS文件会并行下载，等全部下载后先把CSS生成CSSOM，然后再执行JS脚本
             * 然后再构建DOM树，重新计算样式，构建布局树，绘制页面
             * @param {*} tagname 
             */
            onclosetag() {
                switch (tagname) {
                    case 'style':
                        const styleToken = tokenStack.top();
                        const cssAST = css.parse(styleToken.children[0].text);
                        cssRules.push(...cssAST.stylesheet.rules);
                        break;
                    case 'link':
                        const linkToken = tokenStack[tokenStack.length - 1];
                        const href = linkToken.attributes.href;
                        const options = { host, port, path: href }
                        const promise = network.fetchResource(options).then(({ body }) => {
                            delete loadingLinks[href];
                            const cssAST = css.parse(body);
                            cssRules.push(...cssAST.stylesheet.rules);
                        });
                        loadingLinks[href] = promise;
                        break;
                    case 'script':
                        const scriptToken = tokenStack[tokenStack.length - 1];
                        const src = scriptToken.attributes.src;
                        if (src) {
                            const options = { host, port, path: src };
                            const promise = network.fetchResource(options).then(({ body }) => {
                                delete loadingScripts[src];
                                return Promise.all([...Object.values(loadingLinks), Object.values(loadingScripts)]).then(() => {
                                    eval(body);
                                });
                            });
                            loadingScripts[src] = promise;
                        } else {
                            const script = scriptToken.children[0].text;
                            const ts = Date.now() + '';
                            const promise = Promise.all([...Object.values(loadingLinks), ...Object.values(loadingScripts)]).then(() => {
                                delete loadingScripts[ts];
                                eval(script);
                            });
                            loadingScripts[ts] = promise;
                        }
                        break;
                    default:
                        break;
                }
                tokenStack.pp();
            },
        });
        //开始接收响应体
        const buffers = [];
        response.on('data', (buffer) => {
            //8.渲染进程开始HTML解析和加载子资源
            //网络进程加载了多少数据，HTML 解析器便解析多少数据。
            parser.write(buffer.toString());
        });
        response.on('end', () => {
            Promise.all(Object.values(loadingScripts)).then(() => {
                console.log(cssRules);
                //let resultBuffer = Buffer.concat(buffers);
                //let html = resultBuffer.toString();
                console.dir(document, { depth: null });
                //7.HTML接收接受完毕后通知主进程确认导航
                main.emit('confirmNavigation');
                //3. 通过stylesheet计算出DOM节点的样式
                recalculateStyle(cssRules, document);
                //4. 根据DOM树创建布局树,就是复制DOM结构并过滤掉不显示的元素
                const html = document.children[0];
                const body = html.children[1];
                const layoutTree = createLayout(body);
                //5.并计算各个元素的布局信息
                updateLayoutTree(layoutTree);
                //6. 根据布局树生成分层树
                const layers = [layoutTree];
                createLayerTree(layoutTree, layers);
                //7. 根据分层树进行生成绘制步骤并复合图层
                const paintSteps = compositeLayers(layers);
                console.log(paintSteps.flat().join('\r\n'));
                //8.把绘制步骤交给渲染进程中的合成线程进行合成
                //9.合成线程会把图层划分为图块(tile)
                const tiles = splitTiles(paintSteps);
                //10.合成线程会把分好的图块发给栅格化线程池
                raster(tiles);
                console.log(layers);
                console.dir(layoutTree, { depth: null });
                console.dir(document, { depth: null });
                //触发DOMContentLoaded事件
                main.emit('DOMContentLoaded');
                //9.HTML解析完毕和加载子资源页面加载完成后会通知主进程页面加载完成
                main.emit('Load');
            })
        });
    }
})
function splitTiles(paintSteps) {
    return paintSteps;
}
function raster(tiles) {
    //11.栅格化线程会把图片(tile)转化为位图
    tiles.forEach(tile => rasterThread(tile));
    //13.当所有的图块都光栅化之后合成线程会发送绘制图块的命令给浏览器主进程
    main.emit('drawQuad');
}
function rasterThread(tile) {
    //12.而其实栅格化线程在工作的时候会把栅格化的工作交给GPU进程来完成
    gpu.emit('raster', tile);
}
function compositeLayers(layers) {
    //10.合成线程会把分好的图块发给栅格化线程池，栅格化线程会把图片(tile)转化为位图
    return layers.map(layout => paint(layout));
}
function paint(element, paintSteps = []) {
    const { background = 'black', color = 'black', top = 0, left = 0, width = 100, height = 0 } = element.layout;
    if (element.type === 'text') {
        paintSteps.push(`ctx.font = '20px Impact;'`);
        paintSteps.push(`ctx.strokeStyle = '${color}';`);
        paintSteps.push(`ctx.strokeText("${element.text.replace(/(^\s+|\s+$)/g, '')}", ${left},${top + 20});`);
    } else {
        paintSteps.push(`ctx.fillStyle="${background}";`);
        paintSteps.push(`ctx.fillRect(${left},${top}, ${parseInt(width)}, ${parseInt(height)});`);
    }
    element.children.forEach(child => paint(child, paintSteps));
    return paintSteps;
}
function createLayerTree(element, layers) {
    element.children = element.children.filter((child) => createNewLayer(child, layers));
    element.children.forEach(child => createLayerTree(child, layers));
    return layers;
}
function createNewLayer(element, layers) {
    let created = true;
    const attributes = element.attributes;
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style') {
            const attributes = value.split(';');
            attributes.forEach((attribute) => {
                const [property, value] = attribute.split(/:\s*/);
                if (property === 'position' && value === 'absolute') {
                    updateLayoutTree(element);//对单独的层重新计算位置
                    layers.push(element);
                    created = false;
                }
            });
        }
    });
    return created;
}
function updateLayoutTree(element, top = 0, parentTop = 0) {
    const computedStyle = element.computedStyle;
    element.layout = {
        top: top + parentTop,
        left: 0,
        width: computedStyle.width,
        height: computedStyle.height,
        background: computedStyle.background,
        color: computedStyle.color
    }
    let childTop = 0;
    element.children.forEach(child => {
        updateLayoutTree(child, childTop, element.layout.top);
        childTop += parseInt(child.computedStyle.height || 0);
    });
}
function createLayout(element) {
    element.children = element.children.filter(isShow);
    element.children.forEach(child => createLayout(child));
    return element;
}
function isShow(element) {
    let isShow = true;
    if (element.tagName === 'head' || element.tagName === 'script') {
        isShow = false;
    }
    const attributes = element.attributes;
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style') {
            const attributes = value.split(';');
            attributes.forEach((attribute) => {
                const [property, value] = attribute.split(/:\s*/);
                if (property === 'display' && value === 'none') {
                    isShow = false;
                }
            });
        }
    });
    return isShow;
}
function recalculateStyle(cssRules, element, parentComputedStyle = {}) {
    const attributes = element.attributes;
    element.computedStyle = { color: parentComputedStyle.color }; // 计算样式
    Object.entries(attributes).forEach(([key, value]) => {
        //stylesheets
        cssRules.forEach(rule => {
            let selector = rule.selectors[0].replace(/\s+/g, '');
            if ((selector == '#' + value && key == 'id') || (selector == '.' + value && key == 'class')) {
                rule.declarations.forEach(({ property, value }) => {
                    element.computedStyle[property] = value;
                })
            }
        })
        //行内样式
        if (key === 'style') {
            const attributes = value.split(';');
            attributes.forEach((attribute) => {
                const [property, value] = attribute.split(/:\s*/);
                element.computedStyle[property] = value;
            });
        }
    });
    element.children.forEach(child => recalculateStyle(cssRules, child, element.computedStyle));
}

gpu.on('raster', (tile) => {
    //13.最终生成的位图就保存在了GPU内存中
    let bitMap = tile;
    gpu.bitMaps.push(bitMap);
});
//1.主进程接收用户输入的URL
// main.emit('request', { host, port, path: '/index.html' });
main.emit('request', { host, port, path: '/load.html' });