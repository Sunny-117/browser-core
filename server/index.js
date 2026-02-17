const express = require('express');
const path = require('path');
let app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.listen(8000, () => {
    console.log('🚀 服务器已启动: http://localhost:8000');
});