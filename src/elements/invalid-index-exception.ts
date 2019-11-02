export class InvalidIndexException extends Error {
    /**
     * Internal exception type
     */
    constructor(index: number) {
        super('Invalid point index: ' + index);
    }
}
