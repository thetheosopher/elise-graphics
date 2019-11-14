import { ErrorMessages } from '../core/error-messages';

/**
 * Encapsulates invalid point index exception
 */
export class InvalidIndexException extends Error {
    constructor(index: number) {
        super(ErrorMessages.InvalidPointIndex + index);
    }
}
