import { SourceEvent } from './typed-event';

/**
 * Generic, multicast model related event dispatcher
 */
export class ModelEvent<T> extends SourceEvent<unknown, T> {
}
