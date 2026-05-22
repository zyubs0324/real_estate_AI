import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/properties',
  useSearchParams: () => mockSearchParams,
}))

jest.mock('@/components/layout/Header', () => {
  const MockHeader = ({ title }: { title: string }) => <header>{title}</header>
  MockHeader.displayName = 'Header'
  return MockHeader
})

jest.mock('@/lib/supabase/properties', () => ({
  saveProperty: jest.fn().mockResolvedValue({ id: 'test-id' }),
  listProperties: jest.fn().mockResolvedValue([]),
  updatePropertyLabels: jest.fn().mockResolvedValue(undefined),
  getPropertyMemos: jest.fn().mockResolvedValue([]),
  addPropertyMemo: jest.fn().mockResolvedValue({ id: 'memo-id' }),
  deletePropertyMemo: jest.fn().mockResolvedValue(undefined),
  deleteProperty: jest.fn().mockResolvedValue(undefined),
  updateProperty: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/supabase/propertyAgencies', () => ({
  listPropertyCoBrokers: jest.fn().mockResolvedValue([]),
  addPropertyCoBroker: jest.fn().mockResolvedValue({ id: 'pa-001' }),
  removePropertyCoBroker: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/supabase/agencies', () => ({
  searchAgencies: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}))

import PropertiesPage from '@/app/(app)/properties/page'

function propertyRow(overrides: Record<string, unknown>) {
  return {
    id: 'prop-1',
    road_address: 'Seoul Yongsan Dokseodang-ro 73',
    building_type: 'apt',
    deal_type: 'sale',
    unit_number: '1112',
    status: 'open',
    is_our_property: false,
    is_watchlist: false,
    is_priority: false,
    is_exclusive: false,
    is_strategic: false,
    registered_date: '2/1',
    photo_urls: [],
    created_at: '2026-05-20T00:00:00Z',
    ...overrides,
  }
}

describe('PropertiesPage filtering and bulk selection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = new URLSearchParams()
    window.history.replaceState(null, '', '/properties')
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  })

  it('deletes selected properties after confirmation', async () => {
    const { listProperties, deleteProperty } = require('@/lib/supabase/properties')
    listProperties.mockResolvedValueOnce([propertyRow({ id: 'prop-bulk-1' })])

    render(<PropertiesPage />)
    await waitFor(() => expect(screen.getByText('Dokseodang-ro 73')).toBeInTheDocument())
    expect(screen.getByText('2026. 2. 1.')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('select-property-prop-bulk-1'))
    fireEvent.click(screen.getByRole('button', { name: '선택 1개 삭제' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '선택 매물을 삭제할까요?' })).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleteProperty).toHaveBeenCalledWith('prop-bulk-1'))
  })

  it('renders the property list in the CSV brief-view column order', async () => {
    const { listProperties } = require('@/lib/supabase/properties')
    listProperties.mockResolvedValueOnce([
      propertyRow({
        id: 'prop-csv',
        registered_date: '2/1',
        handling_name: '\uD55C\uC790\uB9AC',
        neighborhood: '\uC625\uC218\uB3D9',
        category: '\uADF9\uB3D9',
        alias: '\uADF9\uB3D9',
        building_dong: '101',
        unit_number: '1201',
        ad_level: '\uACE0',
        deal_type: '\uB9E4\uB9E4',
        price_text: '12\uC5B5',
        area_text: '33\uD3C9',
        hanjari_date: '2/1',
        deohill_date: '2/2',
        move_in_date: '\uD611\uC758',
        direction: '\uB0A8',
        maintenance_fee: '30\uB9CC',
        notes: '\uC2DC\uD2B8 \uAE30\uD0C0\uC0AC\uD56D',
        co_ownership: [{
          person_id: 'owner-1',
          people: {
            name: '\uAE40\uC18C\uC720',
            phone: '010-1111-2222',
            carrier: 'SKT',
            carrier_note: null,
          },
        }],
      }),
    ])

    render(<PropertiesPage />)

    await waitFor(() => expect(screen.getByLabelText('select-property-prop-csv')).toBeInTheDocument())
    ;[
      '\uB4F1\uB85D\uC77C',
      '\uD578\uB4E4\uB9C1',
      '\uB300\uD45C\uC8FC\uC18C',
      '\uCE74\uD14C\uACE0\uB9AC',
      '\uBCC4\uCE6D',
      '\uB3D9',
      '\uD638\uC218',
      '\uB79C\uB364\uAD11\uACE0',
      '\uC885\uB958',
      '\uAC00\uACA9',
      '\uBA74\uC801',
      '\uC18C\uC720\uC790',
      '\uC5F0\uB77D\uCC98',
      '\uD1B5\uC2E0\uC0AC',
      '\uD55C\uC790\uB9AC',
      '\uB354\uD790',
      '\uC785\uC8FC\uC2DC\uAE30',
      '\uBC29\uD5A5',
      '\uAD00\uB9AC\uBE44',
      '\uAE30\uD0C0\uC0AC\uD56D',
    ].forEach((header) => expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument())

    expect(screen.getByText('\uAE40\uC18C\uC720')).toBeInTheDocument()
    expect(screen.getByText('010-1111-2222')).toBeInTheDocument()
    expect(screen.getByText('SKT')).toBeInTheDocument()
    expect(screen.getByText('\uC2DC\uD2B8 \uAE30\uD0C0\uC0AC\uD56D')).toBeInTheDocument()
  })

  it('filters properties by registered date range before bulk selection', async () => {
    const { listProperties, deleteProperty } = require('@/lib/supabase/properties')
    listProperties.mockResolvedValueOnce([
      propertyRow({ id: 'prop-jan', road_address: 'January Address', registered_date: '1/30' }),
      propertyRow({ id: 'prop-feb', road_address: 'February Address', registered_date: '2/1' }),
    ])

    render(<PropertiesPage />)
    await waitFor(() => expect(screen.getByText('January Address')).toBeInTheDocument())
    expect(screen.getByText('February Address')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('registered-date-from'), { target: { value: '2026-02-01' } })
    fireEvent.change(screen.getByLabelText('registered-date-to'), { target: { value: '2026-02-28' } })

    expect(window.location.search).toContain('registeredDateFrom=2026-02-01')
    expect(window.location.search).toContain('registeredDateTo=2026-02-28')
    expect(screen.getByText(/필터 결과 1건/)).toBeInTheDocument()
    expect(screen.queryByText('January Address')).not.toBeInTheDocument()
    expect(screen.getByText('February Address')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('select-all-properties'))
    fireEvent.click(screen.getByRole('button', { name: '선택 1개 삭제' }))
    expect(screen.getByText(/현재 필터: 등록일 2026\. 2\. 1\. ~ 2026\. 2\. 28\./)).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog', { name: '선택 매물을 삭제할까요?' })).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleteProperty).toHaveBeenCalledWith('prop-feb'))
    expect(deleteProperty).not.toHaveBeenCalledWith('prop-jan')
  })

  it('initializes the registered date range from URL parameters', async () => {
    const { listProperties } = require('@/lib/supabase/properties')
    mockSearchParams = new URLSearchParams('registeredDateFrom=2026-02-01&registeredDateTo=2026-02-28')
    listProperties.mockResolvedValueOnce([
      propertyRow({ id: 'prop-jan', road_address: 'January Address', registered_date: '1/30' }),
      propertyRow({ id: 'prop-feb', road_address: 'February Address', registered_date: '2/1' }),
    ])

    render(<PropertiesPage />)

    await waitFor(() => expect(screen.getByText('February Address')).toBeInTheDocument())
    expect(screen.queryByText('January Address')).not.toBeInTheDocument()
    expect(screen.getByLabelText('registered-date-from')).toHaveValue('2026-02-01')
    expect(screen.getByLabelText('registered-date-to')).toHaveValue('2026-02-28')
  })

  it('initializes tab, deal type, and search filters from URL parameters', async () => {
    const { listProperties } = require('@/lib/supabase/properties')
    mockSearchParams = new URLSearchParams('tab=exclusive&dealType=sale&q=Needle')
    window.history.replaceState(null, '', '/properties?tab=exclusive&dealType=sale&q=Needle')
    listProperties.mockResolvedValueOnce([
      propertyRow({
        id: 'matched',
        road_address: 'Needle Address',
        deal_type: 'sale',
        is_exclusive: true,
      }),
      propertyRow({
        id: 'wrong-tab',
        road_address: 'Needle Address Two',
        deal_type: 'sale',
        is_exclusive: false,
      }),
      propertyRow({
        id: 'wrong-query',
        road_address: 'Other Address',
        deal_type: 'sale',
        is_exclusive: true,
      }),
    ])

    render(<PropertiesPage />)

    await waitFor(() => expect(screen.getByLabelText('select-property-matched')).toBeInTheDocument())
    expect(listProperties).toHaveBeenCalledWith(expect.objectContaining({ tab: 'exclusive', dealType: 'sale' }))
    expect(screen.queryByLabelText('select-property-wrong-query')).not.toBeInTheDocument()
  })

  it('keeps the search filter in the URL as the user types', async () => {
    const { listProperties } = require('@/lib/supabase/properties')
    listProperties.mockResolvedValueOnce([propertyRow({ id: 'prop-search', road_address: 'Needle Address' })])

    render(<PropertiesPage />)
    await waitFor(() => expect(screen.getByLabelText('select-property-prop-search')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Needle' } })

    expect(window.location.search).toContain('q=Needle')
  })

  it('shows only suspected duplicate properties when the duplicate filter is toggled', async () => {
    const { listProperties } = require('@/lib/supabase/properties')
    listProperties.mockResolvedValueOnce([
      propertyRow({
        id: 'dup-a',
        road_address: '\uD55C\uB0A8\uB3D9 \uC131\uC544\uB9E8\uC158 1 1112 1 1112',
        unit_number: '1 1112',
      }),
      propertyRow({
        id: 'dup-b',
        road_address: '\uD55C\uB0A8\uB3D9 \uC131\uC544\uB9E8\uC158 1112 1112',
        unit_number: '1112',
      }),
      propertyRow({
        id: 'unique',
        road_address: '\uC625\uC218\uB3D9 \uB2E4\uB978\uC544\uD30C\uD2B8 1201',
        unit_number: '1201',
      }),
    ])

    render(<PropertiesPage />)

    await waitFor(() => expect(screen.getByLabelText('select-property-unique')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /\uC911\uBCF5 \uC758\uC2EC 2/ }))

    expect(window.location.search).toContain('duplicateOnly=1')
    expect(screen.getByLabelText('select-property-dup-a')).toBeInTheDocument()
    expect(screen.getByLabelText('select-property-dup-b')).toBeInTheDocument()
    expect(screen.queryByLabelText('select-property-unique')).not.toBeInTheDocument()
    expect(screen.getByText(/\uC911\uBCF5 \uC758\uC2EC 2\uAC74/)).toBeInTheDocument()
  })

  it('initializes the duplicate filter from URL parameters', async () => {
    const { listProperties } = require('@/lib/supabase/properties')
    mockSearchParams = new URLSearchParams('duplicateOnly=1')
    window.history.replaceState(null, '', '/properties?duplicateOnly=1')
    listProperties.mockResolvedValueOnce([
      propertyRow({
        id: 'dup-a',
        road_address: '\uD55C\uB0A8\uB3D9 \uC131\uC544\uB9E8\uC158 1 1112',
        unit_number: '1112',
      }),
      propertyRow({
        id: 'dup-b',
        road_address: '\uD55C\uB0A8\uB3D9 \uC131\uC544\uB9E8\uC158 1112',
        unit_number: '1112',
      }),
      propertyRow({
        id: 'unique',
        road_address: '\uC625\uC218\uB3D9 \uB2E4\uB978\uC544\uD30C\uD2B8 1201',
        unit_number: '1201',
      }),
    ])

    render(<PropertiesPage />)

    await waitFor(() => expect(screen.getByLabelText('select-property-dup-a')).toBeInTheDocument())
    expect(screen.queryByLabelText('select-property-unique')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\uC911\uBCF5 \uC758\uC2EC 2/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
