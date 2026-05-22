import { findDuplicatePropertyIds, propertyDuplicateKey } from '@/lib/property/propertyDuplicate'

describe('property duplicate helpers', () => {
  it('groups practical variants of the same building and unit', () => {
    const rows = [
      { id: 'a', road_address: '\uD55C\uB0A8\uB3D9 \uC131\uC544\uB9E8\uC158 1 1112 1 1112', unit_number: '1 1112' },
      { id: 'b', road_address: '\uD55C\uB0A8\uB3D9 \uC131\uC544\uB9E8\uC158 1 1112\uD638 1 1112\uD638', unit_number: '1 1112\uD638' },
      { id: 'c', road_address: '\uD55C\uB0A8\uB3D9 \uC131\uC544\uB9E8\uC20C 1112 1112', unit_number: '1112' },
      { id: 'd', road_address: '\uD55C\uB0A8\uB3D9 \uC131\uC544\uB9E8\uC20C 1201', unit_number: '1201' },
    ]

    expect(propertyDuplicateKey(rows[0])).toBe(propertyDuplicateKey(rows[1]))
    expect(propertyDuplicateKey(rows[1])).toBe(propertyDuplicateKey(rows[2]))
    expect(findDuplicatePropertyIds(rows)).toEqual(new Set(['a', 'b', 'c']))
  })

  it('does not mark rows without enough identity data', () => {
    expect(propertyDuplicateKey({ id: 'x', road_address: '\uC8FC\uC18C \uC5C6\uC74C' })).toBeNull()
  })
})
