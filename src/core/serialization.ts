/**
 * Common serialization contract for elements and resources that support JSON round-tripping
 */

/**
 * Base shape for all serialized objects
 */
export interface SerializedData {
    type: string;
    id?: string;
    [key: string]: unknown;
}

/**
 * Contract for objects that can be serialized to and parsed from JSON-compatible data
 */
export interface ISerializable {
    parse(data: SerializedData): void;
    serialize(): SerializedData;
}
