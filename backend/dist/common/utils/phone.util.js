"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toE164 = toE164;
exports.stripPlus = stripPlus;
exports.phonesMatch = phonesMatch;
exports.isValidE164 = isValidE164;
function toE164(phone) {
    const stripped = (phone || '').replace(/[\s\-().]/g, '').trim();
    if (!stripped)
        return stripped;
    return stripped.startsWith('+') ? stripped : `+${stripped}`;
}
function stripPlus(phone) {
    return (phone || '').replace(/^\+/, '');
}
function phonesMatch(a, b) {
    return stripPlus(a) === stripPlus(b);
}
function isValidE164(phone) {
    return /^\+[1-9]\d{6,14}$/.test(phone || '');
}
//# sourceMappingURL=phone.util.js.map