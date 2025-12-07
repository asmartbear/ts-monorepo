"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGEXP = REGEXP;
const common_1 = require("./common");
class SmartRegexp extends common_1.SmartType {
    constructor() {
        super("regexp");
    }
    input(x, strict = true) {
        if (x instanceof RegExp)
            return x;
        if (typeof x === "string") {
            if (!x)
                throw new common_1.ValidationError(this, x, "Empty string is not a regexp");
            try {
                const m = x.match(/^\/(.*)\/([gimsuvy]*)$/); // looks like a full regexp?
                if (m)
                    return new RegExp(m[1], m[2]); // construct it in parts
                return new RegExp(x); // a static string
            }
            catch (e) { // convert syntax error to validation error
                throw new common_1.ValidationError(this, x, String(e));
            }
        }
        throw new common_1.ValidationError(this, x);
    }
    isOfType(x) {
        return x instanceof RegExp;
    }
    visit(visitor, x) {
        return visitor.visitRegExp(x);
    }
    toJSON(x) {
        return String(x);
    }
    fromJSON(x) {
        return this.input(x); // re-parse the pieces
    }
}
/** `RegExp` object, can be parsed from a string, or be a RegExp object */
function REGEXP() {
    return new SmartRegexp();
}
//# sourceMappingURL=regexp.js.map