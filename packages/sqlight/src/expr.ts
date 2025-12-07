import invariant from 'tiny-invariant';
import * as D from '@asmartbear/dyn'
import { Nullish, SqlType, NativeFor, SqlTypeFor, SqlBoolean, SqlNullable, AnySqlNative } from './types'

/**
 * An input value to a SQL expression, either a supported native constant value or another
 * SQL expression.  The input to `EXPR()`, which converts it to a `SqlExpression`.
 */
export type SqlInputValue<D extends SqlType> = NativeFor<D> | SqlExpression<D>;

/**
 * Conversion of native Typescript values into SQL literals, or passes SqlExpression through unchanged.
 * The result of `EXPR()`.  If you want more specificity in constants (like integers versus floats), use
 * the literal functions like `INT()` and `FLOAT()`.
 */
export type SqlExprFromNative<T> =
    T extends boolean ? SqlLiteral<'BOOLEAN', SqlBoolean> :
    T extends string ? SqlLiteral<'TEXT', T> :
    T extends number ? SqlLiteral<SqlTypeFor<T>, NativeFor<SqlTypeFor<T>>> :
    T extends Date ? SqlLiteral<'TIMESTAMP', T> :
    T extends Buffer ? SqlLiteral<'BLOB', T> :
    T extends SqlExpression<any, any> ? T :
    never;

/**
 * An object that has a SQL type, but also an array or tuple of such objects, or Nullish.
 */
type SqlTypedGeneral<D extends SqlType> =
    Nullish |
    SqlExpression<D> |
    SqlTypedGeneral<D>[] |
    readonly SqlTypedGeneral<D>[];


/** Extracts the `SQLTYPE` type from a `SqlExpression` or a list of expressions */
type SqlTypeOf<E> =
    E extends SqlExpression<infer D, any> ? D :
    E extends SqlExpression<infer D, any>[] ? D :
    never;

/** Extracts the `NULLABLE` type from a `SqlExpression`, or infers from a native type, or a list of the above. */
type NullableOf<E> =
    E extends SqlExpression<any, infer NULLABLE> ? NULLABLE :
    E extends null ? 'sometimes' :
    E extends AnySqlNative ? 'never' :
    E extends Array<infer U> ? NullableOf<U> :
    never;

/** Native type for an expression, including whether `null` is one of the values. */
export type NativeForExpression<E extends SqlExpression> =
    E extends SqlExpression<infer D, infer NULLABLE> ? (NativeFor<D> | ('sometimes' extends NULLABLE ? null : never)) : never;

/** `NULLABLE` type from a list, where it is `sometimes` if any one is `sometimes`, or `never` if all are `never`. */
type SqlAnySometimesNullable<LIST extends readonly SqlInputValue<SqlType>[]> =
    'sometimes' extends NullableOf<LIST> ? 'sometimes' : 'never'

/** If any expression is nullable sometimes, returns `sometimes`; if all are `never`, returns `never`. */
export function anySometimesNullable<LIST extends readonly SqlExpression[]>(list: LIST): SqlAnySometimesNullable<LIST> {
    if (list.length === 0) return 'sometimes' as any
    return (list.every(el => el.nullable === 'never') ? 'never' : 'sometimes') as any
}

/** `NULLABLE` type from a list, where it is `never` if any one is `never`, or `sometimes` if all are `sometimes`. */
type SqlAnyNeverNullable<LIST extends readonly SqlExpression[]> =
    'never' extends NullableOf<LIST> ? 'never' : 'sometimes'

/** If every expression is nullable sometimes, returns `sometimes`; if even one isn't, returns `never`. */
export function anyNeverNullable<LIST extends readonly SqlExpression<any, any>[]>(list: LIST): SqlAnyNeverNullable<LIST> {
    if (list.length === 0) return 'never' as any
    return (list.every(el => el.nullable === 'sometimes') ? 'sometimes' : 'never') as any
}

/** A BOOLEAN-typed literal */
export function BOOL<T extends boolean | SqlBoolean>(x: T) {
    return new SqlBooleanLiteral(x)
}
/** A TEXT-typed literal */
export function STR<T extends string>(x: T) {
    return new SqlStringLiteral(x)
}

/** An INT-typed literal */
export function INT<T extends number>(x: T) {
    return new SqlLiteral('INTEGER', x)
}

/** An REAL-typed literal */
export function FLOAT<T extends number>(x: T) {
    return new SqlLiteral('REAL', x)
}

/** An TIMESTAMP-typed literal */
export function DATE<T extends Date>(x: T) {
    return new SqlDateLiteral(x)
}

/** An BLOB-typed literal */
export function BLOB<T extends Buffer>(x: T) {
    return new SqlBufferLiteral(x)
}

/**
 * Converts a native Typescript value into a SQL literal, or passes a SqlExpression through unchanged.
 * Essentially converts any kind of input value into something SQL understands.
 */
export function EXPR<V extends string | boolean | number | Buffer | Date>(x: V): SqlExprFromNative<V>;
export function EXPR<D extends SqlType>(x: SqlExpression<D>): typeof x;             // pass-through when we know it
export function EXPR<D extends SqlType>(x: SqlInputValue<D>): SqlExpression<D>;     // conversion when it's any input value
export function EXPR(x: SqlExpression<any> | boolean | string | number | Buffer | Date): SqlExpression<any> {
    // istanbul ignore next
    if (x instanceof SqlExpression) return x
    if (typeof x === "string") return STR(x)
    if (typeof x === "number") return Number.isInteger(x) ? INT(x) : FLOAT(x)
    if (typeof x === "boolean") return BOOL(x)
    if (x instanceof Date) return DATE(x)
    if (x instanceof Buffer) return BLOB(x)
    throw new Error(`Unsupported literal type: ${typeof x}: [${x}]`)
}

/**
 * Given a specific SQL type and a native Javascript value, returns a SQL expression for a literal of that type.
 * 
 * In this sense it's like `EXPR()` except with an explicit type, not inferring, which can be more specific and accurate.
 * 
 * If `null` or `undefined` is given as the native value, creates a 'NULL' expression with the given type.
 */
export function LITERAL(type: 'BOOLEAN', x: boolean): SqlExpression<'BOOLEAN', 'never'>;
export function LITERAL<D extends SqlType>(type: D, x: null | undefined): SqlExpression<D, 'sometimes'>;
export function LITERAL<D extends SqlType>(type: D, x: NativeFor<D>): SqlExpression<D, 'never'>;
export function LITERAL<D extends SqlType>(type: D, x: NativeFor<D> | null | undefined | boolean): SqlExpression<D, SqlNullable> {
    if (x === null || x === undefined) return new SqlNullLiteral(type)
    switch (type) {
        case 'BOOLEAN':
            return BOOL(x ? 1 : 0) as any
        case 'TEXT':
        case 'VARCHAR':
            return STR(x as any) as any
        case 'INTEGER':
            return INT(x as any) as any
        case 'REAL':
            return FLOAT(x as any) as any
        case 'TIMESTAMP':
            return DATE(x as any) as any
        case 'BLOB':
            return BLOB(x as any) as any
        // istanbul ignore next
        default: D.NEVER(type)
    }
}

/** Passes expressions through; translates native types to literal expressions. */
export function EXPR2(x: string): SqlExpression<'TEXT', 'never'>;
export function EXPR2<NULLABLE extends SqlNullable>(x: SqlExpression<'TEXT', NULLABLE>): SqlExpression<'TEXT', NULLABLE>;
export function EXPR2(x: SqlInputValue<'TEXT'>): SqlExprFromNative<typeof x>;
export function EXPR2(x: SqlInputValue<'TEXT'>): SqlExprFromNative<typeof x> {
    if (typeof x === "string") return STR(x)
    return x
}

/**
 * Runs `EXPR` against a list of SQL expressions of the same type.
 */
export function EXPRs<D extends SqlType>(list: readonly SqlInputValue<D>[]): readonly SqlExpression<D>[] {
    return list.map(EXPR) as any
}

/**
 * Returns the SQL type from an expression or list of expressions, which also can be Nullish and such.
 * 
 * Returns `undefined` if there's nothing, or nothing in any list.
 */
export function TYPE<D extends SqlType>(...x: SqlTypedGeneral<D>[]): D | undefined {
    if (!x || x.length == 0) return undefined
    for (const s of x) {
        if (!s) continue
        if (s instanceof SqlExpression) return s.type
        const t = TYPE<D>(...s)
        if (t) return t
    }
    return undefined
}

/** Returns the first non-null expression in a list of expressions */
export function COALESCE<LIST extends readonly SqlExpression[]>(...list: LIST): SqlExpression<SqlTypeOf<LIST>, SqlAnyNeverNullable<LIST>> {
    return new SqlMultiFunction2(TYPE(list)!, 'COALESCE', list, anyNeverNullable(list)) as any
}

/** Helper that creates a multi-operator over a fixed type, where "nullable" inherits from whether any can be null, with generic return class. */
function MOP<D extends SqlType, LIST extends readonly SqlExpression[]>(type: D, op: string, list: LIST): SqlExpression<D, SqlAnySometimesNullable<LIST>> {
    return new SqlMultiOperator2(type, op, list, anySometimesNullable(list))
}

/** Helper that creates a multi-function over a fixed type, where "nullable" inherits from whether any can be null, with generic return class. */
function MFUN<D extends SqlType, LIST extends readonly SqlExpression[]>(type: D, op: string, list: LIST): SqlExpression<D, SqlAnySometimesNullable<LIST>> {
    return new SqlMultiFunction2(type, op, list, anySometimesNullable(list))
}

/** Concatenates strings */
export function CONCAT<LIST extends readonly SqlExpression<'TEXT'>[]>(...list: LIST) {
    return MOP('TEXT', '||', list)
}

/** 'AND' operator */
export function AND<LIST extends readonly SqlExpression<'BOOLEAN'>[]>(...list: LIST) {
    return MOP('BOOLEAN', ' AND ', list)
}

/** 'OR' operator */
export function OR<LIST extends readonly SqlExpression<'BOOLEAN'>[]>(...list: LIST) {
    return MOP('BOOLEAN', ' OR ', list)
}

/** 'NOT' operator */
export function NOT<NULLABLE extends SqlNullable>(x: SqlExpression<'BOOLEAN', NULLABLE>): SqlExpression<'BOOLEAN', NULLABLE> {
    return new SqlUnaryOperator('BOOLEAN', 'NOT (', x, ')')
}

/**
 * A series of `CASE WHEN ... THEN ... END` expressions as tuples, and optionally another expression for `ELSE`.
 * If you don't have an expression for `ELSE`, it will return `NULL`.
 */
export function CASE<D extends SqlType>(whenList: readonly [SqlExpression<'BOOLEAN'>, SqlInputValue<D>][], elseExpr?: SqlInputValue<D>): SqlExpression<D> {
    return new SqlCase<D>(whenList.map(pair => [pair[0], EXPR(pair[1])] as const), elseExpr === undefined ? undefined : EXPR(elseExpr))
}

/**
 * Generic base-class for all SQL expressions, which carries a data type and restrictions,
 * and can be converted to SQL.
 */
export abstract class SqlExpression<D extends SqlType = SqlType, NULLABLE extends SqlNullable = SqlNullable> {
    constructor(
        public readonly type: D,
        public readonly nullable: NULLABLE,
    ) { }

    /**
     * Returns SQL for this expression.
     * 
     * @param grouped If true, and if this expression is not already atomic, it needs to be enclosed in parentheses.
     */
    abstract toSql(grouped: boolean): string

    /** Asserts this expression is boolean, throwing exception if not, and telling Typescript in the return value */
    assertIsBoolean(): SqlExpression<'BOOLEAN', NULLABLE> {
        if (this.type === 'BOOLEAN') return this as any
        throw new Error('Expected boolean-typed value, but got: ' + this.type + '; sql=' + this.toSql(false))
    }

    /** Asserts this expression is text-like, throwing exception if not, and telling Typescript in the return value */
    assertIsText(): SqlExpression<'TEXT', NULLABLE> {
        if (this.type === 'TEXT' || this.type === 'VARCHAR') return this as any
        throw new Error('Expected string-typed value, but got: ' + this.type + '; sql=' + this.toSql(false))
    }

    /** Asserts this expression is either `REAL` or `INTEGER`, throwing exception if not, and telling Typescript in the return value */
    assertIsNumeric(): SqlExpression<'REAL' | 'INTEGER', NULLABLE> {
        if (this.type === 'REAL' || this.type === 'INTEGER') return this as any
        throw new Error('Expected numeric-typed value, but got: ' + this.type + '; sql=' + this.toSql(false))
    }

    /** Asserts this expression is of the same type as another, and telling Typescript in the return value */
    assertIsType<D2 extends SqlType>(type: D2): SqlExpression<D2, NULLABLE> {
        if (this.type as SqlType == type) return this as any
        throw new Error('Expected same-typed value, but got: ' + this.type + '; sql=' + this.toSql(false))
    }

    /** Boolean result of asking whether this expression is `NOT NULL` */
    isNotNull(): SqlExpression<'BOOLEAN', 'never'> { return new SqlIsNotNull(this) }

    /** Boolean result of asking whether this expression is `NULL` */
    isNull(): SqlExpression<'BOOLEAN', 'never'> { return new SqlIsNull(this) }

    eq(rhs: SqlInputValue<D>): SqlExpression<'BOOLEAN'> { return new SqlMultiOperator('BOOLEAN', '=', [this, EXPR(rhs)]) }
    ne(rhs: SqlInputValue<D>): SqlExpression<'BOOLEAN'> { return new SqlMultiOperator('BOOLEAN', '!=', [this, EXPR(rhs)]) }
    lt(rhs: SqlInputValue<D>): SqlExpression<'BOOLEAN'> { return new SqlMultiOperator('BOOLEAN', '<', [this, EXPR(rhs)]) }
    le(rhs: SqlInputValue<D>): SqlExpression<'BOOLEAN'> { return new SqlMultiOperator('BOOLEAN', '<=', [this, EXPR(rhs)]) }
    gt(rhs: SqlInputValue<D>): SqlExpression<'BOOLEAN'> { return new SqlMultiOperator('BOOLEAN', '>', [this, EXPR(rhs)]) }
    ge(rhs: SqlInputValue<D>): SqlExpression<'BOOLEAN'> { return new SqlMultiOperator('BOOLEAN', '>=', [this, EXPR(rhs)]) }
    // ge<RHS extends SqlInputValue<D>>(rhs: RHS) { return MOP('BOOLEAN', '>=', [this, EXPR(rhs)] as const) }

    and<RHS extends SqlExpression<'BOOLEAN'>>(rhs: RHS) { return AND(this.assertIsBoolean(), rhs) }
    or<RHS extends SqlExpression<'BOOLEAN'>>(rhs: RHS) { return OR(this.assertIsBoolean(), rhs) }
    not() { return NOT(this.assertIsBoolean()) }

    add<R extends 'INTEGER' | 'REAL'>(rhs: SqlInputValue<R>): SqlExpression<D extends 'INTEGER' ? (R extends 'INTEGER' ? 'INTEGER' : 'REAL') : 'REAL'> { return new SqlBinaryArithmeticOperator('+', this.assertIsNumeric(), EXPR(rhs)) as any }
    sub<R extends 'INTEGER' | 'REAL'>(rhs: SqlInputValue<R>): SqlExpression<D extends 'INTEGER' ? (R extends 'INTEGER' ? 'INTEGER' : 'REAL') : 'REAL'> { return new SqlBinaryArithmeticOperator('-', this.assertIsNumeric(), EXPR(rhs)) as any }
    mul<R extends 'INTEGER' | 'REAL'>(rhs: SqlInputValue<R>): SqlExpression<D extends 'INTEGER' ? (R extends 'INTEGER' ? 'INTEGER' : 'REAL') : 'REAL'> { return new SqlBinaryArithmeticOperator('*', this.assertIsNumeric(), EXPR(rhs)) as any }
    div<R extends 'INTEGER' | 'REAL'>(rhs: SqlInputValue<R>): SqlExpression<'REAL'> { return new SqlMultiOperator<'REAL' | 'INTEGER', 'REAL'>('REAL', '/', [this.assertIsNumeric(), EXPR(rhs)]) }

    /** Boolean of whether this string includes the given string */
    includes(substr: SqlInputValue<'TEXT'>): SqlExpression<'BOOLEAN'> { return MFUN('BOOLEAN', 'INSTR', [this.assertIsText(), EXPR2(substr)] as const) }

    /** Boolean of whether this value is in the given list of values */
    inList<L extends SqlType>(list: readonly SqlInputValue<L>[]): SqlExpression<'BOOLEAN', 'never'> { return new SqlInList<D | L>(this, EXPRs(list)) }

    /** Boolean of whether this value is in a given subquery */
    inSubquery<L extends SqlType>(subq: SqlExpression<L>): SqlExpression<'BOOLEAN'> { return new SqlInSubquery<D | L>(this, subq) }
}

/**
 * A literal (constant) value.
 */
class SqlLiteral<D extends SqlType, T extends NativeFor<D> | null> extends SqlExpression<D, 'never'> {
    constructor(
        type: D,
        protected readonly value: T,
    ) { super(type, 'never') }
    toSql() { return String(this.value) }
}

class SqlNullLiteral<D extends SqlType> extends SqlExpression<D, 'sometimes'> {
    constructor(type: D) { super(type, 'sometimes') }
    toSql() { return 'NULL' }
}

class SqlBooleanLiteral extends SqlLiteral<'BOOLEAN', SqlBoolean> {
    constructor(x: boolean | 0 | 1) { super('BOOLEAN', x ? 1 : 0) }
}

class SqlStringLiteral extends SqlLiteral<'TEXT', string> {
    constructor(x: string) { super('TEXT', x) }
    toSql() { return `'${this.value.replace(/'/g, "''")}'` }
}

class SqlDateLiteral extends SqlLiteral<'TIMESTAMP', Date> {
    constructor(x: Date) { super('TIMESTAMP', x) }
    toSql() { return this.value.toISOString() }
}

class SqlBufferLiteral extends SqlLiteral<'BLOB', Buffer> {
    constructor(x: Buffer) { super('BLOB', x) }
    toSql() { return `x'${this.value.toString("hex")}'` }
}

class SqlIsNull extends SqlExpression<'BOOLEAN', 'never'> {
    constructor(private readonly ex: SqlExpression<any>) { super('BOOLEAN', 'never') }
    toSql() { return `${this.ex.toSql(true)} IS NULL` }
}

class SqlIsNotNull extends SqlExpression<'BOOLEAN', 'never'> {
    constructor(private readonly ex: SqlExpression<any>) { super('BOOLEAN', 'never') }
    toSql() { return `${this.ex.toSql(true)} IS NOT NULL` }
}

/** Any unary operator. */
class SqlUnaryOperator<D extends SqlType, NULLABLE extends SqlNullable> extends SqlExpression<D, NULLABLE> {
    constructor(
        type: D,
        private readonly prefix: string,
        private readonly x: SqlExpression<SqlType, NULLABLE>,
        private readonly suffix: string,
    ) { super(type, x.nullable) }

    toSql(grouped: boolean) {
        let sql = this.prefix + this.x.toSql(false) + this.suffix
        if (grouped) sql = '(' + sql + ')'
        return sql
    }
}

/** A SQL function, with arbitrary argument list and output type/null. */
export class SqlMultiFunction2<D extends SqlType, NULLABLE extends SqlNullable> extends SqlExpression<D, NULLABLE> {

    constructor(
        type: D,
        protected readonly op: string,
        protected readonly list: readonly SqlExpression[],
        nullable: NULLABLE,     // normally we inherit from the list, but this can override it
    ) { super(type, nullable) }

    toSql(grouped: boolean) {
        return this.op + '(' + this.list.map(e => e.toSql(false)).join(',') + ')'
    }
}

/** Same as a multi-function, but as an infix operator rather than a function */
class SqlMultiOperator2<D extends SqlType, NULLABLE extends SqlNullable> extends SqlMultiFunction2<D, NULLABLE> {
    toSql(grouped: boolean) {
        const groupInner = grouped || this.list.length > 1
        const groupOuter = grouped && this.list.length > 1
        let sql = this.list.map(e => e.toSql(groupInner)).join(this.op)
        if (groupOuter) sql = '(' + sql + ')'
        return sql
    }
}

/** Any operator, but also can be a list of more than two, where all are chained together. */
class SqlMultiOperator<INTYPE extends SqlType, OUTTYPE extends SqlType> extends SqlExpression<OUTTYPE> {
    constructor(
        type: OUTTYPE,
        protected readonly op: string,
        protected readonly list: readonly SqlExpression<INTYPE>[],
        canBeNullOverride?: SqlNullable,     // normally we inherit from the list, but this can override it
    ) { super(type, canBeNullOverride ?? anySometimesNullable(list)) }

    toSql(grouped: boolean) {
        const groupInner = grouped || this.list.length > 1
        const groupOuter = grouped && this.list.length > 1
        let sql = this.list.map(e => e.toSql(groupInner)).join(this.op)
        if (groupOuter) sql = '(' + sql + ')'
        return sql
    }
}

/** Like a multi-operator but is represented like a function. */
export class SqlMultiFunction<INTYPE extends SqlType, OUTTYPE extends SqlType> extends SqlMultiOperator<INTYPE, OUTTYPE> {
    constructor(type: OUTTYPE, op: string, list: readonly SqlExpression<INTYPE>[],
        canBeNullOverride?: SqlNullable,     // normally we inherit from the list, but this can override it
    ) { super(type, op, list, canBeNullOverride) }

    toSql(grouped: boolean) {
        return this.op + '(' + this.list.map(e => e.toSql(false)).join(',') + ')'
    }
}

/** Binary arithmetic, where combos of `REAL` and `INTEGER` result in `REAL`. */
class SqlBinaryArithmeticOperator<LHS extends 'INTEGER' | 'REAL', RHS extends 'INTEGER' | 'REAL'> extends SqlMultiOperator<LHS | RHS, LHS extends 'INTEGER' ? (RHS extends 'INTEGER' ? 'INTEGER' : 'REAL') : 'REAL'> {
    constructor(op: string, lhs: SqlExpression<LHS>, rhs: SqlExpression<RHS>) {
        super(lhs.type == 'REAL' || rhs.type == 'REAL' ? 'REAL' : 'INTEGER' as any, op, [lhs, rhs])
    }
}

class SqlInList<D extends SqlType> extends SqlMultiFunction2<'BOOLEAN', 'never'> {
    constructor(
        private readonly ex: SqlExpression<D>,
        list: readonly SqlExpression<D>[],
    ) { super('BOOLEAN', 'IN', list, 'never') }

    toSql(grouped: boolean) {
        let sql = `${this.ex.toSql(true)} ` + super.toSql(false)
        if (grouped) sql = '(' + sql + ')'
        return sql
    }
}

class SqlInSubquery<D extends SqlType> extends SqlExpression<'BOOLEAN', 'never'> {
    constructor(
        private readonly ex: SqlExpression<D>,
        private readonly subquery: SqlExpression<D>,
    ) { super('BOOLEAN', 'never') }

    toSql(grouped: boolean) {
        let sql = `${this.ex.toSql(true)} IN ${this.subquery.toSql(true)}`
        if (grouped) sql = '(' + sql + ')'
        return sql
    }
}

class SqlCase<D extends SqlType> extends SqlExpression<D> {

    private readonly allValues: SqlExpression<D>[]

    constructor(
        private readonly whenList: readonly [SqlExpression<'BOOLEAN'>, SqlExpression<D>][],
        private readonly elseExpr?: SqlExpression<D>
    ) {
        // Collect all value-types
        const allValues = whenList.map(pair => pair[1])
        if (elseExpr) {
            allValues.push(elseExpr)
        }
        const type = TYPE(allValues)
        // Lack of ELSE specifically returns NULL
        const nullable: SqlNullable = (!elseExpr) ? 'sometimes' : anySometimesNullable(allValues)
        invariant(type, "what?")
        super(type, nullable)
        this.allValues = allValues
    }

    toSql() {
        let sql = this.whenList.map(
            ([whenExpr, thenExpr]) => {
                return `WHEN ${whenExpr.toSql(false)} THEN ${thenExpr.toSql(false)}`
            }
        ).join(' ')
        if (this.elseExpr) {
            sql += " ELSE " + this.elseExpr.toSql(false)
        }
        return `CASE ${sql} END`
    }
}