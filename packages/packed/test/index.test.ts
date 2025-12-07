import { PackedBuffer, JsonType, Serializable, SYMBOL_ARRAY_HOLE, ISerializable, ISerializeInstructions } from '../src/index'

/**
 * Returns the set of Fibbonaci numbers from 0 to `max` inclusive.
 */
function getFibonaccis(max: number): number[] {
  const s = [0]
  let a = 0;
  let b = 1;
  while (b <= max) {
    s.push(b);
    [a, b] = [b, a + b];
  }
  return s;
}

test("bytes", () => {
  const buf = new PackedBuffer(new Uint8Array(1024));
  const writer = buf.writeByte.bind(buf);
  expect(buf.length).toEqual(1024); // default size

  const tst = (n: number) => {
    buf.rewind();
    for (let k = 0; k < n; ++k) {
      writer((k + 17) & 0xff);
    }
    const bufCopy = buf.getByteArray();
    if (bufCopy.length !== n) expect(bufCopy.length).toEqual(n);
    buf.rewind();
    for (let k = 0; k < n; ++k) {
      const r = buf.readByte();
      const ex = (k + 17) & 0xff;
      if (r !== ex /* jest speedup */) expect(r).toEqual(ex);
    }
  }

  for (let k = 1; k < 2000; ++k) {
    tst(k);
  }
  expect(buf.length).toEqual(2048); // has been expanded
});

test("small positive integers", () => {
  const buf = new PackedBuffer();
  const writer = buf.writeSmallNonNegativeInteger.bind(buf);
  const reader = buf.readSmallNonNegativeInteger.bind(buf);
  const tst = (x: number) => {
    buf.rewind();
    writer(x);
    buf.rewind();
    const result = reader();
    if (result !== x) {       // looks dumb, but this makes the tests (no joke) 100x faster.
      expect(result).toEqual(x);
    }
  }

  for (let k = 0; k < (1 << 20); ++k) {
    tst(k);
  }
  for (const k of getFibonaccis(Math.pow(2, 31))) {
    tst(k);
  }
  expect(() => tst(3000000000)).toThrow();
  expect(() => tst(Number.MAX_SAFE_INTEGER)).toThrow();
});

test("fixed unsigned 31-bit integers", () => {
  const buf = new PackedBuffer();
  const writer = buf.writeUInt31.bind(buf);
  const reader = buf.readUInt31.bind(buf);
  const tst = (x: number) => {
    buf.rewind();
    writer(x);
    buf.rewind();
    const result = reader();
    if (result !== x) {       // looks dumb, but this makes the tests (no joke) 100x faster.
      expect(result).toEqual(x);
    }
  }

  for (const k of getFibonaccis(Math.pow(2, 31))) {
    tst(k);
    tst(k + 1);
    tst(k + 2);
    tst(k + 3);
    tst(k + 4);
  }
  tst(2147483647);
  expect(() => tst(2147483648)).toThrow();
  expect(() => tst(3000000000)).toThrow();
  expect(() => tst(Number.MAX_SAFE_INTEGER)).toThrow();
});

test("fixed unsigned 24-bit integers", () => {
  const buf = new PackedBuffer();
  const writer = buf.writeUInt24.bind(buf);
  const reader = buf.readUInt24.bind(buf);
  const tst = (x: number) => {
    buf.rewind();
    writer(x);
    buf.rewind();
    const result = reader();
    if (result !== x) {       // looks dumb, but this makes the tests (no joke) 100x faster.
      expect(result).toEqual(x);
    }
  }

  for (const k of getFibonaccis(Math.pow(2, 24))) {
    tst(k);
    tst(k + 1);
    tst(k + 2);
    tst(k + 3);
    tst(k + 4);
  }
  tst(16777215);
  expect(() => tst(16777216)).toThrow();
  expect(() => tst(16777230)).toThrow();
  expect(() => tst(167772160)).toThrow();
  expect(() => tst(Number.MAX_SAFE_INTEGER)).toThrow();
});

test("integers", () => {
  const buf = new PackedBuffer();
  const writer = buf.writeInteger.bind(buf);
  const reader = buf.readInteger.bind(buf);
  const tst = (x: number) => {

    // positive
    buf.rewind();
    writer(x);
    writer(-x);
    buf.rewind();
    const result = reader();
    const result2 = reader();
    if (result !== x) {       // looks dumb, but this makes the tests (no joke) 100x faster.
      expect(result).toEqual(x);
    }
    if (result2 !== -x) {       // looks dumb, but this makes the tests (no joke) 100x faster.
      expect(result2).toEqual(-x);
    }
  }

  for (let k = 0; k < (1 << 19); ++k) {
    tst(k);
  }
  tst(1000000000);
  tst(2000000000);
  tst(3000000000);
  tst(4000000000);
  tst(5000000000);
  tst(10000000000);
  tst(100000000000);
  tst(1000000000000);
  tst(10000000000000);
  tst(100000000000000);
  tst(Number.MAX_SAFE_INTEGER);
});

test("byte buffers", () => {
  const buf = new PackedBuffer();
  const writer = buf.writeByteArray.bind(buf);
  const reader = buf.readByteArray.bind(buf);
  const tst = (x: Uint8Array) => {
    for (let i = 0; i < x.byteLength; ++i) {        // some sort of content
      x[i] = i & 0xff;
    }
    buf.rewind();
    writer(x);
    buf.rewind();
    const result = reader();
    expect(result).toEqual(x);

    buf.rewind();
    writer(x, x.byteLength);
    buf.rewind();
    const result2 = reader(x.byteLength);
    expect(result2).toEqual(x);
  }

  tst(new Uint8Array(0));
  tst(new Uint8Array(1));
  tst(new Uint8Array(2));
  tst(new Uint8Array(3));
  tst(new Uint8Array(8));
  tst(new Uint8Array(50));
  tst(new Uint8Array(100));
  tst(new Uint8Array(1000));
  tst(new Uint8Array(10000));
});

test("strings", () => {
  const buf = new PackedBuffer();
  const writer = buf.writeString.bind(buf);
  const reader = buf.readString.bind(buf);
  const tst = (x: string) => {
    buf.rewind();
    writer(x);
    buf.rewind();
    const result = reader();
    expect(result).toEqual(x);
  }

  tst("");
  tst("a");
  tst("ab");
  tst("abc");
  tst("Hello.  This is a longer string.  But that's a good thing.");
  tst("Hello.  This is a longer string.  But that's a good thing.".repeat(10));
  tst("Hello.  This is a longer string.  But that's a good thing.".repeat(100));
  tst("Hello.  This is a longer string.  But that's a good thing.".repeat(1000));
  tst("Hello.  This is a longer string.  But that's a good thing.".repeat(10000));
  tst("Hi\nthere\tyou.");
  tst("\x00\x01\xff\x00");
  tst("\x00\x01\x7f\x00");
  tst("\u1234\u4321\u6034\ufefe\uffee\uffff\ufffe");
  tst("\ud83c\udf09");
});

test("tokens", () => {
  const buf = new PackedBuffer();
  buf.writeToken("foo");
  buf.writeToken("bar");
  const lenFirst = buf.getByteArray().length;
  buf.writeToken("foo");
  buf.writeToken("bar");
  const lenSecond = buf.getByteArray().length;
  expect(lenSecond - lenFirst).toBeLessThan(lenFirst);      // used fewer bytes the second time
  buf.rewind();
  expect(buf.readToken()).toEqual("foo");
  expect(buf.readToken()).toEqual("bar");
  expect(buf.readToken()).toEqual("foo");
  expect(buf.readToken()).toEqual("bar");
});

test("json", () => {
  const buf = new PackedBuffer();
  const writer = buf.writeJson.bind(buf);
  const reader = buf.readJson.bind(buf);
  const tst = (x: JsonType) => {
    buf.rewind();
    writer(x);
    buf.rewind();
    const result = reader();
    expect(result).toEqual(x);
  }

  tst(null);
  tst(true);
  tst(false);
  tst(0);
  tst(1);
  tst(-1);
  tst(123.456);
  tst(-23.456);
  tst(Number.MAX_SAFE_INTEGER);
  tst(Number.MIN_SAFE_INTEGER);
  tst("Hello.  This is a longer string.  But that's a good thing.");
  tst("\u1234\u4321\u6034\ufefe\uffee\uffff\ufffe");
  tst([]);
  tst([1, "hi", true]);
  tst({});
  tst({ a: 1, b: "hi", c: null, d: false });
});

test("array (with callback)", () => {
  const buf = new PackedBuffer();
  const tst = (n: number) => {
    const a: number[] = [];
    while (--n >= 0) {
      switch (n % 3) {
        case 0: a[n] = n * 2; break;
        case 1: a[n] = n * n; break;
        case 2: a[n] = n - 3; break;
      }
    }
    buf.rewind();
    buf.writeArray(a, (buf, el) => buf.writeInteger(el));
    buf.rewind();
    const result = buf.readArray((buf) => buf.readInteger());
    expect(result).toEqual(a);
  }

  for (let k = 0; k < 100; ++k) {
    tst(k);
  }
});

test("serializable built-ins", () => {
  const scalars: Serializable[] = [
    0, 1, -1, 123, 3.1456, -234234, -1234.5678,
    Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE, Number.MAX_VALUE,
    Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
    true, false,
    undefined, null, SYMBOL_ARRAY_HOLE,
    "", "a", "123", "0", "foo", "ab\ncd", "\x00\x01\xff\x00", "\x00\x01\x7f\x00", "\u1234\u4321\u6034\ufefe\uffee\uffff\ufffe", "\ud83c\udf09",
    [], [1], [undefined], [null, undefined, "123", "", ["taco", []], []],
    new Set(), new Set([1, 2, "foo", 1, 2, 3]),
    new Date(), new Date(1234567890),
    {}, { foo: 1 }, { bar: [1, 2, { baz: "bat" }], a: 1.23456, b: new Date(), c: undefined, d: "c" },
  ]
  for (let i = -10000; i < 10000; ++i) scalars.push(i);   // integers around the "small" boundaries, where we might have optimizations

  const buf = new PackedBuffer();
  const tst = (x: Serializable) => {
    buf.rewind()
    buf.writeSerializable(x)
    buf.rewind()
    const y = buf.readSerializable()
    expect(y).toEqual(x)
  }
  for (const x of scalars) {
    tst(x)
  }

  // test invalid type
  buf.rewind()
  buf.writeByte(255)
  buf.rewind()
  expect(() => buf.readSerializable()).toThrow()

})

test("serialized custom type", () => {
  class CustomSerialization implements ISerializeInstructions<CustomObject> {
    name = "mr. taco"
    serialize(buf: PackedBuffer, obj: CustomObject): void {
      buf.writeInteger(obj.foo)
      buf.writeString(obj.bar)
    }
    unserialize(buf: PackedBuffer) {
      const obj = new CustomObject()
      obj.foo = buf.readInteger()
      obj.bar = buf.readString()
      return obj
    }
  }
  const custSer = new CustomSerialization()
  class CustomObject implements ISerializable<CustomObject> {
    foo: number = 0
    bar: string = ""
    serializationInstructions = custSer
  }
  const origObj = new CustomObject()
  origObj.foo = 123
  origObj.bar = "hello"

  const buf = new PackedBuffer()
  buf.writeSerializable(origObj)
  buf.rewind()
  expect(() => buf.readSerializable()).toThrow() // the instructions aren't registered
  buf.registerSerializer(custSer)
  buf.rewind()
  const newObj = buf.readSerializable()
  expect(newObj instanceof CustomObject).toEqual(true)
  origObj.foo = 321   // change original to show `new` is a new object
  origObj.bar = "goodbye"
  if (newObj instanceof CustomObject) {   // for typescript's benefit; we just asserted it!
    expect(newObj.foo).toEqual(123)
    expect(newObj.bar).toEqual("hello")
  }
})

test('base64 encoding', () => {
  const buf = new PackedBuffer()
  buf.writeSerializable([1, 2, 3])
  const b64 = buf.toBase64()
  const buf2 = PackedBuffer.fromBase64(b64)
  const y = buf2.readSerializable()
  expect(y).toEqual([1, 2, 3])
  expect(buf2.toBase64()).toEqual(b64)
})