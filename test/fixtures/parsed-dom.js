/**
 * HTML Parser 中间产物示例
 *
 * 对应 HTML:
 * <html>
 *   <body>
 *     <div>hello===</div>
 *     <div>world</div>
 *   </body>
 * </html>
 */
const parsedDOM = {
    type: 'document',
    children: [
        {
            type: 'element',
            tagName: 'html',
            children: [
                {
                    type: 'element',
                    tagName: 'body',
                    children: [
                        {
                            type: 'element',
                            tagName: 'div',
                            children: [
                                {
                                    type: 'text',
                                    text: 'hello==='
                                }
                            ]
                        },
                        {
                            type: 'element',
                            tagName: 'div',
                            children: [
                                {
                                    type: 'text',
                                    text: 'world'
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

module.exports = parsedDOM;