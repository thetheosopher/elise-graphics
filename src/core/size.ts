export class Size {
  /**
   * Empty size
   */
  public static Empty: Size = new Size(0, 0);

  /**
   * Size factory function
   * @param width - Width for new size
   * @param height - Height for new size
   */
  public static create(width: number, height: number): Size {
    return new Size(width, height);
  }

  /**
   * Parses a size described as a string or clones existing size
   * @param sizeSource - Size string description or size to clone
   * @returns Parsed or cloned size
   */
  public static parse(sizeSource: string | Size): Size {
    if (typeof sizeSource === 'string') {
      const parts = sizeSource.split('x');
      const width = parseFloat(parts[0]);
      const height = parseFloat(parts[1]);
      return new Size(width, height);
    } else {
      return new Size(sizeSource.width, sizeSource.height);
    }
  }

  /**
   * Returns a new scaled size
   * @param s - Size to scale
   * @param scaleX - Horizontal scale factor
   * @param scaleY - Vertical scale factor
   * @returns Scaled size
   */
  public static scale(s: Size, scaleX: number, scaleY: number): Size {
    return new Size(s.width * scaleY, s.height * scaleY);
  }

  private _width: number;
  private _height: number;

  /**
   * Constructs a new size object
   * @classdesc Describes the size of a rectangular object or region
   * @param width - Width
   * @param width - Height
   */
  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;

    this.clone = this.clone.bind(this);
    this.equals = this.equals.bind(this);
    this.toString = this.toString.bind(this);
  }

  /**
   * Clones this size to a new instance
   * @returns Clone of size
   */
  public clone(): Size {
    return new Size(this._width, this._height);
  }

  /**
   * Width
   * @returns Width
   */
  get width(): number {
    return this._width;
  }

  /**
   * Height
   * @returns Height
   */
  get height(): number {
    return this._height;
  }

  /**
   * Compares this size with another for equality
   * @param that - Size to compare with this
   * @returns True if that Size matches this
   */
  public equals(that: Size): boolean {
    return that !== null && this.width === that.width && this.height === that.height;
  }

  /**
   * Describes size as a string
   * @returns Description of size
   */
  public toString(): string {
    return this.width + 'x' + this.height;
  }
}
