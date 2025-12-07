/**
 * Any JSON type, including arrays and structures.
 */
export type JsonType = null | boolean | number | string | Array<JsonType> | { [field: string]: JsonType };

/**
 * A unique symbol representing an array "hole" in Javascript.
 */
export const SYMBOL_ARRAY_HOLE = Symbol("ARRAY_HOLE");

/**
 * An object that knows how to serialize and unserialize some object-type.
 * Has a stable name, so it can be registered and invoked.
 */
export interface ISerializeInstructions<T> {
  /**
   * Unique name of the type, used to identify it in the serialization stream.
   */
  name: string,
  /**
   * Seralizes an object into the given buffer.
   */
  serialize(buf: PackedBuffer, obj: T): void,
  /**
   * Unserialize an instance of the object from the given buffer.
   */
  unserialize(buf: PackedBuffer): T,
}

/**
 * An object that has instructions for how to serialize and unserialize it.
 * 
 * It's separated from the instructions, because we need the instructions object to unserialize new instances later.
 */
export interface ISerializable<T> {
  serializationInstructions: ISerializeInstructions<T>;
}

/**
 * Run-time type guard for an object for which we can register a serialization routine.
 */
function isObjectSerializable(x: any): x is ISerializable<any> {
  return x && typeof x === "object" && "serializationInstructions" in x && typeof x.serializationInstructions === "object";
}

/**
 * A type that we can serialize automatically, sometimes occupying more bytes
 * (if e.g. types need to be encoded), but easily marshalling more arbitrary data.
 */
export type Serializable = undefined | null | boolean | number | string | typeof SYMBOL_ARRAY_HOLE
  | Date
  | Serializable[] | Set<Serializable>
  | { [field: string]: Serializable }
  | ISerializable<any>;

const TYPE_NULL = 0;
const TYPE_FALSE = 1;
const TYPE_TRUE = 2;
const TYPE_INTEGER = 3;
const TYPE_SMALLPOS_INTEGER = 4;
const TYPE_STRING = 5;
const TYPE_JSON = 6;
const TYPE_POSITIVE_INFINITY = 7;
const TYPE_NEGATIVE_INFINITY = 8;
const TYPE_NAN = 9;
const TYPE_UNDEFINED = 10;
const TYPE_STRING_LENGTH_ZERO = 11;
const TYPE_STRING_LENGTH_ONE = 12;
const TYPE_ARRAY_HOLE = 13;
const TYPE_ARRAY = 14;
const TYPE_SET = 15;
const TYPE_DATE = 16;
const TYPE_STROBJECT = 17;
const TYPE_REGISTERED = 18;
const TYPE_SMALLINT_ZERO = 100;
const TYPE_SMALLINT_MAX = 250;

/**
 * Returns the byte length of an utf8 string
 */
// function getUtf8ByteLength( str:string ) {
//     var s = str.length;
//     for (var i=str.length-1; i>=0; i--) {
//       var code = str.charCodeAt(i);
//       if (code > 0x7f && code <= 0x7ff) s++;
//       else if (code > 0x7ff && code <= 0xffff) s+=2;
//       if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
//     }
//     return s;
// }

export class PackedBuffer {

  public buf: Uint8Array;
  public idx: number = 0;
  private tokenList: string[] = [];
  private tokenMap = new Map<string, number>();
  private registeredSerializers = new Map<string, ISerializeInstructions<any>>();

  constructor(a?: Uint8Array) {
    this.buf = a ? a : new Uint8Array(1024);
  }

  getByteArray(): Uint8Array {
    return this.buf.subarray(0, this.idx);
  }

  getBuffer(): Buffer {
    return Buffer.from(this.getByteArray())
  }

  rewind(): this {
    this.idx = 0;
    this.tokenList = [];  // because we need to be able to re-read tokens as the "first time" we've seen them.
    return this
  }

  /**
   * Registers a serializer for a given type.
   */
  registerSerializer<T>(serializer: ISerializeInstructions<T>): this {
    this.registeredSerializers.set(serializer.name, serializer);
    return this
  }

  /**
   * Gets number of bytes allocated, which is typically more than the current index, i.e. more than is currently in-use.
   */
  get length(): number {
    return this.buf.length;
  }

  /**
   * Converts the entire buffer to a Base64-encoded string.
   */
  toBase64(): string {
    return this.getBuffer().toString('base64')
  }

  /**
   * Returns a new `PackedBuffer` sourced from a Base64-encoded string.
   */
  static fromBase64(base64: string): PackedBuffer {
    return new PackedBuffer(new Uint8Array(Buffer.from(base64, 'base64')))
  }

  ensureMoreSpace(additionalBytes: number): this {
    const len = this.buf.length;
    const newLen = this.idx + additionalBytes;
    if (len < newLen) {
      const newSize = Math.max(len * 2, newLen * 1.5);      // allocate more, and more after that to avoid lots of reallocations
      // console.log("expanding from",len,"to",newLen)
      const newBuf = new Uint8Array(newSize);
      newBuf.set(this.buf.subarray(0, this.idx));       // copy over the bytes that are already written
      this.buf = newBuf;
    }
    return this
  }

  writeByte(x: number): this {
    this.ensureMoreSpace(4);
    this.buf[this.idx++] = x;
    return this
  }

  readByte(): number {
    return this.buf[this.idx++];
  }

  writeSmallNonNegativeInteger(x: number): this {
    this.ensureMoreSpace(4);
    const buf = this.buf;
    if (x > 2147483647) throw new Error(`small positive integers must be smaller than 2147483647 = 2^31-1, but was given ${x}`);

    // Emit bytes, leaving high bit clear when we're finished.
    while (x >= 128) {
      buf[this.idx++] = (x & 0x7f) | 0x80;
      x >>= 7;
    }
    buf[this.idx++] = x;
    return this
  }

  readSmallNonNegativeInteger(): number {
    let x = 0;
    let shift = 0;
    let next;
    const buf = this.buf;

    while ((next = buf[this.idx++]) & 0x80) {
      x |= (next & 0x7f) << shift;
      shift += 7;
    }
    return x | (next << shift);
  }

  writeUInt31(x: number): this {
    this.ensureMoreSpace(4);
    if (x > 2147483647) throw new Error(`small positive integers must be smaller than 2147483647 = 2^31-1, but was given ${x}`);
    const idx = this.idx;
    const buf = this.buf;
    buf[idx] = (x >> 24) & 0xff;
    buf[idx + 1] = (x >> 16) & 0xff;
    buf[idx + 2] = (x >> 8) & 0xff;
    buf[idx + 3] = (x) & 0xff;
    this.idx += 4;
    return this
  }

  readUInt31(): number {
    const idx = this.idx += 4;
    const buf = this.buf;
    return (((((buf[idx - 4] << 8) | buf[idx - 3]) << 8) | buf[idx - 2]) << 8) | buf[idx - 1];
  }

  writeUInt24(x: number): this {
    this.ensureMoreSpace(4);
    if (x > 16777215) throw new Error(`small positive integers must be smaller than 16777215 = 2^24-1, but was given ${x}`);
    const idx = this.idx;
    const buf = this.buf;
    buf[idx] = (x >> 16) & 0xff;
    buf[idx + 1] = (x >> 8) & 0xff;
    buf[idx + 2] = (x) & 0xff;
    this.idx += 3;
    return this
  }

  readUInt24(): number {
    const idx = this.idx += 3;
    const buf = this.buf;
    return ((((buf[idx - 3]) << 8) | buf[idx - 2]) << 8) | buf[idx - 1];
  }

  writeInteger(x: number): this {
    this.ensureMoreSpace(9);
    const buf = this.buf;

    // Build up a potential header byte, if the integer is large and/or negative
    let headerByte = 0x00;
    if (x < 0) {
      headerByte |= 0x80;
      x = -x;
    }
    const headerIdx = this.idx++;       // we'll come back and place the final answer here.

    // Emit bytes, until there's no more
    while (x > 2147000000) {         // big numbers require slower code to be accurate, but it's necessary >= 2^31
      buf[this.idx++] = x % 256;
      x = Math.floor(x / 256);
      ++headerByte;
    }
    while (x) {                       // this loop is 10x faster, and a very common case
      buf[this.idx++] = x & 0xff;
      x >>= 8;
      ++headerByte;
    }
    buf[headerIdx] = headerByte;        // go back and write the header with the number of bytes we emitted
    return this
  }

  readInteger(): number {
    let x = 0;
    let shift = 1;
    let next;
    const buf = this.buf;

    // Read header
    let headerByte = buf[this.idx++];
    const isNegative = headerByte & 0x80;

    // Build the number up
    headerByte &= 0x1f;     // just the byte count
    for (let k = 0; k < headerByte; ++k) {
      x += buf[this.idx++] * shift;
      shift *= 256;
    }
    return isNegative ? -x : x;
  }

  /**
   * Writes a byte array, optionally with dynamic length
   * 
   * @param a the byte array to write
   * @param fixedLength if omitted or `undefined`, the length is written first, to be decoded dynamically, otherwise this number of bytes is written without encoding a length.
   */
  writeByteArray(a: Uint8Array, fixedLength?: number): this {
    const len = fixedLength ?? a.byteLength;
    this.ensureMoreSpace(len + 10);
    if (fixedLength === undefined) {
      this.writeSmallNonNegativeInteger(len);
    }
    this.buf.set(a, this.idx);
    this.idx += len;
    return this
  }

  /**
   * Reads a byte array, optionally with dynamic length
   * 
   * @param fixedLength if omitted or `undefined`, the length is read from the stream, and decoded dynamically, otherwise this number of bytes that should be read.
   */
  readByteArray(fixedLength?: number): Uint8Array {
    const len = fixedLength ?? this.readSmallNonNegativeInteger();
    if (!len) return new Uint8Array(0);           // weird special case where the "view" doesn't limit itself
    const a = this.buf.subarray(this.idx, this.idx + len);      // a view!
    this.idx += len;
    return a;
  }

  writeString(s: string): this {
    // This used to just be: this.writeByteArray(encodeString(s))
    // The profiler indicated this as a hotspot, therefore we updated our code to encode the string directly
    // into the output buffer, avoiding the `malloc()` and `memcpy()` of the temporary UTF-8-encoded buffer.
    // const utf8Length = getUtf8ByteLength(s);
    // this.ensureMoreSpace( utf8Length + 10 );
    // this.writeSmallPositiveInteger(utf8Length);     // write pre-computed length
    // const result = encodeStringInto( s, this.buf.subarray( this.idx ) );    // write directly into the buffer
    // // istanbul ignore next - this assertion _should_ never happen!  Shouldn't even be possible to test it.
    // if ( result.written !== utf8Length ) throw new Error(`wrote string length ${result.written}, different from computed ${utf8Length}`);
    // this.idx += utf8Length;
    if (!s) {     // this would happen anyway, but it's common, and this is fast.
      this.writeSmallNonNegativeInteger(0)
      return this;
    }

    this.ensureMoreSpace(s.length * 3 + 10);
    this.writeSmallNonNegativeInteger(s.length);
    for (let k = 0; k < s.length; ++k) {
      this.writeSmallNonNegativeInteger(s.charCodeAt(k));
    }
    return this
  }

  readString(): string {
    // return decodeString(this.readByteArray());      // this is efficient because it's a new view, not a new buffer
    const len = this.readSmallNonNegativeInteger();
    let s = "";
    for (let k = 0; k < len; ++k) {
      s += String.fromCharCode(this.readSmallNonNegativeInteger());
    }
    return s;
  }

  /**
   * Writes arbitrary JSON-compatible data.
   */
  writeJson(x: JsonType): this {
    return this.writeString(JSON.stringify(x));
  }

  readJson(): JsonType {
    const str = this.readString();
    return JSON.parse(str);
  }

  /**
   * Writes an array, given a routine that will write the contents of each element.
   */
  writeArray<T>(a: T[], writeEl: (buf: PackedBuffer, el: T) => void): this {
    const len = a.length;
    this.writeSmallNonNegativeInteger(len);
    for (let k = 0; k < len; ++k) {
      writeEl(this, a[k]);
    }
    return this
  }

  /**
   * Reads and returns an array, given a routine that will read the contents of each element.
   */
  readArray<T>(readEl: (buf: PackedBuffer) => T): T[] {
    const len = this.readSmallNonNegativeInteger();
    const result: T[] = new Array(len);
    for (let k = 0; k < len; ++k) {
      result[k] = readEl(this);
    }
    return result;
  }

  /**
   * Writes a string that we expect to repeat often; we save them once in a table rather than
   * repeating them in the output.  For example, Replica IDs.
   */
  writeToken(s: string): this {
    let t = this.tokenMap.get(s);
    if (t === undefined) {
      t = this.tokenMap.size;
      this.tokenMap.set(s, t);
      this.writeSmallNonNegativeInteger(t);      // emit the new token
      this.writeString(s);                    // but then immediately emit the string so we can accumulate it upon reading
    } else {
      this.writeSmallNonNegativeInteger(t);
    }
    return this
  }

  readToken(): string {
    const t = this.readSmallNonNegativeInteger();
    if (t >= this.tokenList.length) {
      this.tokenList[t] = this.readString();
    }
    return this.tokenList[t];
  }

  /**
   * Writes a specific serializable object, along with a type token that allows us to unseralize it later.
   */
  writeRegisteredSerializable(x: ISerializable<any>): this {
    const inst = x.serializationInstructions
    this.writeToken(inst.name)
    inst.serialize(this, x)
    return this
  }

  readRegisteredSerializable<T>(): ISerializable<T> {
    const name = this.readToken();
    const inst = this.registeredSerializers.get(name);
    if (!inst) throw new Error(`no registered serializer for type: ${name}`);
    return inst.unserialize(this)
  }

  /**
   * Write any serializable type. The primatives take no more space than if they were encoded directly.
   * More complex types are encoded efficiently, but probably not quite as well as if they had specialized algorithms.
   * With objects, fields are encoded as tokens, anticipating having many of the same type of object.
   */
  writeSerializable(x: Serializable): this {
    // istanbul ignore next
    if (this.idx + 10 >= this.length) {    // this "unneeded" check is due to profiler hotspot analysis
      this.ensureMoreSpace(10);
    }
    if (x === null) {
      this.buf[this.idx++] = TYPE_NULL;
    } else if (typeof x === "boolean") {
      this.buf[this.idx++] = x ? TYPE_TRUE : TYPE_FALSE;
    } else if (typeof x === "number") {
      if (!Number.isSafeInteger(x)) {          // complicated?
        if (Number.isNaN(x)) this.buf[this.idx++] = TYPE_NAN;
        else if (x === Number.POSITIVE_INFINITY) this.buf[this.idx++] = TYPE_POSITIVE_INFINITY;
        else if (x === Number.NEGATIVE_INFINITY) this.buf[this.idx++] = TYPE_NEGATIVE_INFINITY;
        else {                              // floating point relies on JSON for now; we could emit bytes instead?
          this.buf[this.idx++] = TYPE_JSON;
          this.writeJson(x);
        }
      } else if (x >= 0 && x < TYPE_SMALLINT_MAX - TYPE_SMALLINT_ZERO) {     // really tiny?  header can encode it!
        this.buf[this.idx++] = x + TYPE_SMALLINT_ZERO;
      } else if (x >= 0 && x <= 2147483647) {                 // small enough for our more compact and fast representation
        this.buf[this.idx++] = TYPE_SMALLPOS_INTEGER;
        this.writeSmallNonNegativeInteger(x);
      } else {
        this.buf[this.idx++] = TYPE_INTEGER;
        this.writeInteger(x);
      }
    } else if (typeof x === "undefined") {
      this.buf[this.idx++] = TYPE_UNDEFINED;
    } else if (typeof x === "string") {
      if (x.length === 0) {
        this.buf[this.idx++] = TYPE_STRING_LENGTH_ZERO;
      } else if (x.length === 1) {
        this.buf[this.idx++] = TYPE_STRING_LENGTH_ONE;        // common case for collaborative text, and we can be especially space-efficient
        this.writeSmallNonNegativeInteger(x.charCodeAt(0));
      } else {
        this.buf[this.idx++] = TYPE_STRING;
        this.writeString(x);
      }
    } else if (x === SYMBOL_ARRAY_HOLE) {
      this.buf[this.idx++] = TYPE_ARRAY_HOLE;
    } else if (x instanceof Date) {
      this.buf[this.idx++] = TYPE_DATE;
      this.writeInteger(x.getTime());
    } else if (Array.isArray(x)) {
      this.buf[this.idx++] = TYPE_ARRAY;
      this.writeArray(x, (buf, el) => buf.writeSerializable(el));
    } else if (x instanceof Set) {
      this.buf[this.idx++] = TYPE_SET;
      this.writeArray(Array.from(x), (buf, el) => buf.writeSerializable(el));
    } else if (isObjectSerializable(x)) {
      this.buf[this.idx++] = TYPE_REGISTERED;
      this.writeRegisteredSerializable(x);
    } else if (typeof x === "object") {
      this.buf[this.idx++] = TYPE_STROBJECT;
      this.writeArray(Object.entries(x), (buf, el) => buf.writeToken(el[0]).writeSerializable(el[1]));
    }
    return this
  }

  /**
   * Reads a `Serializable` value.  If the caller knows the type, it can give that to Typescript.
   */
  readSerializable(): Serializable {
    const t = this.buf[this.idx++];
    if (t >= TYPE_SMALLINT_ZERO && t <= TYPE_SMALLINT_MAX) {
      return t - TYPE_SMALLINT_ZERO;
    }
    switch (t) {
      case TYPE_NULL: return null;
      case TYPE_FALSE: return false;
      case TYPE_TRUE: return true;
      case TYPE_INTEGER: return this.readInteger();
      case TYPE_SMALLPOS_INTEGER: return this.readSmallNonNegativeInteger();
      case TYPE_STRING_LENGTH_ZERO: return "";
      case TYPE_STRING_LENGTH_ONE: return String.fromCharCode(this.readSmallNonNegativeInteger());
      case TYPE_STRING: return this.readString();
      case TYPE_JSON: return this.readJson() as Serializable;   // we only pick this for things that were serializable, e.g. floats
      case TYPE_UNDEFINED: return undefined;
      case TYPE_POSITIVE_INFINITY: return Number.POSITIVE_INFINITY
      case TYPE_NEGATIVE_INFINITY: return Number.NEGATIVE_INFINITY
      case TYPE_NAN: return Number.NaN;
      case TYPE_ARRAY_HOLE: return SYMBOL_ARRAY_HOLE;
      case TYPE_DATE: return new Date(this.readInteger());
      case TYPE_ARRAY: return this.readArray((buf) => buf.readSerializable());
      case TYPE_SET: return new Set(this.readArray((buf) => buf.readSerializable()));
      case TYPE_STROBJECT: return Object.fromEntries(this.readArray((buf) => { const k = buf.readToken(); return [k, buf.readSerializable()] }));
      case TYPE_REGISTERED: return this.readRegisteredSerializable();

    }
    throw new Error(`invalid serializable prefix byte: ${t}`);
  }
}
