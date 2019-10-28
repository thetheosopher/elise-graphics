export class Matrix2D {
  public static IDENTITY: Matrix2D = new Matrix2D(1, 0, 0, 1, 0, 0);

  /**
   * Matrix factory function
   * @returns New matrix
   */
  public static create(m11: number, m12: number, m21: number, m22: number, offsetX: number, offsetY: number): Matrix2D {
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
   * Constructs a new matrix
   * @classdesc Represents a 2D transform matrix
   */
  constructor(
    public m11: number,
    public m12: number,
    public m21: number,
    public m22: number,
    public offsetX: number,
    public offsetY: number,
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
}
