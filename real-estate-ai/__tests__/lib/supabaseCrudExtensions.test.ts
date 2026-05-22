const from = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({ from, rpc: jest.fn() }),
}))

import { deleteProperty, listProperties, updateProperty } from '@/lib/supabase/properties'
import { deletePerson, getPersonOwnedPropertyGroups, listPeople, updatePerson } from '@/lib/supabase/people'
import { deleteSchedule, updateSchedule } from '@/lib/supabase/schedules'
import { deleteTransaction, updateTransaction } from '@/lib/supabase/transactions'
import { deleteAgency, listAgencies, updateAgency } from '@/lib/supabase/agencies'
import { addPropertyCoBroker, listPropertyCoBrokers, removePropertyCoBroker } from '@/lib/supabase/propertyAgencies'
import { listLookupCodes, upsertLookupCode } from '@/lib/supabase/lookupCodes'

function updateChain() {
  const eq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn(() => ({ eq }))
  return { update, eq }
}

function deleteChain() {
  const eq = jest.fn().mockResolvedValue({ error: null })
  const del = jest.fn(() => ({ eq }))
  return { delete: del, eq: eq }
}

function selectEqOrderChain(data: unknown[] = []) {
  const order = jest.fn().mockResolvedValue({ data, error: null })
  const eq = jest.fn(() => ({ order }))
  const select = jest.fn(() => ({ eq }))
  return { select, eq, order }
}

function insertSelectSingleChain(data: unknown = { id: 'new-id' }) {
  const single = jest.fn().mockResolvedValue({ data, error: null })
  const select = jest.fn(() => ({ single }))
  const insert = jest.fn(() => ({ select }))
  return { insert, select, single }
}

function queryChain(data: unknown[] = []) {
  const chain: Record<string, jest.Mock> & PromiseLike<{ data: unknown[]; error: null }> = {
    select: jest.fn(() => chain),
    order: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    then: jest.fn((resolve) => Promise.resolve(resolve({ data, error: null }))),
  }
  return chain
}

describe('supabase CRUD extensions', () => {
  beforeEach(() => from.mockReset())

  it('updates and deletes properties', async () => {
    const chain = updateChain()
    from.mockReturnValueOnce(chain)
    await updateProperty('p1', { alias: '극동', is_exclusive: true })
    expect(from).toHaveBeenCalledWith('properties')
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ alias: '극동', is_exclusive: true }))
    expect(chain.eq).toHaveBeenCalledWith('id', 'p1')

    const del = deleteChain()
    from.mockReturnValueOnce(del)
    await deleteProperty('p1')
    expect(del.delete).toHaveBeenCalled()
    expect(del.eq).toHaveBeenCalledWith('id', 'p1')
  })

  it('filters properties by handling agency and co-broker agency', async () => {
    const coBroker = {
      select: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ data: [{ property_id: 'p1' }], error: null }) })),
    }
    from.mockReturnValueOnce(coBroker)
    const properties = queryChain([{ id: 'p1', road_address: 'addr' }])
    from.mockReturnValueOnce(properties)

    await expect(listProperties({ handlingAgencyId: 'a1', coBrokerAgencyId: 'a2' })).resolves.toHaveLength(1)
    expect(from).toHaveBeenCalledWith('property_agencies')
    expect(from).toHaveBeenCalledWith('properties')
    expect(properties.eq).toHaveBeenCalledWith('handling_agency_id', 'a1')
    expect(properties.in).toHaveBeenCalledWith('id', ['p1'])
  })

  it('updates and deletes other CRM entities', async () => {
    for (const action of [
      () => updatePerson('id', { display_name: '곽소장' }),
      () => updateTransaction('id', { status: '계약' }),
      () => updateSchedule('id', { memo: '확인' }),
    ]) {
      from.mockReturnValueOnce(updateChain())
      await action()
    }

    for (const action of [
      () => deletePerson('id'),
      () => deleteTransaction('id'),
      () => deleteSchedule('id'),
      () => deleteAgency('id'),
    ]) {
      from.mockReturnValueOnce(deleteChain())
      await action()
    }

    expect(from).toHaveBeenCalledTimes(7)
  })

  it('lists people with owned and handling counts in chunks', async () => {
    const peopleRows = Array.from({ length: 251 }, (_, index) => ({
      id: `person-${index + 1}`,
      name: `Person ${index + 1}`,
      phone: null,
      role: null,
      warning: false,
      created_at: '2026-05-20T00:00:00.000Z',
    }))
    from.mockReturnValueOnce(queryChain(peopleRows))

    const ownershipIn = jest.fn()
      .mockResolvedValueOnce({
        data: [
          {
            person_id: 'person-1',
            properties: {
              road_address: '옥수동 옥파 108 505',
              building_dong: '108',
              unit_number: '505',
            },
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            person_id: 'person-201',
            properties: {
              road_address: '옥수동 옥파 108 505',
              building_dong: '108',
              unit_number: '505',
            },
          },
          {
            person_id: 'person-201',
            properties: {
              road_address: '옥수동 옥파 108 505',
              building_dong: '108',
              unit_number: '505',
            },
          },
          {
            person_id: 'person-201',
            properties: {
              road_address: '옥수동 성원 809',
              building_dong: null,
              unit_number: '809',
            },
          },
        ],
        error: null,
      })
    const ownershipSelect = jest.fn(() => ({ in: ownershipIn }))
    from.mockReturnValueOnce({ select: ownershipSelect })
    from.mockReturnValueOnce({ select: ownershipSelect })

    const handlingIn = jest.fn()
      .mockResolvedValueOnce({ data: [{ handling_person_id: 'person-1' }], error: null })
      .mockResolvedValueOnce({ data: [{ handling_person_id: 'person-250' }], error: null })
    const handlingSelect = jest.fn(() => ({ in: handlingIn }))
    from.mockReturnValueOnce({ select: handlingSelect })
    from.mockReturnValueOnce({ select: handlingSelect })

    const rows = await listPeople()

    expect(ownershipIn).toHaveBeenCalledTimes(2)
    expect(handlingIn).toHaveBeenCalledTimes(2)
    expect(rows.find((person) => person.id === 'person-1')).toEqual(expect.objectContaining({
      owned_property_count: 1,
      handling_property_count: 1,
    }))
    expect(rows.find((person) => person.id === 'person-201')).toEqual(expect.objectContaining({
      owned_property_count: 2,
    }))
    expect(rows.find((person) => person.id === 'person-250')).toEqual(expect.objectContaining({
      handling_property_count: 1,
    }))
  })

  it('updates agency metadata and lists handling/co-broker counts', async () => {
    const update = updateChain()
    from.mockReturnValueOnce(update)
    await updateAgency('a1', { alias: '경희', is_our_office: false, trust_level: '주의', tags: ['연락주의'] })
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
      alias: '경희',
      is_our_office: false,
      trust_level: '주의',
      tags: ['연락주의'],
    }))

    const agencyRows = queryChain([{ id: 'a1', name: '경희', alias: '경희', trust_level: '주의', tags: ['연락주의'] }])
    const handlingRows = { select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [{ handling_agency_id: 'a1' }], error: null }) })) }
    const coBrokerRows = { select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [{ agency_id: 'a1' }], error: null }) })) }
    from.mockReturnValueOnce(agencyRows)
    from.mockReturnValueOnce(handlingRows)
    from.mockReturnValueOnce(coBrokerRows)
    const agencies = await listAgencies()
    expect(agencies[0]).toEqual(expect.objectContaining({
      handling_property_count: 1,
      co_broker_property_count: 1,
    }))
  })

  it('groups a person owned listings by physical unit', async () => {
    const data = [
      {
        share_ratio: '50%',
        is_primary: true,
        properties: {
          id: 'prop-1',
          road_address: '옥수동 옥파 108 505',
          handling_name: '한자리',
          neighborhood: '옥수동',
          alias: '옥파',
          building_dong: '108',
          unit_number: '505',
          deal_type: '전세',
          price_text: '8억',
          area_text: '33평',
        },
      },
      {
        share_ratio: '50%',
        is_primary: true,
        properties: {
          id: 'prop-2',
          road_address: '옥수동 옥파 108 505',
          handling_name: '한자리',
          neighborhood: '옥수동',
          alias: '옥파',
          building_dong: '108',
          unit_number: '505',
          deal_type: '반월세',
          price_text: '7억/100',
          area_text: '33평',
        },
      },
    ]
    const eq = jest.fn().mockResolvedValue({ data, error: null })
    const select = jest.fn(() => ({ eq }))
    from.mockReturnValueOnce({ select })

    const groups = await getPersonOwnedPropertyGroups('person-1')

    expect(from).toHaveBeenCalledWith('co_ownership')
    expect(eq).toHaveBeenCalledWith('person_id', 'person-1')
    expect(groups).toHaveLength(1)
    expect(groups[0]).toEqual(expect.objectContaining({
      road_address: '옥수동 옥파 108 505',
      listings: expect.arrayContaining([
        expect.objectContaining({ deal_type: '전세' }),
        expect.objectContaining({ deal_type: '반월세' }),
      ]),
    }))
  })

  it('manages property co-broker agencies', async () => {
    const list = selectEqOrderChain([{ id: 'pa1', property_id: 'p1', agency_id: 'a1' }])
    from.mockReturnValueOnce(list)
    await expect(listPropertyCoBrokers('p1')).resolves.toHaveLength(1)
    expect(from).toHaveBeenCalledWith('property_agencies')
    expect(list.eq).toHaveBeenCalledWith('property_id', 'p1')

    const add = insertSelectSingleChain({ id: 'pa2' })
    from.mockReturnValueOnce(add)
    await addPropertyCoBroker('p1', 'a1', 'memo')
    expect(add.insert).toHaveBeenCalledWith({
      property_id: 'p1',
      agency_id: 'a1',
      relation_type: 'co_broker',
      memo: 'memo',
    })

    const removeEqAgency = jest.fn().mockResolvedValue({ error: null })
    const removeEqProperty = jest.fn(() => ({ eq: removeEqAgency }))
    const removeDelete = jest.fn(() => ({ eq: removeEqProperty }))
    from.mockReturnValueOnce({ delete: removeDelete })
    await removePropertyCoBroker('p1', 'a1')
    expect(removeEqProperty).toHaveBeenCalledWith('property_id', 'p1')
    expect(removeEqAgency).toHaveBeenCalledWith('agency_id', 'a1')
  })

  it('lists and upserts lookup codes', async () => {
    const list = selectEqOrderChain([{ id: 'l1', category: 'person_role', value: '대리인', label: '대리인', sort_order: 0 }])
    from.mockReturnValueOnce(list)
    await expect(listLookupCodes('person_role')).resolves.toHaveLength(1)
    expect(list.eq).toHaveBeenCalledWith('category', 'person_role')

    const upsert = jest.fn().mockResolvedValue({ error: null })
    from.mockReturnValueOnce({ upsert })
    await upsertLookupCode('person_role', '대리인')
    expect(upsert).toHaveBeenCalledWith({
      category: 'person_role',
      value: '대리인',
      label: '대리인',
    }, { onConflict: 'category,value' })
  })
})
