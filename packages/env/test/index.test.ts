import { loadEnvironment, getEnv, THROW_IF_MISSING } from '../src/index'

test('basics', () => {

    expect(getEnv('foo', undefined)).toBeUndefined()
    expect(getEnv('foo', 123)).toBe(123)
    expect(() => getEnv('foo', THROW_IF_MISSING)).toThrow()

    loadEnvironment()

    expect(getEnv('foo', undefined)).toBe('bar')
    expect(getEnv('foo', 123)).toBe('bar')
    expect(getEnv('foo', THROW_IF_MISSING)).toBe('bar')

})