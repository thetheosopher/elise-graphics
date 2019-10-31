export class InvalidIndexException extends Error {
    /**
     * Custom exception for invalid point indexes
     * @classdesc Internal exception type
     */
    constructor(index: number) {
        super('Invalid point index: ' + index);
    }
}
