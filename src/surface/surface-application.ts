import type { SerializedData } from '../core/serialization';
import { Utility } from '../core/utility';
import { Resource } from '../resource/resource';
import { ResourceFactory } from '../resource/resource-factory';
import { NavigationAction } from './navigation-action';
import { Surface } from './surface';

/**
 * Top-level container for a navigable surface application.
 * Holds a collection of named surfaces and designates a root surface.
 */
export class SurfaceApplication {
    /**
     * Parses a JSON string into a SurfaceApplication instance
     * @param json - JSON source string
     * @returns Deserialized surface application
     */
    public static parse(json: string): SurfaceApplication {
        const o = JSON.parse(json);
        const app = new SurfaceApplication(o.width as number, o.height as number);
        app.parseData(o);
        return app;
    }

    /**
     * Application factory function
     * @param width - Application viewport width
     * @param height - Application viewport height
     * @returns New surface application
     */
    public static create(width: number, height: number): SurfaceApplication {
        return new SurfaceApplication(width, height);
    }

    /**
     * Application identifier
     */
    public id: string;

    /**
     * Application version string
     */
    public version?: string;

    /**
     * Application display title
     */
    public title?: string;

    /**
     * Application viewport width
     */
    public width: number;

    /**
     * Application viewport height
     */
    public height: number;

    /**
     * Rendering scale factor
     */
    public scale: number;

    /**
     * ID of the initial root surface
     */
    public rootSurfaceId?: string;

    /**
     * Collection of all navigable surfaces
     */
    public surfaces: Surface[] = [];

    /**
     * Shared resource definitions
     */
    public resources: Resource[] = [];

    /**
     * @param width - Application viewport width
     * @param height - Application viewport height
     */
    constructor(width: number, height: number) {
        this.id = Utility.guid();
        this.width = width;
        this.height = height;
        this.scale = 1;

        this.surfaceWithId = this.surfaceWithId.bind(this);
        this.addSurface = this.addSurface.bind(this);
        this.removeSurface = this.removeSurface.bind(this);
        this.formattedJSON = this.formattedJSON.bind(this);
        this.rawJSON = this.rawJSON.bind(this);
    }

    /**
     * Parses serialized data into application properties
     * @param o - Serialized application data
     */
    public parseData(o: SerializedData): void {
        if (o.id !== undefined) {
            this.id = o.id as string;
        }
        if (o.version !== undefined) {
            this.version = o.version as string;
        }
        if (o.title !== undefined) {
            this.title = o.title as string;
        }
        if (o.scale !== undefined) {
            this.scale = o.scale as number;
        }
        if (o.rootSurfaceId !== undefined) {
            this.rootSurfaceId = o.rootSurfaceId as string;
        }

        if (o.resources) {
            for (const resData of o.resources as SerializedData[]) {
                const res = ResourceFactory.create(resData.type);
                if (res) {
                    res.parse(resData);
                    this.resources.push(res);
                }
            }
        }

        if (o.surfaces) {
            for (const surfData of o.surfaces as SerializedData[]) {
                const surface = new Surface(
                    surfData.width as number,
                    surfData.height as number,
                    surfData.id as string | undefined,
                    surfData.scale as number | undefined
                );
                surface.parseData(surfData);
                this.surfaces.push(surface);
            }
        }
    }

    /**
     * Serializes persistent application properties to a new object
     * @returns Serialized application data
     */
    public serialize(): SerializedData {
        const o: SerializedData = {
            type: 'surfaceApplication',
            width: this.width,
            height: this.height,
        };
        if (this.id) {
            o.id = this.id;
        }
        if (this.version) {
            o.version = this.version;
        }
        if (this.title) {
            o.title = this.title;
        }
        if (this.scale !== 1) {
            o.scale = this.scale;
        }
        if (this.rootSurfaceId) {
            o.rootSurfaceId = this.rootSurfaceId;
        }
        if (this.resources.length > 0) {
            o.resources = this.resources.map(r => r.serialize());
        }
        if (this.surfaces.length > 0) {
            o.surfaces = this.surfaces.map(s => s.serialize());
        }
        return o;
    }

    /**
     * Finds a surface by ID in the application's surface collection
     * @param id - Surface ID to find
     * @returns Matching surface or undefined
     */
    public surfaceWithId(id: string): Surface | undefined {
        for (const surface of this.surfaces) {
            if (surface.id === id) {
                return surface;
            }
        }
        return undefined;
    }

    /**
     * Adds a surface to the application
     * @param surface - Surface to add
     */
    public addSurface(surface: Surface): void {
        this.surfaces.push(surface);
    }

    /**
     * Removes a surface from the application
     * @param surface - Surface to remove
     * @returns Index of removed surface or -1 if not found
     */
    public removeSurface(surface: Surface): number {
        const index = this.surfaces.indexOf(surface);
        if (index !== -1) {
            this.surfaces.splice(index, 1);
        }
        return index;
    }

    /**
     * Returns the root surface for this application
     * @returns Root surface or undefined
     */
    public rootSurface(): Surface | undefined {
        if (this.rootSurfaceId) {
            return this.surfaceWithId(this.rootSurfaceId);
        }
        return this.surfaces.length > 0 ? this.surfaces[0] : undefined;
    }

    /**
     * Serializes application to formatted JSON string
     */
    public formattedJSON(): string {
        return JSON.stringify(this.serialize(), null, ' ');
    }

    /**
     * Serializes application to raw JSON string
     */
    public rawJSON(): string {
        return JSON.stringify(this.serialize());
    }
}
