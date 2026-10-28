import confetti from 'canvas-confetti'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getLocalDateISO, seedClassmates, seedWishes, type BirthdayWish, type Classmate } from './data'

const supabase: SupabaseClient | null = __SUPABASE_URL__ && __SUPABASE_ANON_KEY__
  ? createClient (__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null

type SavedState = {
  classmates: Classmate[]
  wishes: BirthdayWish[]
  demoDate: string | null
  heroContent: HeroContent
}

type HeroContent = {
  title: string
  description: string
  imageSource: string
}

const defaultHeroContent: HeroContent = {
  title: '每个生日，\n都有全班的祝福。',
  description: '记住同学的生日，在那一天把心意送到 TA 手上。',
  imageSource: './assets/birthday-cake.jpg'
}
const heroImageBucket = 'class-birthday-wall-hero'

const storageKey = 'shiguang-class-birthday-v2'
const tones = ['tone-mint', 'tone-rose', 'tone-yellow', 'tone-lilac']
const randomWishes = [
  '新的一岁，愿你有数不尽的快乐和拆不完的小惊喜！',
  '愿你想做的事都勇敢去做，想见的人都刚好在身边。',
  '祝你生日快乐，今天的蛋糕最大块、好运也加倍！',
  '愿你一年三百六十五天，都有今天这样被喜欢的理由。',
  '祝你新的一岁不止长大一岁，还多出好多好多开心。'
]

function isClassmate (value: unknown): value is Classmate {
  if (value === null || typeof value !== 'object') return false
  const item = value as Partial<Classmate>
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.monthDay === 'string' && /^\d{2}-\d{2}$/.test(item.monthDay)
}

function isWish (value: unknown): value is BirthdayWish {
  if (value === null || typeof value !== 'object') return false
  const item = value as Partial<BirthdayWish>
  return typeof item.id === 'string' && typeof item.recipientId === 'string' && typeof item.senderName === 'string' && typeof item.message === 'string' && typeof item.anonymous === 'boolean' && typeof item.createdAt === 'string' && typeof item.tone === 'string'
}

function isHeroContent (value: unknown): value is HeroContent {
  if (value === null || typeof value !== 'object') return false
  const item = value as Partial<HeroContent>
  return typeof item.title === 'string' && item.title.length <= 80 &&
    typeof item.description === 'string' && item.description.length <= 160 &&
    typeof item.imageSource === 'string' && item.imageSource.length <= 4_000_000 &&
    (item.imageSource.startsWith ('data:image/') || item.imageSource.startsWith ('http://') || item.imageSource.startsWith ('https://') || item.imageSource.startsWith ('./assets/'))
}

function readState (): SavedState {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) return { classmates: [...seedClassmates], wishes: [...seedWishes], demoDate: null, heroContent: { ...defaultHeroContent } }
    const parsed: unknown = JSON.parse(saved)
    if (parsed === null || typeof parsed !== 'object') throw new Error('Invalid state')
    const candidate = parsed as Partial<SavedState>
    if (!Array.isArray(candidate.classmates) || !Array.isArray(candidate.wishes)) throw new Error('Invalid state')
    return {
      classmates: candidate.classmates.filter(isClassmate),
      wishes: candidate.wishes.filter(isWish),
      demoDate: typeof candidate.demoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(candidate.demoDate) ? candidate.demoDate : null,
      heroContent: isHeroContent(candidate.heroContent) ? candidate.heroContent : { ...defaultHeroContent }
    }
  } catch {
    return { classmates: [...seedClassmates], wishes: [...seedWishes], demoDate: null, heroContent: { ...defaultHeroContent } }
  }
}

let data = readState ()
if (supabase) data = { ...data, classmates: [], wishes: [], heroContent: { ...defaultHeroContent } }
let cloudHeroImagePath: string | null = null
let pendingHeroFile: File | null = null
let pendingHeroPreviewUrl: string | null = null
let selectedMonth = Number((data.demoDate ?? getLocalDateISO ()).slice (5, 7))
let adminSignedIn = false
let toastTimer = 0
let arrivalTimer = 0

const $ = <T extends HTMLElement> (selector: string): T | null => document.querySelector<T> (selector)
const classmateGrid = $<HTMLElement>('#classmate-grid')
const todayContent = $<HTMLElement>('#today-content')
const wishesGrid = $<HTMLElement>('#wishes-grid')
const emptyWishes = $<HTMLElement>('#empty-wishes')
const monthEmpty = $<HTMLElement>('#month-empty')
const recipientSelect = $<HTMLSelectElement>('#recipient')
const wishFilter = $<HTMLSelectElement>('#wish-filter')
const wishForm = $<HTMLFormElement>('#wish-form')
const messageInput = $<HTMLTextAreaElement>('#message')
const nicknameInput = $<HTMLInputElement>('#nickname')
const anonymousInput = $<HTMLInputElement>('#anonymous')
const charCount = $<HTMLElement>('#char-count')
const formStatus = $<HTMLElement>('#form-status')
const homeArrival = $<HTMLElement>('#home-arrival')
const arrivalEnter = $<HTMLButtonElement>('#arrival-enter')
const adminDialog = $<HTMLDialogElement>('#admin-dialog')
const adminAuth = $<HTMLElement>('#admin-auth')
const adminTools = $<HTMLElement>('#admin-tools')
const adminEmailInput = $<HTMLInputElement>('#admin-email')
const heroTitleInput = $<HTMLTextAreaElement>('#hero-title-input')
const heroDescriptionInput = $<HTMLTextAreaElement>('#hero-description-input')
const heroImageInput = $<HTMLInputElement>('#hero-image-input')
const heroImagePreview = $<HTMLImageElement>('#hero-image-preview')
const heroForm = $<HTMLFormElement>('#hero-form')
const rosterList = $<HTMLElement>('#roster-list')
const studentForm = $<HTMLFormElement>('#student-form')
const studentIdInput = $<HTMLInputElement>('#student-id')
const studentNameInput = $<HTMLInputElement>('#student-name')
const studentMonthInput = $<HTMLSelectElement>('#student-month')
const studentDayInput = $<HTMLSelectElement>('#student-day')
const demoDateInput = $<HTMLInputElement>('#demo-date')
const confettiBurst = confetti.create ($<HTMLCanvasElement>('#celebration-canvas')!, { resize: true, useWorker: true })

function persist (): boolean {
  try {
    if (supabase) {
      window.localStorage.setItem(storageKey, JSON.stringify ({ classmates: [], wishes: [], demoDate: data.demoDate, heroContent: data.heroContent }))
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify (data))
    }
    return true
  } catch {
    announce ('浏览器没有允许保存。当前内容仍显示在页面中。')
    return false
  }
}

function imageSourceForCloudPath (path: string | null): string {
  if (!path || !supabase) return defaultHeroContent.imageSource
  return supabase.storage.from (heroImageBucket).getPublicUrl (path).data.publicUrl
}

function renderHeroContent (): void {
  const title = $<HTMLElement>('#page-title')
  const description = $<HTMLElement>('#hero-description')
  const image = $<HTMLImageElement>('#hero-image')
  if (title) title.textContent = data.heroContent.title
  if (description) description.textContent = data.heroContent.description
  if (image) image.src = data.heroContent.imageSource
  if (image) image.onerror = () => { image.src = defaultHeroContent.imageSource }
}

function fillHeroForm (): void {
  if (heroTitleInput) heroTitleInput.value = data.heroContent.title
  if (heroDescriptionInput) heroDescriptionInput.value = data.heroContent.description
  if (heroImageInput) heroImageInput.value = ''
  if (heroImagePreview) heroImagePreview.src = data.heroContent.imageSource
  pendingHeroFile = null
  if (pendingHeroPreviewUrl) URL.revokeObjectURL (pendingHeroPreviewUrl)
  pendingHeroPreviewUrl = null
  const error = $<HTMLElement>('#hero-form-error')
  if (error) error.textContent = ''
  const status = $<HTMLElement>('#hero-form-status')
  if (status) status.textContent = ''
}

async function handleHeroSave (event: SubmitEvent): Promise<void> {
  event.preventDefault ()
  if (!heroTitleInput || !heroDescriptionInput) return
  const errorMessage = $<HTMLElement>('#hero-form-error')
  const status = $<HTMLElement>('#hero-form-status')
  const saveButton = $<HTMLButtonElement>('#hero-save')
  const title = heroTitleInput.value.trim ()
  const description = heroDescriptionInput.value.trim ()
  const file = pendingHeroFile
  const allowedTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  if (errorMessage) errorMessage.textContent = ''
  if (status) status.textContent = ''
  if (!title || !description) {
    if (errorMessage) errorMessage.textContent = '请填写标题和说明文字。'
    return
  }
  if (file && (!allowedTypes[file.type] || file.size > 2 * 1024 * 1024)) {
    if (errorMessage) errorMessage.textContent = '请选择 JPG、PNG 或 WebP 图片，且文件不超过 2 MB。'
    return
  }
  if (saveButton) saveButton.disabled = true
  try {
    if (supabase) {
      let imagePath = cloudHeroImagePath
      if (file) {
        const { data: { user }, error: userError } = await supabase.auth.getUser ()
        if (userError || !user) throw new Error ('管理员登录状态已失效，请重新登录。')
        imagePath = `${user.id}/${crypto.randomUUID ()}.${allowedTypes[file.type]}`
        const { error: uploadError } = await supabase.storage.from (heroImageBucket).upload (imagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        })
        if (uploadError) throw new Error ('图片上传失败，请确认管理员权限和 Supabase 图片存储配置。')
      }
      const { error } = await supabase.from ('site_settings').update ({
        hero_title: title,
        hero_description: description,
        hero_image_path: imagePath,
        updated_at: new Date ().toISOString ()
      }).eq ('id', 1)
      if (error) throw new Error ('横幅保存失败，请确认 Supabase 设置表已创建。')
      cloudHeroImagePath = imagePath
      data.heroContent = { title, description, imageSource: imageSourceForCloudPath (imagePath) }
      await refreshCloudState ()
    } else {
      const imageSource = file ? await readImageDataUrl (file) : data.heroContent.imageSource
      const previous = data.heroContent
      data.heroContent = { title, description, imageSource }
      if (!persist ()) {
        data.heroContent = previous
        renderHeroContent ()
        fillHeroForm ()
        return
      }
      renderHeroContent ()
    }
    fillHeroForm ()
    if (status) status.textContent = '横幅已更新。'
    announce ('横幅设置已保存。')
  } catch (error) {
    if (errorMessage) errorMessage.textContent = error instanceof Error ? error.message : '保存失败，请稍后重试。'
  } finally {
    if (saveButton) saveButton.disabled = false
  }
}

function readImageDataUrl (file: File): Promise<string> {
  return new Promise ((resolve, reject) => {
    const reader = new FileReader ()
    reader.addEventListener ('load', () => {
      if (typeof reader.result === 'string') resolve (reader.result)
      else reject (new Error ('Image could not be read'))
    }, { once: true })
    reader.addEventListener ('error', () => reject (new Error ('Image could not be read')), { once: true })
    reader.readAsDataURL (file)
  })
}

async function refreshCloudState (): Promise<boolean> {
  if (!supabase) return false
  const [classmatesResult, wishesResult, settingsResult] = await Promise.all([
    supabase.from ('classmates').select ('id, name, month_day').order ('month_day'),
    supabase.from ('wishes').select ('id, recipient_id, sender_name, message, anonymous, created_at').order ('created_at', { ascending: false }),
    supabase.from ('site_settings').select ('hero_title, hero_description, hero_image_path').eq ('id', 1).maybeSingle ()
  ])
  if (classmatesResult.error || wishesResult.error || settingsResult.error) {
    announce ('共享生日簿暂时无法读取，请检查 Supabase 配置和数据库权限。')
    return false
  }
  data.classmates = (classmatesResult.data ?? []).map (student => ({
    id: student.id,
    name: student.name,
    monthDay: student.month_day
  }))
  data.wishes = (wishesResult.data ?? []).map ((wish, index) => ({
    id: wish.id,
    recipientId: wish.recipient_id,
    senderName: wish.sender_name,
    message: wish.message,
    anonymous: wish.anonymous,
    createdAt: wish.created_at,
    tone: tones[index % tones.length]
  }))
  cloudHeroImagePath = settingsResult.data?.hero_image_path ?? null
  data.heroContent = settingsResult.data
    ? {
        title: settingsResult.data.hero_title,
        description: settingsResult.data.hero_description,
        imageSource: imageSourceForCloudPath (cloudHeroImagePath)
      }
    : { ...defaultHeroContent }
  renderAll ()
  if (adminSignedIn) renderRoster ()
  return true
}

async function isCurrentUserAdmin (): Promise<boolean> {
  if (!supabase) return false
  const { data: allowed, error } = await supabase.rpc ('is_class_admin')
  return !error && allowed === true
}

async function initializeCloud (): Promise<void> {
  if (!supabase) return
  await refreshCloudState ()
  const { data: { session } } = await supabase.auth.getSession ()
  if (session && await isCurrentUserAdmin ()) {
    adminSignedIn = true
    if (adminAuth) adminAuth.hidden = true
    if (adminTools) adminTools.hidden = false
    renderRoster ()
  } else if (session) {
    await supabase.auth.signOut ()
  }
  supabase.channel ('birthday-wall-updates')
    .on ('postgres_changes', { event: '*', schema: 'public', table: 'classmates' }, () => { void refreshCloudState () })
    .on ('postgres_changes', { event: '*', schema: 'public', table: 'wishes' }, () => { void refreshCloudState () })
    .on ('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => { void refreshCloudState () })
    .subscribe ()
  supabase.auth.onAuthStateChange (event => {
    if (event === 'SIGNED_OUT') {
      adminSignedIn = false
      if (adminAuth) adminAuth.hidden = false
      if (adminTools) adminTools.hidden = true
    }
  })
}

function announce (message: string): void {
  const toast = $<HTMLElement>('#toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.add ('is-visible')
  window.clearTimeout (toastTimer)
  toastTimer = window.setTimeout (() => toast.classList.remove ('is-visible'), 3200)
}

function dismissArrival (): void {
  if (!homeArrival || homeArrival.hidden || homeArrival.classList.contains ('is-leaving')) return
  window.clearTimeout (arrivalTimer)
  homeArrival.classList.add ('is-leaving')
  window.setTimeout (() => { homeArrival.hidden = true }, 480)
}

function el<K extends keyof HTMLElementTagNameMap> (tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement (tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function localDate (isoDate: string): Date {
  return new Date (`${isoDate}T00:00:00`)
}

function currentDate (): string {
  return data.demoDate ?? getLocalDateISO ()
}

function formatMonthDay (monthDay: string): string {
  const [month, day] = monthDay.split ('-').map (Number)
  return `${month}月${String (day).padStart (2, '0')}日`
}

function wishedCount (id: string): number {
  return data.wishes.filter (wish => wish.recipientId === id).length
}

function classmatesForMonth (month: number): Classmate[] {
  return data.classmates
    .filter (student => Number(student.monthDay.slice (0, 2)) === month)
    .sort ((a, b) => a.monthDay.localeCompare (b.monthDay) || a.name.localeCompare (b.name, 'zh-CN'))
}

function daysUntil (monthDay: string, anchor: string): { days: number, date: Date } {
  const today = localDate (anchor)
  const birthdayMonth = Number(monthDay.slice (0, 2)) - 1
  const birthdayDay = Number(monthDay.slice (3, 5))
  let year = today.getFullYear ()
  let next = new Date (year, birthdayMonth, birthdayDay)
  if (birthdayMonth === 1 && birthdayDay === 29 && next.getMonth () !== 1) next = new Date (year, 1, 28)
  if (next < today) {
    year += 1
    next = new Date (year, birthdayMonth, birthdayDay)
    if (birthdayMonth === 1 && birthdayDay === 29 && next.getMonth () !== 1) next = new Date (year, 1, 28)
  }
  const days = Math.round ((next.getTime () - today.getTime ()) / 86_400_000)
  return { days, date: next }
}

function celebrate (): void {
  if (window.matchMedia ('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#f18366', '#f5c879', '#78aa8c', '#aaa2d6', '#f8e2d7']
  confettiBurst ({ particleCount: 75, spread: 68, origin: { y: 0.74 }, colors, disableForReducedMotion: true })
  window.setTimeout (() => confettiBurst ({ particleCount: 35, angle: 60, spread: 54, origin: { x: 0.06, y: 0.78 }, colors }), 170)
  window.setTimeout (() => confettiBurst ({ particleCount: 35, angle: 120, spread: 54, origin: { x: 0.94, y: 0.78 }, colors }), 290)
}

function openWishForm (studentId: string): void {
  if (recipientSelect) recipientSelect.value = studentId
  if (messageInput) messageInput.focus ({ preventScroll: true })
  $('#write')?.scrollIntoView ({ behavior: 'smooth', block: 'start' })
}

function renderToday (): void {
  if (!todayContent) return
  todayContent.replaceChildren ()
  const dateISO = currentDate ()
  const date = localDate (dateISO)
  const dateLabel = $<HTMLElement>('#today-date')
  if (dateLabel) dateLabel.textContent = date.toLocaleDateString ('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  const todayKey = dateISO.slice (5, 10)
  const birthdayStudents = data.classmates.filter (student => student.monthDay === todayKey)

  if (birthdayStudents.length) {
    const banner = el ('div', 'today-banner birthday-banner')
    const seal = el ('span', 'birthday-seal', '✦')
    seal.setAttribute ('aria-hidden', 'true')
    const copy = el ('div', 'today-banner-copy')
    copy.append (el ('span', 'banner-kicker', 'HAPPY BIRTHDAY TODAY'), el ('strong', '', birthdayStudents.length === 1 ? `${birthdayStudents[0].name}，今天是你的主场！` : `今天有 ${birthdayStudents.length} 位同学过生日！`), el ('span', 'banner-subtitle', '送上祝福，让 TA 的这一天再亮一点。'))
    const button = el ('button', 'celebrate-button', '一起庆祝 ✨')
    button.type = 'button'
    button.addEventListener ('click', () => {
      celebrate ()
      announce ('生日快乐！今天的主角已经收到全班的欢呼。')
    })
    banner.append (seal, copy, button)
    todayContent.append (banner)
    const cards = el ('div', 'today-cards')
    for (const student of birthdayStudents) {
      cards.append (makeTodayCard (student, true, 0))
    }
    todayContent.append (cards)
    return
  }

  const upcoming = data.classmates
    .map (student => ({ student, ...daysUntil (student.monthDay, dateISO) }))
    .sort ((a, b) => a.days - b.days || a.student.name.localeCompare (b.student.name, 'zh-CN'))
  if (!upcoming.length) {
    const empty = el ('div', 'today-banner no-birthday-banner')
    empty.append (el ('span', 'birthday-seal', '✳'), el ('div', 'today-banner-copy', '名单里还没有同学，先由管理员加进生日簿吧。'))
    todayContent.append (empty)
    return
  }

  const nextGroup = upcoming.filter (item => item.days === upcoming[0].days)
  const banner = el ('div', 'today-banner next-banner')
  const seal = el ('span', 'birthday-seal', upcoming[0].days < 7 ? '✦' : '↗')
  const copy = el ('div', 'today-banner-copy')
  copy.append (el ('span', 'banner-kicker', upcoming[0].days < 7 ? 'BIRTHDAY IS COMING' : 'NEXT BIRTHDAY'), el ('strong', '', `${nextGroup.map (item => item.student.name).join ('、')} 的生日快到了`), el ('span', 'banner-subtitle', `${upcoming[0].days === 1 ? '明天' : upcoming[0].days === 0 ? '今天' : `${upcoming[0].days} 天后`} · ${upcoming[0].date.toLocaleDateString ('zh-CN', { month: 'long', day: 'numeric' })}`))
  banner.append (seal, copy)
  todayContent.append (banner)

  const cards = el ('div', 'today-cards')
  for (const item of upcoming.slice (0, 3)) {
    cards.append (makeTodayCard (item.student, false, item.days))
  }
  todayContent.append (cards)
}

function makeTodayCard (student: Classmate, birthdayToday: boolean, days: number): HTMLElement {
  const card = el ('article', `today-person${birthdayToday ? ' is-today' : ''}`)
  const badge = el ('span', `person-avatar ${tones[Number(student.id.replace(/\D/g, '')) % tones.length] ?? tones[0]}`, student.name.slice (0, 1))
  badge.setAttribute ('aria-hidden', 'true')
  const details = el ('div', 'today-person-copy')
  details.append (el ('strong', '', student.name), el ('span', 'today-person-date', formatMonthDay (student.monthDay)))
  const countdown = birthdayToday ? '今天生日' : days === 1 ? '明天生日' : `${days} 天后`
  const daysBadge = el ('span', `days-badge${birthdayToday ? ' is-birthday' : ''}`, countdown)
  const button = el ('button', 'small-wish-button', birthdayToday ? '送祝福' : '提前写卡')
  button.type = 'button'
  button.addEventListener ('click', () => openWishForm (student.id))
  card.append (badge, details, daysBadge, button)
  return card
}

function renderMonth (): void {
  if (!classmateGrid || !monthEmpty) return
  const students = classmatesForMonth (selectedMonth)
  const label = $<HTMLElement>('[data-month-label="number"]')
  if (label) label.textContent = String (selectedMonth)
  const count = $<HTMLElement>('#month-birthday-count')
  if (count) count.textContent = `${students.length} 位寿星`
  classmateGrid.replaceChildren ()
  for (const student of students) classmateGrid.append (makeClassmateCard (student))
  monthEmpty.hidden = students.length > 0

  for (let month = 1; month <= 12; month += 1) {
    const badge = $<HTMLElement>(`[data-month-count="${month}"]`)
    if (badge) badge.textContent = String (classmatesForMonth (month).length)
  }
}

function makeClassmateCard (student: Classmate): HTMLElement {
  const wishes = wishedCount (student.id)
  const card = el ('article', 'classmate-card')
  const top = el ('div', 'classmate-card-top')
  const avatar = el ('span', `person-avatar ${tones[Number(student.id.replace(/\D/g, '')) % tones.length] ?? tones[0]}`, student.name.slice (0, 1))
  avatar.setAttribute ('aria-hidden', 'true')
  const date = el ('time', 'birthday-date', formatMonthDay (student.monthDay))
  top.append (avatar, date)
  card.append (top, el ('h3', 'classmate-name', student.name))
  const count = el ('span', 'classmate-wish-count', wishes ? `已收到 ${wishes} 份祝福` : '等第一份生日祝福')
  card.append (count)
  const button = el ('button', 'card-wish-button', wishes ? '再写一张卡' : '送上第一份祝福')
  button.type = 'button'
  button.addEventListener ('click', () => openWishForm (student.id))
  card.append (button)
  return card
}

function populateRecipientSelect (): void {
  if (!recipientSelect) return
  const current = recipientSelect.value
  recipientSelect.replaceChildren (new Option ('先选一位同学', ''))
  const sorted = [...data.classmates].sort ((a, b) => a.monthDay.localeCompare (b.monthDay) || a.name.localeCompare (b.name, 'zh-CN'))
  for (const student of sorted) recipientSelect.add (new Option (`${student.name} · ${formatMonthDay (student.monthDay)}`, student.id))
  if (data.classmates.some (student => student.id === current)) recipientSelect.value = current
}

function populateWishFilter (): void {
  if (!wishFilter) return
  const current = wishFilter.value || 'all'
  wishFilter.replaceChildren (new Option ('全班同学', 'all'))
  for (const student of [...data.classmates].sort ((a, b) => a.name.localeCompare (b.name, 'zh-CN'))) {
    wishFilter.add (new Option (student.name, student.id))
  }
  if ([...wishFilter.options].some (option => option.value === current)) wishFilter.value = current
}

function renderWishes (): void {
  if (!wishesGrid || !emptyWishes) return
  const filterId = wishFilter?.value ?? 'all'
  const filtered = [...data.wishes]
    .filter (wish => filterId === 'all' || wish.recipientId === filterId)
    .sort ((a, b) => b.createdAt.localeCompare (a.createdAt))
  wishesGrid.replaceChildren ()
  for (const wish of filtered.slice (0, 12)) {
    const recipient = data.classmates.find (student => student.id === wish.recipientId)
    if (!recipient) continue
    const card = el ('article', `wish-card ${wish.tone}`)
    card.append (el ('span', 'wish-recipient', `TO  ${recipient.name}`))
    const quote = el ('p', 'wish-message', wish.message)
    card.append (quote)
    const meta = el ('div', 'wish-meta')
    const avatar = el ('span', 'wish-avatar', wish.senderName.slice (0, 1))
    avatar.setAttribute ('aria-hidden', 'true')
    meta.append (avatar, el ('strong', '', wish.anonymous ? '匿名同学' : wish.senderName), el ('time', '', new Date (wish.createdAt).toLocaleDateString ('zh-CN', { month: 'numeric', day: 'numeric' })))
    card.append (meta, el ('span', 'wish-flower', ['✿', '✦', '❋', '✳'][Math.abs(wish.id.length + wish.message.length) % 4]))
    wishesGrid.append (card)
  }
  emptyWishes.hidden = filtered.length > 0
}

function centerSelectedMonth (): void {
  const tabList = $<HTMLElement>('.month-tabs')
  const activeTab = $<HTMLElement>(`[data-month-tab="${selectedMonth}"]`)
  if (!tabList || !activeTab || tabList.scrollWidth <= tabList.clientWidth) return
  const tabBounds = activeTab.getBoundingClientRect ()
  const listBounds = tabList.getBoundingClientRect ()
  tabList.scrollLeft += tabBounds.left - listBounds.left - (listBounds.width - tabBounds.width) / 2
}

function renderAll (): void {
  renderHeroContent ()
  const selected = $<HTMLElement>('.month-tab.is-active')
  if (selected) selected.classList.remove ('is-active')
  const activeTab = $<HTMLButtonElement>(`[data-month-tab="${selectedMonth}"]`)
  if (activeTab) {
    activeTab.classList.add ('is-active')
    activeTab.setAttribute ('aria-selected', 'true')
    window.requestAnimationFrame (centerSelectedMonth)
  }
  const count = $<HTMLElement>('#classmate-total')
  if (count) count.textContent = String (data.classmates.length)
  const wishesCount = $<HTMLElement>('#wish-total')
  if (wishesCount) wishesCount.textContent = String (data.wishes.length)
  renderToday ()
  renderMonth ()
  populateRecipientSelect ()
  populateWishFilter ()
  renderWishes ()
}

function updateDayOptions (month: number, selectedDay?: number): void {
  if (!studentDayInput) return
  const length = month === 2 ? 29 : [4, 6, 9, 11].includes (month) ? 30 : 31
  const oldValue = Number(studentDayInput.value)
  const day = selectedDay ?? oldValue ?? 1
  studentDayInput.replaceChildren ()
  for (let value = 1; value <= length; value += 1) {
    studentDayInput.add (new Option (`${String(value).padStart (2, '0')} 日`, String (value).padStart (2, '0')))
  }
  studentDayInput.value = String(Math.min (day || 1, length)).padStart (2, '0')
}

function renderRoster (): void {
  if (!rosterList) return
  rosterList.replaceChildren ()
  for (const student of [...data.classmates].sort ((a, b) => a.monthDay.localeCompare (b.monthDay) || a.name.localeCompare (b.name, 'zh-CN'))) {
    const row = el ('div', 'roster-row')
    row.append (el ('strong', '', student.name), el ('time', '', formatMonthDay (student.monthDay)))
    const actions = el ('div', 'roster-actions')
    const edit = el ('button', 'row-icon-button', '编辑')
    edit.type = 'button'
    edit.addEventListener ('click', () => {
      if (studentIdInput) studentIdInput.value = student.id
      if (studentNameInput) studentNameInput.value = student.name
      const [month, day] = student.monthDay.split ('-').map (Number)
      if (studentMonthInput) studentMonthInput.value = String (month).padStart (2, '0')
      updateDayOptions (month, day)
      if (studentDayInput) studentDayInput.value = String (day).padStart (2, '0')
      const save = $<HTMLElement>('#student-save')
      if (save) save.innerHTML = '保存生日修改 <span aria-hidden="true">↗</span>'
      $<HTMLElement>('#student-cancel')?.removeAttribute ('hidden')
      studentNameInput?.focus ()
      studentForm?.scrollIntoView ({ behavior: 'smooth', block: 'nearest' })
    })
    const remove = el ('button', 'row-delete-button', '移除')
    remove.type = 'button'
    remove.addEventListener ('click', () => { void (async () => {
      if (!window.confirm (`移除 ${student.name}，并同时移除这位同学收到的祝福？`)) return
      if (supabase) {
        const { error } = await supabase.from ('classmates').delete ().eq ('id', student.id)
        if (error) {
          announce ('移除失败，请确认管理员账号仍有权限。')
          return
        }
        await refreshCloudState ()
        announce (`已从生日簿移除 ${student.name}。`)
        return
      }
      data.classmates = data.classmates.filter (item => item.id !== student.id)
      data.wishes = data.wishes.filter (wish => wish.recipientId !== student.id)
      persist ()
      renderAll ()
      renderRoster ()
      announce (`已从生日簿移除 ${student.name}。`)
    })() })
    actions.append (edit, remove)
    row.append (actions)
    rosterList.append (row)
  }
  const number = $<HTMLElement>('#roster-count')
  const total = $<HTMLElement>('#admin-student-count')
  if (number) number.textContent = `${data.classmates.length} 位同学`
  if (total) total.textContent = String (data.classmates.length)
}

function resetStudentForm (): void {
  studentForm?.reset ()
  if (studentIdInput) studentIdInput.value = ''
  if (studentMonthInput) studentMonthInput.value = '01'
  updateDayOptions (1, 1)
  const save = $<HTMLElement>('#student-save')
  if (save) save.innerHTML = '添加到生日簿 <span aria-hidden="true">↗</span>'
  $<HTMLElement>('#student-cancel')?.setAttribute ('hidden', '')
}

function openAdmin (): void {
  if (adminAuth) adminAuth.hidden = adminSignedIn
  if (adminTools) adminTools.hidden = !adminSignedIn
  const authCopy = $<HTMLElement>('#admin-auth-copy')
  const submit = $<HTMLElement>('#admin-login-submit')
  const password = $<HTMLInputElement>('#admin-password')
  if (authCopy) authCopy.textContent = supabase
    ? '使用获准的管理员邮箱登录后可管理班级生日簿。'
    : '本地演示模式：输入任意邮箱和密码即可编辑当前浏览器里的示例数据。'
  if (submit) submit.innerHTML = '登录管理员 <span aria-hidden="true">↗</span>'
  if (adminEmailInput) adminEmailInput.value = ''
  if (password) password.value = ''
  const error = $<HTMLElement>('#admin-auth-error')
  if (error) error.textContent = ''
  renderRoster ()
  fillHeroForm ()
  if (adminDialog && !adminDialog.open) adminDialog.showModal ()
}

async function handleAdminLogin (event: SubmitEvent): Promise<void> {
  event.preventDefault ()
  const password = $<HTMLInputElement>('#admin-password')
  const error = $<HTMLElement>('#admin-auth-error')
  const email = adminEmailInput?.value.trim ()
  if (!password || !error || !email) return
  error.textContent = ''
  if (password.value.length < 8) {
    error.textContent = '密码至少需要 8 位。'
    return
  }
  if (!supabase) {
    adminSignedIn = true
    if (adminAuth) adminAuth.hidden = true
    if (adminTools) adminTools.hidden = false
    renderRoster ()
    if (demoDateInput) demoDateInput.value = currentDate ()
    updateDayOptions (Number(studentMonthInput?.value ?? '01'), 1)
    announce ('本地演示管理员已登录。')
    return
  }
  const { error: loginError } = await supabase.auth.signInWithPassword ({ email, password: password.value })
  if (loginError) {
    error.textContent = '邮箱或密码不正确，请重试。'
    return
  }
  if (!await isCurrentUserAdmin ()) {
    await supabase.auth.signOut ()
    error.textContent = '这个邮箱尚未获准管理生日簿。'
    return
  }
  adminSignedIn = true
  if (adminAuth) adminAuth.hidden = true
  if (adminTools) adminTools.hidden = false
  await refreshCloudState ()
  renderRoster ()
  fillHeroForm ()
  if (demoDateInput) demoDateInput.value = currentDate ()
  updateDayOptions (Number(studentMonthInput?.value ?? '01'), 1)
  announce ('管理员已登录。')
}

function wireEvents (): void {
  document.querySelectorAll<HTMLButtonElement>('[data-month-tab]').forEach (tab => {
    tab.addEventListener ('click', () => {
      selectedMonth = Number (tab.dataset.monthTab)
      document.querySelectorAll ('.month-tab').forEach (item => {
        item.classList.toggle ('is-active', item === tab)
        item.setAttribute ('aria-selected', String(item === tab))
      })
      renderMonth ()
      window.requestAnimationFrame (centerSelectedMonth)
    })
    tab.addEventListener ('keydown', event => {
      const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-month-tab]')]
      const index = tabs.indexOf (tab)
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : index
      if (next === index) return
      event.preventDefault ()
      tabs[next].focus ()
      tabs[next].click ()
    })
  })

  wishFilter?.addEventListener ('change', renderWishes)
  recipientSelect?.addEventListener ('change', () => {
    if (formStatus) formStatus.textContent = ''
  })
  messageInput?.addEventListener ('input', () => {
    if (charCount) charCount.textContent = String (messageInput.value.length)
    if (formStatus) formStatus.textContent = ''
  })
  anonymousInput?.addEventListener ('change', () => {
    if (!nicknameInput) return
    nicknameInput.disabled = anonymousInput.checked
    if (anonymousInput.checked) nicknameInput.value = ''
  })
  document.querySelectorAll<HTMLButtonElement>('[data-phrase]').forEach (button => {
    button.addEventListener ('click', () => {
      if (!messageInput) return
      const phrase = button.dataset.phrase ?? ''
      messageInput.value = `${messageInput.value}${messageInput.value.trim() ? ' ' : ''}${phrase}`
      messageInput.dispatchEvent (new Event ('input', { bubbles: true }))
      messageInput.focus ()
    })
  })
  $('#random-wish')?.addEventListener ('click', () => {
    if (!messageInput) return
    messageInput.value = randomWishes[Math.floor (Math.random () * randomWishes.length)]
    messageInput.dispatchEvent (new Event ('input', { bubbles: true }))
    messageInput.focus ()
  })

  wishForm?.addEventListener ('submit', event => { void (async () => {
    event.preventDefault ()
    if (!recipientSelect || !messageInput || !nicknameInput || !anonymousInput) return
    const student = data.classmates.find (item => item.id === recipientSelect.value)
    const message = messageInput.value.trim ()
    if (!student || !message) {
      if (formStatus) formStatus.textContent = '先选择一位寿星，再写下祝福内容。'
      return
    }
    const anonymous = anonymousInput.checked
    const senderName = anonymous ? '匿名同学' : nicknameInput.value.trim () || '同学'
    if (supabase) {
      const { error } = await supabase.from ('wishes').insert ({
        recipient_id: student.id,
        sender_name: senderName,
        message,
        anonymous
      })
      if (error) {
        if (formStatus) formStatus.textContent = '祝福暂时没有送出，请稍后重试。'
        return
      }
      await refreshCloudState ()
    } else {
      const wish: BirthdayWish = {
        id: globalThis.crypto?.randomUUID?.() ?? `w-${Date.now ()}`,
        recipientId: student.id,
        senderName,
        message,
        anonymous,
        createdAt: new Date ().toISOString (),
        tone: tones[data.wishes.length % tones.length]
      }
      data.wishes.unshift (wish)
      persist ()
    }
    selectedMonth = Number (student.monthDay.slice (0, 2))
    renderAll ()
    if (recipientSelect) recipientSelect.value = student.id
    if (formStatus) formStatus.textContent = `送给 ${student.name} 的生日卡已经放进祝福墙。`
    messageInput.value = ''
    if (charCount) charCount.textContent = '0'
    if (anonymousInput.checked) {
      anonymousInput.checked = false
      nicknameInput.disabled = false
    }
    celebrate ()
  })() })

  $('#admin-open')?.addEventListener ('click', openAdmin)
  $('#admin-close')?.addEventListener ('click', () => adminDialog?.close ())
  adminDialog?.addEventListener ('click', event => {
    if (event.target === adminDialog) adminDialog.close ()
  })
  $('#admin-login-form')?.addEventListener ('submit', event => { void handleAdminLogin (event as SubmitEvent) })
  heroForm?.addEventListener ('submit', event => { void handleHeroSave (event as SubmitEvent) })
  heroForm?.addEventListener ('input', () => {
    const status = $<HTMLElement>('#hero-form-status')
    if (status) status.textContent = ''
  })
  heroImageInput?.addEventListener ('change', () => {
    if (pendingHeroPreviewUrl) URL.revokeObjectURL (pendingHeroPreviewUrl)
    pendingHeroPreviewUrl = null
    pendingHeroFile = heroImageInput.files?.[0] ?? null
    const error = $<HTMLElement>('#hero-form-error')
    if (error) error.textContent = ''
    const status = $<HTMLElement>('#hero-form-status')
    if (status) status.textContent = ''
    if (!pendingHeroFile) {
      if (heroImagePreview) heroImagePreview.src = data.heroContent.imageSource
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes (pendingHeroFile.type) || pendingHeroFile.size > 2 * 1024 * 1024) {
      if (error) error.textContent = '请选择 JPG、PNG 或 WebP 图片，且文件不超过 2 MB。'
      pendingHeroFile = null
      heroImageInput.value = ''
      if (heroImagePreview) heroImagePreview.src = data.heroContent.imageSource
      return
    }
    pendingHeroPreviewUrl = URL.createObjectURL (pendingHeroFile)
    if (heroImagePreview) heroImagePreview.src = pendingHeroPreviewUrl
  })
  $('#admin-logout')?.addEventListener ('click', () => {
    adminSignedIn = false
    if (supabase) void supabase.auth.signOut ()
    adminDialog?.close ()
    announce ('已退出管理员。')
  })
  studentMonthInput?.addEventListener ('change', () => updateDayOptions (Number(studentMonthInput.value)))
  studentForm?.addEventListener ('submit', event => { void (async () => {
    event.preventDefault ()
    if (!studentNameInput || !studentMonthInput || !studentDayInput || !studentIdInput) return
    const name = studentNameInput.value.trim ()
    const month = String (studentMonthInput.value).padStart (2, '0')
    const day = String (studentDayInput.value).padStart (2, '0')
    const id = studentIdInput.value
    const duplicate = data.classmates.some (student => student.id !== id && student.name.localeCompare (name, 'zh-CN', { sensitivity: 'base' }) === 0)
    if (!name || duplicate) {
      announce (duplicate ? '名单里已经有这个名字了。' : '请填写同学姓名。')
      return
    }
    const monthDay = `${month}-${day}`
    if (supabase) {
      const result = id
        ? await supabase.from ('classmates').update ({ name, month_day: monthDay }).eq ('id', id)
        : await supabase.from ('classmates').insert ({ name, month_day: monthDay })
      if (result.error) {
        announce (result.error.code === '23505' ? '生日簿中已有相同的同学记录。' : '保存失败，请确认管理员账号仍有权限。')
        return
      }
      await refreshCloudState ()
      announce (id ? `已更新 ${name} 的生日。` : `已把 ${name} 加入生日簿。`)
    } else if (id) {
      data.classmates = data.classmates.map (student => student.id === id ? { ...student, name, monthDay } : student)
      announce (`已更新 ${name} 的生日。`)
    } else {
      data.classmates.push ({ id: globalThis.crypto?.randomUUID?.() ?? `m-${Date.now ()}`, name, monthDay })
      announce (`已把 ${name} 加入生日簿。`)
    }
    if (!supabase) persist ()
    resetStudentForm ()
    renderAll ()
    renderRoster ()
  })() })
  $('#student-cancel')?.addEventListener ('click', resetStudentForm)

  $('#apply-demo-date')?.addEventListener ('click', () => {
    const date = demoDateInput?.value
    if (!date || Number.isNaN(localDate (date).getTime ())) {
      announce ('先选一个有效的演示日期。')
      return
    }
    data.demoDate = date
    selectedMonth = Number (date.slice (5, 7))
    persist ()
    renderAll ()
    announce (`演示日期已切换到 ${localDate (date).toLocaleDateString ('zh-CN', { month: 'long', day: 'numeric' })}。`)
  })
  $('#reset-demo-date')?.addEventListener ('click', () => {
    data.demoDate = null
    selectedMonth = Number(getLocalDateISO ().slice (5, 7))
    if (demoDateInput) demoDateInput.value = getLocalDateISO ()
    persist ()
    renderAll ()
    announce ('已恢复今天的实际日期。')
  })
}

if (studentMonthInput) {
  for (let month = 1; month <= 12; month += 1) studentMonthInput.add (new Option (`${month} 月`, String (month).padStart (2, '0')))
  studentMonthInput.value = '01'
}
updateDayOptions (1, 1)
wireEvents ()
renderAll ()
if (homeArrival) {
  if (window.matchMedia ('(prefers-reduced-motion: reduce)').matches) {
    homeArrival.hidden = true
  } else {
    arrivalEnter?.addEventListener ('click', dismissArrival)
    arrivalTimer = window.setTimeout (dismissArrival, 2050)
  }
}
void initializeCloud ()
window.addEventListener ('resize', centerSelectedMonth)
window.addEventListener ('load', () => window.requestAnimationFrame (centerSelectedMonth), { once: true })
window.setTimeout (centerSelectedMonth, 80)
