export interface Tariff {
  id: number
  name: string
  basePeriodDays: number
  basePeriodRate: number
  overduePeriodDays: number | null
  overdueRate: number
}

export interface CategoryField {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
  required?: boolean
}

export interface ItemCategory {
  id: number
  name: string
  fields: CategoryField[]
}

export interface Client {
  id: number
  fullName: string
  phone: string
  passport: string | null
}

export interface PledgeItem {
  id: number
  categoryId: number
  name: string
  attributes: Record<string, string | number>
  amount: number
  category?: ItemCategory
}

export interface Pledge {
  id: number
  tariffId: number
  clientId: number
  createdAt: string
  dueDate: string
  loanAmount: number
  status: 'active' | 'redeemed'
  redeemedAt: string | null
  redemptionAmount: number | null
  tariff?: Tariff
  items?: PledgeItem[]
}

export interface RedemptionQuote {
  loanAmount: number
  baseInterest: number
  overdueDays: number
  overdueInterest: number
  total: number
  pledge: Pledge
}

export interface NewPledgeItem {
  categoryId: number
  name: string
  attributes: Record<string, string | number>
  amount: number
}

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message
    throw new Error(message ?? `Ошибка запроса (${res.status})`)
  }
  return res.json()
}

export const api = {
  tariffs: () => http<Tariff[]>('/api/tariffs'),
  categories: () => http<ItemCategory[]>('/api/item-categories'),
  searchClients: (search: string) =>
    http<Client[]>(`/api/clients?search=${encodeURIComponent(search)}`),
  createClient: (data: { fullName: string; phone: string; passport?: string }) =>
    http<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  createPledge: (data: { tariffId: number; clientId: number; items: NewPledgeItem[] }) =>
    http<Pledge>('/api/pledges', { method: 'POST', body: JSON.stringify(data) }),
  activePledges: (clientId: number) =>
    http<Pledge[]>(`/api/pledges?clientId=${clientId}&status=active`),
  redemptionQuote: (id: number) =>
    http<RedemptionQuote>(`/api/pledges/${id}/redemption`),
  redeem: (id: number) =>
    http<Pledge>(`/api/pledges/${id}/redeem`, { method: 'POST' }),
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

export function todayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
