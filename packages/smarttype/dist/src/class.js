"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLASS = CLASS;
const simplified_1 = require("@asmartbear/simplified");
const common_1 = require("./common");
class SmartClass extends common_1.SmartType {
    constructor(cls) {
        super(cls.name);
        this.cls = cls;
    }
    // istanbul ignore next
    get constructorArgs() { return [this.cls]; }
    visit(visitor, x) {
        return visitor.visitOpaqueObject(x);
    }
    input(x, _) {
        // The only valid thing: The object is an instance of the class
        if (x instanceof this.cls)
            return x;
        // Check for the common case of it being another object with a class, because the error message can be nice.
        const classOf = (0, simplified_1.getClassOf)(x);
        if (classOf) { // if an object, can report its class
            throw new common_1.ValidationError(this, x, `Expected instance of ${this.cls.name} rather than ${classOf.name}`);
        }
        // Catch-all error
        throw new common_1.ValidationError(this, x, `Expected instance of ${this.cls.name}`);
    }
    isOfType(x) {
        return x instanceof this.cls;
    }
    toJSON(x) {
        throw new Error("Smart class validator does not support conversion to JSON");
    }
    fromJSON(x) {
        throw new Error("Smart class validator does not support conversion from JSON");
    }
}
/** An opaque object that is an instance of a given class, and throws if attempts to be converted to JSON. */
function CLASS(cls) {
    return new SmartClass(cls);
}
//# sourceMappingURL=class.js.map