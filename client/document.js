let document = {
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
                                    text: 'hello'
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
}