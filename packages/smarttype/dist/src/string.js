"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STR = STR;
exports.NONEMPTYSTR = NONEMPTYSTR;
exports.JSID = JSID;
exports.WEBID = WEBID;
exports.URL = URL;
const common_1 = require("./common");
class SmartString extends common_1.SmartType {
    constructor() {
        super("string");
    }
    input(x, strict = true) {
        if (typeof x === "string")
            return x;
        if (!strict) {
            return String(x);
        }
        throw new common_1.ValidationError(this, x);
    }
    isOfType(x) {
        return typeof x === "string";
    }
    visit(visitor, x) {
        return visitor.visitString(x);
    }
    toJSON(x) {
        if (typeof x === "string")
            return x;
        throw new common_1.ValidationError(this, x);
    }
    fromJSON(x) {
        if (typeof x === "string")
            return x;
        throw new common_1.ValidationError(this, x);
    }
    /** Validate that the string is at least this many characters. */
    minLen(min) {
        return this.transformSameType(`minLen=${min}`, (s) => { if (s.length < min)
            throw new common_1.ValidationError(this, s, `Expected string to be at least ${min} characters`); return s; });
    }
    trim() {
        return this.transformSameType(`trim`, (s) => { return s.trim(); });
    }
    /** Validate that the string matches a regualar expression */
    match(re) {
        return this.transformSameType(`re=${re}`, (s) => { if (!re.test(s))
            throw new common_1.ValidationError(this, s, `Expected string to match ${re}`); return s; });
    }
    /** Make regex replacement, optionally failing if there is nothing to replace */
    replace(re, replacement, failIfNoMatches = false) {
        return this.transformSameType(`re=${re}->${typeof replacement === "string" ? replacement : "[function]"}`, (s) => {
            const result = s.replaceAll(re, replacement);
            if (failIfNoMatches && result == s) { // if changed, it cannot be a match failure
                if (!s.match(re))
                    throw new common_1.ValidationError(this, s, `Expected string to match ${re}`);
            }
            return result;
        });
    }
    /**
     * Validates that the string matches the given regex, then transforms into a different data type
     * using the result of that regex, typically looking at match-groups.
     */
    transformByRegex(re, resultType, fTransform) {
        return this.transform(`${re}`, resultType, (s) => {
            const m = s.match(re);
            if (!m)
                throw new common_1.ValidationError(this, s, `Expected string to match ${re}`);
            return fTransform(m);
        });
    }
}
/** General string */
function STR() {
    return new SmartString();
}
/** Non-empty string shortcut */
function NONEMPTYSTR() {
    return STR().minLen(1);
}
/** String that validates as a Javascript identifier */
function JSID() {
    return STR().match(/^[a-zA-Z_]\w*$/);
}
/** String that validates as an HTML/XHTML identifier */
function WEBID() {
    return STR().match(/^[a-zA-Z][\w-]*$/);
}
/** String that validates as a URL */
function URL() {
    return STR().match(/^https?:\/\/./);
}
//# sourceMappingURL=string.js.map