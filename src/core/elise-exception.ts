export class EliseException extends Error {
    /**
     * Custom exception for catching internal errors
     * @classdesc Internal exception type
     * @param message - Exception message
     */
    constructor(message: string) {
        super(message);
    }
}
