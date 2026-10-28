export type Classmate = {
  id: string
  name: string
  monthDay: string
}

export type BirthdayWish = {
  id: string
  recipientId: string
  senderName: string
  message: string
  anonymous: boolean
  createdAt: string
  tone: string
}

export const seedClassmates: Classmate[] = [
  { id: 'm-001', name: '苏可', monthDay: '10-30' },
  { id: 'm-002', name: '林夕', monthDay: '10-31' },
  { id: 'm-003', name: '许知夏', monthDay: '11-04' },
  { id: 'm-004', name: '陈一诺', monthDay: '11-04' },
  { id: 'm-005', name: '贺遥', monthDay: '11-12' },
  { id: 'm-006', name: '周予安', monthDay: '11-18' },
  { id: 'm-007', name: '田小满', monthDay: '11-27' },
  { id: 'm-008', name: '沈书禾', monthDay: '12-03' },
  { id: 'm-009', name: '顾星野', monthDay: '01-08' },
  { id: 'm-010', name: '叶知秋', monthDay: '03-16' },
  { id: 'm-011', name: '江言', monthDay: '05-28' },
  { id: 'm-012', name: '唐果', monthDay: '08-14' }
]

export const seedWishes: BirthdayWish[] = [
  {
    id: 'w-001', recipientId: 'm-003', senderName: '匿名同学',
    message: '新的一岁继续闪闪发光，所有的小愿望都慢慢实现。',
    anonymous: true, createdAt: '2026-10-26T09:30:00.000Z', tone: 'tone-mint'
  },
  {
    id: 'w-002', recipientId: 'm-004', senderName: '小同桌',
    message: '生日快乐！祝你每天都有好心情，奶茶永远加满小料。',
    anonymous: false, createdAt: '2026-10-25T12:00:00.000Z', tone: 'tone-rose'
  },
  {
    id: 'w-003', recipientId: 'm-001', senderName: '前排同学',
    message: '预祝生日快乐！希望你拆开这一岁时，收到好多好多开心。',
    anonymous: false, createdAt: '2026-10-27T14:10:00.000Z', tone: 'tone-yellow'
  }
]

export function getLocalDateISO (date = new Date ()): string {
  const offset = date.getTimezoneOffset () * 60_000
  return new Date (date.getTime () - offset).toISOString ().slice (0, 10)
}
