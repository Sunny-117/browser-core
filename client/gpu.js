const EventEmitter = require('events');
class GPU extends EventEmitter {
    constructor() {
        super()
        this.bidMaps = []
    }
}
const gpu = new GPU();
module.exports = gpu;