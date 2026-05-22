"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_DEAL_TYPES = exports.HANDLING_PEOPLE = exports.KNOWN_AGENCIES = exports.OUR_OFFICES = exports.PRIMARY_COLUMN_COUNT = void 0;
exports.clean = clean;
exports.isPrimaryDataRow = isPrimaryDataRow;
exports.toRawProperty = toRawProperty;
exports.parseCsv = parseCsv;
exports.normalizeDealType = normalizeDealType;
exports.ownerRoleForDealType = ownerRoleForDealType;
exports.mergePersonRoles = mergePersonRoles;
exports.normalizeRows = normalizeRows;
exports.buildOwnerPeople = buildOwnerPeople;
exports.buildHandlingPeople = buildHandlingPeople;
exports.uniqueBy = uniqueBy;
const areaParser_1 = require("./areaParser");
const carrierParser_1 = require("./carrierParser");
const priceParser_1 = require("./priceParser");
exports.PRIMARY_COLUMN_COUNT = 19;
exports.OUR_OFFICES = new Set(['한자리', '더힐']);
exports.KNOWN_AGENCIES = new Set([
    '한자리', '더힐', '경희', '이야기', '세일', '한양', '대교', '미래파크힐스',
    '삼성', '현대박', '이레', '서울', '옥수힐', '금호탑', '한남동부동', '한강',
    '삼성양', '하나', '더힐폰', '반도114', '골드',
]);
exports.HANDLING_PEOPLE = new Set([
    '곽소장', '부녀회장', '워크인', '이선유', '허원장',
    '허지연', '장은하', '김민주', '내어회장',
]);
exports.DB_DEAL_TYPES = new Set(['매매', '전세', '월세', '단기임대', '반전세', '반월세', '렌트', '임대']);
const DIRECTIONS = new Set([
    '동', '서', '남', '북', '남동', '남서', '북동', '북서',
    '동북', '동남', '서북', '서남', '남향', '북향', '동향', '서향',
]);
function clean(value) {
    return (value ?? '').replace(/\r\n/g, '\n').trim();
}
function isPrimaryDataRow(row) {
    return row.slice(0, exports.PRIMARY_COLUMN_COUNT).some((value) => clean(value) !== '');
}
function toRawProperty(row) {
    return {
        registered_date: clean(row[0]),
        handling_raw: clean(row[1]),
        neighborhood: clean(row[2]),
        category: clean(row[3]),
        alias: clean(row[4]),
        building_dong: clean(row[5]),
        unit_number: clean(row[6]),
        ad_or_approval: clean(row[7]),
        deal_type_raw: clean(row[8]),
        price_text: clean(row[9]),
        area_text: clean(row[10]),
        owner_text: clean(row[11]),
        carrier_text: clean(row[12]),
        hanjari_date: clean(row[13]),
        deohill_date: clean(row[14]),
        move_in_date: clean(row[15]),
        direction_raw: clean(row[16]),
        maintenance_fee: clean(row[17]),
        notes: clean(row[18]),
    };
}
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];
        if (ch === '"') {
            if (quoted && next === '"') {
                field += '"';
                i += 1;
            }
            else {
                quoted = !quoted;
            }
            continue;
        }
        if (ch === ',' && !quoted) {
            row.push(field);
            field = '';
            continue;
        }
        if ((ch === '\n' || ch === '\r') && !quoted) {
            if (ch === '\r' && next === '\n')
                i += 1;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            continue;
        }
        field += ch;
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}
function normalizeDealType(raw) {
    const text = raw.replace(/\s+/g, '').trim();
    if (!text)
        return { deal_type: null, status: '공실' };
    if (text === '급매')
        return { deal_type: '매매', status: '급매' };
    if (text === '보류')
        return { deal_type: '매매', status: '보류' };
    if (text === '완료' || text === 'X')
        return { deal_type: null, status: '완료' };
    if (text === '반전')
        return { deal_type: '반전세', status: '공실' };
    if (text === '반월')
        return { deal_type: '반월세', status: '공실' };
    if (text === '임대')
        return { deal_type: '월세', status: '공실' };
    if (text === '단기')
        return { deal_type: '단기임대', status: '공실' };
    if (text === '매도' || text === '매매?')
        return { deal_type: '매매', status: '공실' };
    if (text === '월세?' || text === '급월세')
        return { deal_type: '월세', status: text === '급월세' ? '급매' : '공실' };
    if (text === '전월세')
        return { deal_type: '반전세', status: '공실' };
    if (text.includes('전세') && text.includes('반전세'))
        return { deal_type: '반전세', status: '공실' };
    if (exports.DB_DEAL_TYPES.has(text))
        return { deal_type: text, status: '공실' };
    return { deal_type: text, status: '확인필요' };
}
function ownerRoleForDealType(dealType) {
    if (dealType === '매매')
        return '매도인';
    if (dealType && ['전세', '월세', '단기임대', '반전세', '반월세', '렌트', '임대'].includes(dealType))
        return '임대인';
    return '없음';
}
function mergePersonRoles(roles) {
    const roleSet = new Set(Array.from(roles).filter((role) => role !== '없음'));
    if (roleSet.size === 0)
        return '없음';
    if (roleSet.size === 1)
        return Array.from(roleSet)[0];
    return '복합';
}
function normalizeHandling(raw, workInIndex) {
    const value = raw.trim();
    if (value === '전속')
        return { handling_name: '한자리', handling_kind: 'agency', is_exclusive: true, is_strategic: false };
    if (value === '전략매물')
        return { handling_name: '한자리', handling_kind: 'agency', is_exclusive: false, is_strategic: true };
    if (!value)
        return { handling_name: null, handling_kind: null, is_exclusive: false, is_strategic: false };
    if (exports.KNOWN_AGENCIES.has(value))
        return { handling_name: value, handling_kind: 'agency', is_exclusive: false, is_strategic: false };
    if (value === '워크인')
        return { handling_name: `워크인${workInIndex}`, handling_kind: 'person', is_exclusive: false, is_strategic: false };
    if (exports.HANDLING_PEOPLE.has(value))
        return { handling_name: value, handling_kind: 'person', is_exclusive: false, is_strategic: false };
    return { handling_name: value, handling_kind: null, is_exclusive: false, is_strategic: false };
}
function normalizeAdApproval(value) {
    if (!value)
        return { ad_level: null, approval_date: null };
    if (/[고중저]/.test(value) && !/\d{4}[./-]\d{1,2}/.test(value))
        return { ad_level: value, approval_date: null };
    return { ad_level: null, approval_date: value };
}
function normalizeDirection(raw, currentMoveIn) {
    const value = raw.trim();
    if (!value)
        return { direction: null, move_in_date: currentMoveIn };
    if (DIRECTIONS.has(value))
        return { direction: value, move_in_date: currentMoveIn };
    return { direction: null, move_in_date: currentMoveIn || value };
}
function ownerNames(ownerText) {
    return Array.from(new Set(ownerText
        .replace(/^v/i, '')
        .split(/[\/,+]/)
        .map((value) => value.trim())
        .filter((value) => value && value !== '???')));
}
function roadAddress(raw) {
    return [raw.neighborhood, raw.alias, raw.building_dong, raw.unit_number].filter(Boolean).join(' ');
}
function normalizeMoneyForContext(row, dealType) {
    const parsed = (0, priceParser_1.parsePriceText)(row.price_text);
    if (/^\d+(?:\.\d+)?$/.test(row.price_text) && dealType === '매매') {
        parsed.price_sale = Math.round(Number(row.price_text) * 100000000);
    }
    return parsed;
}
function normalizeRows(csvRows) {
    let workInIndex = 0;
    return csvRows
        .slice(1)
        .map((row, index) => ({ row, csvRowNumber: index + 2 }))
        .filter(({ row }) => isPrimaryDataRow(row))
        .map(({ row, csvRowNumber }) => {
        const raw = toRawProperty(row);
        if (raw.handling_raw.trim() === '워크인')
            workInIndex += 1;
        const deal = normalizeDealType(raw.deal_type_raw);
        const handling = normalizeHandling(raw.handling_raw, workInIndex);
        const ad = normalizeAdApproval(raw.ad_or_approval);
        const direction = normalizeDirection(raw.direction_raw, raw.move_in_date);
        const price = normalizeMoneyForContext(raw, deal.deal_type);
        const area = (0, areaParser_1.parseAreaText)(raw.area_text);
        const carrier = (0, carrierParser_1.parseCarrierText)(raw.carrier_text);
        return {
            ...raw,
            csv_row_number: csvRowNumber,
            road_address: roadAddress(raw) || raw.neighborhood || raw.alias || `CSV row ${csvRowNumber}`,
            handling_name: handling.handling_name,
            handling_kind: handling.handling_kind,
            deal_type: deal.deal_type,
            status: deal.status,
            owner_role: ownerRoleForDealType(deal.deal_type),
            is_exclusive: handling.is_exclusive,
            is_strategic: handling.is_strategic,
            ad_level: ad.ad_level,
            approval_date: ad.approval_date,
            direction: direction.direction,
            move_in_date: direction.move_in_date,
            owner_names: ownerNames(raw.owner_text),
            owner_phone: carrier.phone,
            owner_carrier: carrier.carrier,
            owner_carrier_note: carrier.carrier_note,
            price_sale: price.price_sale,
            price_deposit: price.price_deposit,
            price_monthly: price.price_monthly,
            area_exclusive: area.area_exclusive,
            area_supply: area.area_supply,
            area_pyeong: area.area_pyeong,
        };
    });
}
function buildOwnerPeople(rows) {
    const base = new Map();
    const phonesByName = new Map();
    for (const row of rows) {
        for (const ownerName of row.owner_names) {
            const phoneKey = row.owner_phone ?? '';
            const key = `${ownerName}|${phoneKey}`;
            phonesByName.set(ownerName, (phonesByName.get(ownerName) ?? new Set()).add(phoneKey));
            const current = base.get(key);
            const roles = [current?.role, row.owner_role].filter(Boolean);
            base.set(key, {
                name: ownerName,
                source_name: ownerName,
                phone: row.owner_phone,
                carrier: row.owner_carrier,
                carrier_note: row.owner_carrier_note,
                role: mergePersonRoles(roles),
                address: current?.address ?? row.road_address,
                notes: null,
            });
        }
    }
    const orderByName = new Map();
    return Array.from(base.values()).map((person) => {
        const variants = phonesByName.get(person.source_name);
        if (!variants || variants.size <= 1)
            return person;
        const next = (orderByName.get(person.source_name) ?? 0) + 1;
        orderByName.set(person.source_name, next);
        return { ...person, name: `${person.source_name}${next}` };
    });
}
function buildHandlingPeople(rows) {
    const names = new Set(rows
        .filter((row) => row.handling_kind === 'person' && row.handling_name)
        .map((row) => row.handling_name));
    return Array.from(names).map((name) => ({
        name,
        source_name: name.replace(/\d+$/, '') || name,
        phone: null,
        carrier: null,
        carrier_note: null,
        role: '없음',
        address: null,
        notes: name.startsWith('워크인') ? '워크인 핸들링 인물. 매물별 구분을 위해 자동 넘버링됨.' : null,
    }));
}
function uniqueBy(rows, key) {
    const seen = new Set();
    const out = [];
    for (const row of rows) {
        const k = key(row);
        if (seen.has(k))
            continue;
        seen.add(k);
        out.push(row);
    }
    return out;
}
