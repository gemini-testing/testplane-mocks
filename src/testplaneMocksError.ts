export default class TestplaneMocksError extends Error {
    constructor(message: string) {
        super();

        this.name = this.constructor.name;
        this.message = message;
    }
}
