
/**
 * Mapping of objects to IDs, without GC issues.
 */
const objIdMap = new WeakMap<object, number>();

/**
 * Global counter for object IDs.
 */
let objectCount = 0;

/**
 * Returns a stable, unique integer ID for any object, unique during the execution-time of this script.
 *
 * @param object object whose ID should be computed
 */
export default function objectId(object: object | null): number {
  // Special case of `null`
  if (object === null) return 0;

  // Optimistically load the ID; fastest if it's already there, and atomic with GC.
  let id = objIdMap.get(object);
  if (id === undefined) {
    id = ++objectCount;   // allocate new ID
    objIdMap.set(object, id);   // store this ID
  }
  return id;
}
