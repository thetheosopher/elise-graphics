import { Point } from './point';

/**
 * Represents a 2D affine transformation matrix
 */
export class Matrix2D {
    public static IDENTITY: Matrix2D = new Matrix2D(1, 0, 0, 1, 0, 0);

    /**
     * Matrix factory method
     * @returns New matrix
     */
    public static create(
        m11: number,
        m12: number,
        m21: number,
        m22: number,
        offsetX: number,
        offsetY: number
    ): Matrix2D {
        return new Matrix2D(m11, m12, m21, m22, offsetX, offsetY);
    }

    /**
     * Multiplies two matrices
     * @param a - Matrix A
     * @param b - Matrix B
     * @returns Matrix A x B
     */
    public static multiply(a: Matrix2D, b: Matrix2D): Matrix2D {
        const r = new Matrix2D(1, 0, 0, 1, 0, 0);
        r.m11 = a.m11 * b.m11 + a.m12 * b.m21;
        r.m12 = a.m11 * b.m12 + a.m12 * b.m22;
        r.m21 = a.m21 * b.m11 + a.m22 * b.m21;
        r.m22 = a.m21 * b.m12 + a.m22 * b.m22;
        r.offsetX = a.offsetX * b.m11 + a.offsetY * b.m21 + b.offsetX;
        r.offsetY = a.offsetX * b.m12 + a.offsetY * b.m22 + b.offsetY;
        return r;
    }

    /**
     * Parses a transform string and origin into a composite Matrix2D.
     * Supports: scale(), rotate(), translate(), skew(), matrix()
     * @param transform - Transform definition string
     * @param origin - Reference origin point for the transform
     * @returns Equivalent Matrix2D
     */
    public static fromTransformString(transform: string, origin: Point): Matrix2D {
        const t = transform;
        const m = new Matrix2D(1, 0, 0, 1, 0, 0);

        if (t.length > 6 && t.substring(0, 6).toLowerCase() === 'scale(') {
            let command = t.substring(6, t.length - 1);
            let refX = origin.x;
            let refY = origin.y;
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                command = command.substring(0, command.indexOf('('));
                const center = Point.parse(centerString);
                refX += center.x;
                refY += center.y;
                m.translate(origin.x + center.x, origin.y + center.y);
            }
            else {
                m.translate(origin.x, origin.y);
            }
            if (command.indexOf(',') !== -1) {
                const parts = command.split(',');
                m.scale(parseFloat(parts[0]), parseFloat(parts[1]));
            }
            else {
                const s = parseFloat(command);
                m.scale(s, s);
            }
            m.translate(-refX, -refY);
        }
        else if (t.length > 7 && t.substring(0, 7).toLowerCase() === 'rotate(') {
            let command = t.substring(7, t.length - 1);
            let refX = origin.x;
            let refY = origin.y;
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                command = command.substring(0, command.indexOf('('));
                const center = Point.parse(centerString);
                refX += center.x;
                refY += center.y;
                m.translate(origin.x + center.x, origin.y + center.y);
            }
            else {
                m.translate(origin.x, origin.y);
            }
            const angle = Math.PI / 180 * parseFloat(command);
            m.rotate(angle);
            m.translate(-refX, -refY);
        }
        else if (t.length > 10 && t.substring(0, 10).toLowerCase() === 'translate(') {
            const command = t.substring(10, t.length - 1);
            const parts = command.split(',');
            m.translate(parseFloat(parts[0]), parseFloat(parts[1]));
        }
        else if (t.length > 5 && t.substring(0, 5).toLowerCase() === 'skew(') {
            let command = t.substring(5, t.length - 1);
            let refX = origin.x;
            let refY = origin.y;
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                command = command.substring(0, command.indexOf('('));
                const center = Point.parse(centerString);
                refX += center.x;
                refY += center.y;
                m.translate(origin.x + center.x, origin.y + center.y);
            }
            else {
                m.translate(origin.x, origin.y);
            }
            const parts = command.split(',');
            const skewX = Math.PI / 180 * parseFloat(parts[0]);
            const skewY = Math.PI / 180 * parseFloat(parts[1]);
            // Apply skew: transform(1, tan(skewY), tan(skewX), 1, 0, 0)
            const skewMatrix = new Matrix2D(1, skewY, skewX, 1, 0, 0);
            m.cloneFrom(Matrix2D.multiply(skewMatrix, m));
            m.translate(-refX, -refY);
        }
        else if (t.length > 7 && t.substring(0, 7).toLowerCase() === 'matrix(') {
            let command = t.substring(7, t.length - 1);
            let refX = origin.x;
            let refY = origin.y;
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                command = command.substring(0, command.indexOf('('));
                const center = Point.parse(centerString);
                refX += center.x;
                refY += center.y;
                m.translate(origin.x + center.x, origin.y + center.y);
            }
            else {
                m.translate(origin.x, origin.y);
            }
            const parts = command.split(',');
            const custom = new Matrix2D(
                parseFloat(parts[0]),
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3]),
                parseFloat(parts[4]),
                parseFloat(parts[5])
            );
            m.cloneFrom(Matrix2D.multiply(custom, m));
            m.translate(-refX, -refY);
        }

        return m;
    }

    /**
     * Extracts the rotation angle (in radians) from a Matrix2D
     * @param m - Transform matrix
     * @returns Rotation angle in radians
     */
    public static getRotationAngle(m: Matrix2D): number {
        return Math.atan2(m.m12, m.m11);
    }

    /**
     * Constructs a new matrix
     */
    constructor(
        public m11: number,
        public m12: number,
        public m21: number,
        public m22: number,
        public offsetX: number,
        public offsetY: number
    ) {
        this.cloneFrom = this.cloneFrom.bind(this);
        this.translate = this.translate.bind(this);
        this.scale = this.scale.bind(this);
        this.rotate = this.rotate.bind(this);
    }

    /**
     * Clones values from another matrix into this matrix
     * @param that - Matrix to clone into this
     * @returns This matrix
     */
    public cloneFrom(that: Matrix2D): Matrix2D {
        this.m11 = that.m11;
        this.m12 = that.m12;
        this.m21 = that.m21;
        this.m22 = that.m22;
        this.offsetX = that.offsetX;
        this.offsetY = that.offsetY;
        return this;
    }

    /**
     * Translates this matrix by a given amount
     * @param tx - X translation
     * @param ty - Y translation
     * @returns This matrix
     */
    public translate(tx: number, ty: number): Matrix2D {
        const r = new Matrix2D(1, 0, 0, 1, tx, ty);
        this.cloneFrom(Matrix2D.multiply(r, this));
        return this;
    }

    /**
     * Scales this matrix by given x and y scaling factors
     * @param sx - X scaling factor
     * @param sy - Y scaling factor
     * @returns This matrix
     */
    public scale(sx: number, sy: number): Matrix2D {
        const r = new Matrix2D(sx, 0, 0, sy, 0, 0);
        this.cloneFrom(Matrix2D.multiply(r, this));
        return this;
    }

    /**
     * Rotates this matrix by a given angle
     * @param angle - Angle of rotation
     * @returns This matrix
     */
    public rotate(angle: number): Matrix2D {
        const r = new Matrix2D(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0);
        this.cloneFrom(Matrix2D.multiply(r, this));
        return this;
    }

    /**
     * Computes the inverse of this matrix
     * @returns Inverse matrix, or identity if not invertible
     */
    public inverse(): Matrix2D {
        const det = this.m11 * this.m22 - this.m12 * this.m21;
        if (Math.abs(det) < 1e-10) {
            return new Matrix2D(1, 0, 0, 1, 0, 0);
        }
        const invDet = 1 / det;
        return new Matrix2D(
            this.m22 * invDet,
            -this.m12 * invDet,
            -this.m21 * invDet,
            this.m11 * invDet,
            (this.m21 * this.offsetY - this.m22 * this.offsetX) * invDet,
            (this.m12 * this.offsetX - this.m11 * this.offsetY) * invDet
        );
    }

    /**
     * Transforms a point by this matrix
     * @param p - Point to transform
     * @returns Transformed point
     */
    public transformPoint(p: Point): Point {
        return new Point(
            this.m11 * p.x + this.m21 * p.y + this.offsetX,
            this.m12 * p.x + this.m22 * p.y + this.offsetY
        );
    }

    /**
     * Transforms a direction vector by this matrix (ignores translation)
     * @param dx - X component
     * @param dy - Y component
     * @returns Transformed vector as a Point
     */
    public transformVector(dx: number, dy: number): Point {
        return new Point(
            this.m11 * dx + this.m21 * dy,
            this.m12 * dx + this.m22 * dy
        );
    }
}
