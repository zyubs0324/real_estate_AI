"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePriceText = parsePriceText;
function parseKoreanMoney(raw) {
    const text = raw.replace(/[, ]/g, '').trim();
    if (!text)
        return null;
    let total = 0;
    const eok = text.match(/(\d+(?:\.\d+)?)억/);
    if (eok)
        total += Number(eok[1]) * 100000000;
    const manBefore = text.match(/억(\d+(?:\.\d+)?)(?:만)?/);
    const manOnly = !eok ? text.match(/^(\d+(?:\.\d+)?)(?:만)?$/) : null;
    const cheon = text.match(/(\d+(?:\.\d+)?)천/);
    if (cheon)
        total += Number(cheon[1]) * 10000000;
    else if (manBefore)
        total += Number(manBefore[1]) * 10000;
    else if (manOnly)
        total += Number(manOnly[1]) * 10000;
    return total > 0 ? Math.round(total) : null;
}
function parsePriceText(input) {
    const price_text = (input ?? '').trim();
    const parsed = {
        price_text,
        price_sale: null,
        price_deposit: null,
        price_monthly: null,
    };
    if (!price_text)
        return parsed;
    const parts = price_text.split(/[\/,]/).map((v) => v.trim()).filter(Boolean);
    if (parts.length >= 2) {
        parsed.price_deposit = parseKoreanMoney(parts[0]);
        parsed.price_monthly = parseKoreanMoney(parts[1]);
        return parsed;
    }
    parsed.price_sale = parseKoreanMoney(price_text);
    return parsed;
}
