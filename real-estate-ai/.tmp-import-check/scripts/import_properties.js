"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const supabase_js_1 = require("@supabase/supabase-js");
const csvImportProfile_1 = require("../lib/property/csvImportProfile");
const OFFICE_SEEDS = [
    {
        name: '한자리(한남자이더리버)공인중개사사무소',
        alias: '한자리',
        representative: '장혜린',
        phone: '02-2295-2577',
        license_no: '11200-2018-00049',
        is_our_office: true,
    },
    {
        name: '옥수더힐 공인중개사사무소',
        alias: '더힐',
        representative: '장혜민',
        phone: '02-2292-5077',
        license_no: null,
        is_our_office: true,
    },
];
const AGENCY_SEEDS = [
    ...OFFICE_SEEDS,
    ...Array.from(csvImportProfile_1.KNOWN_AGENCIES)
        .filter((name) => !csvImportProfile_1.OUR_OFFICES.has(name))
        .map((name) => ({
        name,
        alias: name,
        representative: null,
        phone: null,
        license_no: null,
        is_our_office: false,
    })),
];
const DB_STATUSES = new Set(['공실', '임대중', '매매완료', '중개진행중']);
function loadEnvLocal() {
    const envPath = node_path_1.default.resolve(process.cwd(), '.env.local');
    if (!node_fs_1.default.existsSync(envPath))
        return;
    const content = node_fs_1.default.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const index = trimmed.indexOf('=');
        if (index < 0)
            continue;
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        if (!process.env[key])
            process.env[key] = value;
    }
}
function readCsv(filePath) {
    return (0, csvImportProfile_1.parseCsv)(iconv_lite_1.default.decode(node_fs_1.default.readFileSync(filePath), 'cp949'));
}
function personKey(name, phone) {
    return `${name}|${phone ?? ''}`;
}
function shouldIgnoreMissingRelation(error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return /Could not find|does not exist|schema cache/i.test(message);
}
function isMissingColumn(error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return /column .* does not exist|Could not find .* column|schema cache/i.test(message);
}
async function maybeDeleteAll(supabase, table) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error && !shouldIgnoreMissingRelation(error))
        throw error;
}
async function clearCrmData(supabase) {
    const tables = [
        'property_sources',
        'property_agencies',
        'transaction_payments',
        'transaction_checklists',
        'transaction_participants',
        'schedule_participants',
        'schedule_properties',
        'property_interests',
        'co_ownership',
        'relations',
        'memos',
        'notifications',
        'transactions',
        'schedules',
        'properties',
        'people',
        'agencies',
    ];
    for (const table of tables)
        await maybeDeleteAll(supabase, table);
}
async function insertWithColumnFallback(supabase, table, rows, fallback) {
    if (rows.length === 0)
        return [];
    let result = await supabase.from(table).insert(rows).select('*');
    if (result.error && isMissingColumn(result.error)) {
        result = await supabase.from(table).insert(rows.map(fallback)).select('*');
    }
    if (result.error)
        throw result.error;
    return result.data ?? [];
}
function consolidatePeople(seeds) {
    const byKey = new Map();
    for (const seed of seeds) {
        const key = personKey(seed.name, seed.phone);
        const current = byKey.get(key);
        if (!current) {
            byKey.set(key, seed);
            continue;
        }
        byKey.set(key, {
            ...current,
            carrier: current.carrier ?? seed.carrier,
            carrier_note: current.carrier_note ?? seed.carrier_note,
            address: current.address ?? seed.address,
            role: (0, csvImportProfile_1.mergePersonRoles)([current.role, seed.role]),
            notes: [current.notes, seed.notes].filter(Boolean).join('\n') || null,
        });
    }
    return Array.from(byKey.values());
}
function profile(rows) {
    const ownerPeople = (0, csvImportProfile_1.buildOwnerPeople)(rows);
    const handlingPeople = (0, csvImportProfile_1.buildHandlingPeople)(rows);
    return {
        rows: rows.length,
        owner_people: ownerPeople.length,
        handling_people: handlingPeople.length,
        owner_property_links: rows.reduce((count, row) => count + row.owner_names.length, 0),
        handling_person_links: rows.filter((row) => row.handling_kind === 'person').length,
        handling_agency_links: rows.filter((row) => row.handling_kind === 'agency').length,
        exclusive_count: rows.filter((row) => row.is_exclusive).length,
        strategic_count: rows.filter((row) => row.is_strategic).length,
    };
}
async function importRows(rows) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --execute');
    }
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceKey);
    await clearCrmData(supabase);
    const agencyInput = (0, csvImportProfile_1.uniqueBy)([
        ...AGENCY_SEEDS,
        ...rows
            .filter((row) => row.handling_kind === 'agency' && row.handling_name)
            .map((row) => ({
            name: row.handling_name,
            alias: row.handling_name,
            representative: null,
            phone: null,
            license_no: null,
            is_our_office: csvImportProfile_1.OUR_OFFICES.has(row.handling_name),
        })),
    ], (row) => row.alias ?? row.name);
    const agencyRows = await insertWithColumnFallback(supabase, 'agencies', agencyInput, (row) => ({
        name: row.name,
        representative: row.representative,
        phone: row.phone,
        license_no: row.license_no,
    }));
    const agencyIdByAlias = new Map();
    for (let index = 0; index < agencyRows.length; index += 1) {
        const row = agencyRows[index];
        const source = agencyInput[index];
        const name = String(row.name);
        const alias = String(row.alias ?? source?.alias ?? name);
        agencyIdByAlias.set(alias, String(row.id));
        agencyIdByAlias.set(name, String(row.id));
    }
    const ownerPeople = (0, csvImportProfile_1.buildOwnerPeople)(rows);
    const ownerPersonNameBySourceKey = new Map(ownerPeople.map((person) => [personKey(person.source_name, person.phone), person.name]));
    const peopleInput = consolidatePeople([...ownerPeople, ...(0, csvImportProfile_1.buildHandlingPeople)(rows)]).map((person) => ({
        name: person.name,
        display_name: person.name,
        role: person.role,
        phone: person.phone,
        address: person.address,
        carrier: person.carrier,
        carrier_note: person.carrier_note,
        notes: person.notes,
        is_corporate: false,
    }));
    const personRows = await insertWithColumnFallback(supabase, 'people', peopleInput, (row) => ({
        name: row.name,
        phone: row.phone,
        role: row.role,
    }));
    const personIdByNamePhone = new Map();
    const personIdByName = new Map();
    for (const row of personRows) {
        const name = String(row.name);
        const phone = row.phone ? String(row.phone) : '';
        personIdByNamePhone.set(personKey(name, phone), String(row.id));
        if (!personIdByName.has(name))
            personIdByName.set(name, String(row.id));
    }
    const propertyRows = rows.map((row) => ({
        road_address: row.road_address,
        building_name: row.alias || null,
        building_dong: row.building_dong || null,
        unit_number: row.unit_number || null,
        deal_type: csvImportProfile_1.DB_DEAL_TYPES.has(row.deal_type ?? '') ? row.deal_type : null,
        status: DB_STATUSES.has(row.status) ? row.status : '공실',
        is_our_property: row.handling_name === '한자리' || row.handling_name === '더힐',
        handling_agency_id: row.handling_kind === 'agency' && row.handling_name ? agencyIdByAlias.get(row.handling_name) ?? null : null,
        handling_person_id: row.handling_kind === 'person' && row.handling_name ? personIdByName.get(row.handling_name) ?? null : null,
        registered_date: row.registered_date || null,
        handling_name: row.handling_name,
        neighborhood: row.neighborhood || null,
        category: row.category || null,
        alias: row.alias || null,
        ad_level: row.ad_level,
        approval_date: row.approval_date,
        price_text: row.price_text || null,
        price_sale: row.price_sale,
        price_deposit: row.price_deposit,
        price_monthly: row.price_monthly,
        area_text: row.area_text || null,
        area_exclusive: row.area_exclusive,
        area_supply: row.area_supply,
        area_pyeong: row.area_pyeong,
        move_in_date: row.move_in_date || null,
        direction: row.direction,
        maintenance_fee: row.maintenance_fee || null,
        notes: [
            row.deal_type && !csvImportProfile_1.DB_DEAL_TYPES.has(row.deal_type) ? `원종류: ${row.deal_type}` : '',
            row.status !== '공실' ? `원상태: ${row.status}` : '',
            row.owner_text ? `원소유자: ${row.owner_text}` : '',
            row.carrier_text ? `원통신사연락처: ${row.carrier_text}` : '',
            row.notes,
        ].filter(Boolean).join('\n') || null,
        source_platform: 'sheet',
        hanjari_date: row.hanjari_date || null,
        deohill_date: row.deohill_date || null,
        is_exclusive: row.is_exclusive,
        is_strategic: row.is_strategic,
    }));
    const insertedProperties = await insertWithColumnFallback(supabase, 'properties', propertyRows, (row) => ({
        road_address: row.road_address,
        building_name: row.building_name,
        building_dong: row.building_dong,
        unit_number: row.unit_number,
        deal_type: row.deal_type,
        status: row.status,
        is_our_property: row.is_our_property,
        listing_agency_id: row.handling_agency_id,
        listing_agent_id: row.handling_person_id,
        external_ids: { source_platform: 'sheet' },
    }));
    const coOwnershipRows = insertedProperties.flatMap((property, index) => {
        const source = rows[index];
        return source.owner_names
            .map((sourceName, ownerIndex) => {
            const savedName = ownerPersonNameBySourceKey.get(personKey(sourceName, source.owner_phone)) ?? sourceName;
            const personId = personIdByNamePhone.get(personKey(savedName, source.owner_phone)) ?? personIdByName.get(savedName);
            if (!personId)
                return null;
            return {
                property_id: property.id,
                person_id: personId,
                share_ratio: null,
                is_primary: ownerIndex === 0,
            };
        })
            .filter((row) => Boolean(row));
    });
    let insertedCoOwnership = 0;
    if (coOwnershipRows.length > 0) {
        const { error, count } = await supabase.from('co_ownership').insert(coOwnershipRows, { count: 'exact' });
        if (error && !shouldIgnoreMissingRelation(error))
            throw error;
        insertedCoOwnership = count ?? (error ? 0 : coOwnershipRows.length);
    }
    const relationRows = coOwnershipRows.map((link) => {
        const propertyIndex = insertedProperties.findIndex((property) => property.id === link.property_id);
        const source = rows[propertyIndex];
        return {
            property_id: link.property_id,
            person_id: link.person_id,
            role: source?.owner_role ?? '없음',
        };
    });
    let insertedRelations = 0;
    if (relationRows.length > 0) {
        const { error, count } = await supabase.from('relations').insert(relationRows, { count: 'exact' });
        if (error && !shouldIgnoreMissingRelation(error))
            throw error;
        insertedRelations = count ?? (error ? 0 : relationRows.length);
    }
    return {
        cleared_existing_data: true,
        inserted_agencies: agencyRows.length,
        inserted_people: personRows.length,
        inserted_properties: insertedProperties.length,
        inserted_co_ownership: insertedCoOwnership,
        inserted_person_property_roles: insertedRelations,
        handling_agency_links: rows.filter((row) => row.handling_kind === 'agency' && row.handling_name).length,
        handling_person_links: rows.filter((row) => row.handling_kind === 'person' && row.handling_name).length,
    };
}
async function main() {
    loadEnvLocal();
    const args = process.argv.slice(2);
    const fileArg = args.find((arg) => !arg.startsWith('--'));
    const execute = args.includes('--execute');
    const limitArg = args.find((arg) => arg.startsWith('--limit='));
    const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
    const filePath = fileArg ? node_path_1.default.resolve(fileArg) : 'E:\\real_estate_AI\\매물정보_export.csv';
    const rows = (0, csvImportProfile_1.normalizeRows)(readCsv(filePath)).slice(0, limit ?? undefined);
    console.log(JSON.stringify({ filePath, mode: execute ? 'execute' : 'dry-run', ...profile(rows) }, null, 2));
    if (execute)
        console.log(JSON.stringify(await importRows(rows), null, 2));
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
