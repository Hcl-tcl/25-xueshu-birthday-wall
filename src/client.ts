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
const classmatePhotoBucket = 'classmate-photos'

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
let selectedDate = calendarDateForDate (data.demoDate ?? getLocalDateISO ())
let selectedMonth = selectedDate.month
let selectedYear = selectedDate.year
let timelineMonths = makeTimeline (selectedDate)
let adminSignedIn = false
let photoSchemaReady = !supabase
let birthdayYearSchemaReady = !supabase
let pendingStudentPhoto: File | null = null
let pendingStudentPhotoUrl: string | null = null
let removeStudentPhoto = false
let pendingBirthdayYear = selectedYear
let toastTimer = 0
let arrivalTimer = 0

const $ = <T extends HTMLElement> (selector: string): T | null => document.querySelector<T> (selector)
const classmateGrid = $<HTMLElement>('#classmate-grid')
const todayContent = $<HTMLElement>('#today-content')
const wishesGrid = $<HTMLElement>('#wishes-grid')
const emptyWishes = $<HTMLElement>('#empty-wishes')
const monthEmpty = $<HTMLElement>('#month-empty')
const recipientSelect = $<HTMLSelectElement>('#recipient')
const wishYearSelect = $<HTMLSelectElement>('#wish-birthday-year')
const wishFilter = $<HTMLSelectElement>('#wish-filter')
const wishForm = $<HTMLFormElement>('#wish-form')
const messageInput = $<HTMLTextAreaElement>('#message')
const nicknameInput = $<HTMLInputElement>('#nickname')
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
const wishAdminList = $<HTMLElement>('#wish-admin-list')
const wishAdminStudent = $<HTMLSelectElement>('#wish-admin-student')
const wishAdminSearch = $<HTMLInputElement>('#wish-admin-search')
const wishAdminCount = $<HTMLElement>('#wish-admin-count')
const wishAdminEmpty = $<HTMLElement>('#wish-admin-empty')
const studentForm = $<HTMLFormElement>('#student-form')
const studentIdInput = $<HTMLInputElement>('#student-id')
const studentNameInput = $<HTMLInputElement>('#student-name')
const studentMonthInput = $<HTMLSelectElement>('#student-month')
const studentDayInput = $<HTMLSelectElement>('#student-day')
const studentPhotoInput = $<HTMLInputElement>('#student-photo')
const studentPhotoPreview = $<HTMLElement>('#student-photo-preview')
const studentPhotoRemove = $<HTMLButtonElement>('#student-photo-remove')
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

function imageSourceForClassmatePath (path: string | null): string {
  if (!path || !supabase) return ''
  return supabase.storage.from (classmatePhotoBucket).getPublicUrl (path).data.publicUrl
}

function isMissingColumnError (error: { code?: string, message?: string }, column: string): boolean {
  return error.code === '42703' || error.code === 'PGRST204' || (error.message ?? '').toLowerCase ().includes (column)
}

function updateSchemaNotice (): void {
  const note = $<HTMLElement>('#admin-schema-note')
  if (note) note.hidden = !supabase || (photoSchemaReady && birthdayYearSchemaReady)
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

function readImageDataUrl (file: Blob): Promise<string> {
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
    supabase.from ('classmates').select ('id, name, month_day, photo_path').order ('month_day'),
    supabase.from ('wishes').select ('id, recipient_id, sender_name, message, anonymous, created_at, birthday_year').order ('created_at', { ascending: false }),
    supabase.from ('site_settings').select ('hero_title, hero_description, hero_image_path').eq ('id', 1).maybeSingle ()
  ])
  photoSchemaReady = !classmatesResult.error
  birthdayYearSchemaReady = !wishesResult.error
  let classmatesError = classmatesResult.error
  let wishesError = wishesResult.error
  let classmatesData: Array<{ id: string, name: string, month_day: string, photo_path?: string | null }> = classmatesResult.data ?? []
  let wishesData: Array<{ id: string, recipient_id: string, sender_name: string, message: string, anonymous: boolean, created_at: string, birthday_year?: number | null }> = wishesResult.data ?? []
  if (classmatesResult.error && isMissingColumnError (classmatesResult.error, 'photo_path')) {
    const fallback = await supabase.from ('classmates').select ('id, name, month_day').order ('month_day')
    classmatesError = fallback.error
    classmatesData = fallback.data ?? []
    photoSchemaReady = false
  }
  if (wishesResult.error && isMissingColumnError (wishesResult.error, 'birthday_year')) {
    const fallback = await supabase.from ('wishes').select ('id, recipient_id, sender_name, message, anonymous, created_at').order ('created_at', { ascending: false })
    wishesError = fallback.error
    wishesData = fallback.data ?? []
    birthdayYearSchemaReady = false
  }
  if (classmatesError || wishesError || settingsResult.error) {
    announce ('共享生日簿暂时无法读取，请检查 Supabase 配置和数据库权限。')
    return false
  }
  data.classmates = classmatesData.map (student => ({
    id: student.id,
    name: student.name,
    monthDay: student.month_day,
    photoPath: student.photo_path ?? undefined,
    photoSource: student.photo_path ? imageSourceForClassmatePath (student.photo_path) : undefined
  }))
  data.wishes = wishesData.map ((wish, index) => ({
    id: wish.id,
    recipientId: wish.recipient_id,
    senderName: wish.sender_name,
    message: wish.message,
    anonymous: wish.anonymous,
    createdAt: wish.created_at,
    tone: tones[index % tones.length],
    birthdayYear: wish.birthday_year ?? undefined
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
  updateSchemaNotice ()
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

function calendarDateForDate (dateISO: string): { year: number, month: number } {
  const date = localDate (dateISO)
  const lastDay = new Date (date.getFullYear (), date.getMonth () + 1, 0).getDate ()
  const previewing = date.getDate () === lastDay
  const next = new Date (date.getFullYear (), date.getMonth () + (previewing ? 1 : 0), 1)
  return { year: next.getFullYear (), month: next.getMonth () + 1 }
}

function addCalendarMonths (start: { year: number, month: number }, offset: number): { year: number, month: number } {
  const date = new Date (start.year, start.month - 1 + offset, 1)
  return { year: date.getFullYear (), month: date.getMonth () + 1 }
}

function isMonthPreview (dateISO: string, year: number, month: number): boolean {
  const anchor = { year: Number (dateISO.slice (0, 4)), month: Number (dateISO.slice (5, 7)) }
  return year > anchor.year || (year === anchor.year && month > anchor.month)
}

function monthIndex (date: { year: number, month: number }): number {
  return date.year * 12 + date.month - 1
}

function makeTimeline (anchor: { year: number, month: number }): Array<{ year: number, month: number }> {
  const launch = { year: 2026, month: 10 }
  const start = monthIndex (anchor) < monthIndex (launch) ? anchor : launch
  return Array.from ({ length: monthIndex (anchor) - monthIndex (start) + 12 }, (_, index) => addCalendarMonths (start, index))
}

function selectTimelineDate (year: number, month: number): void {
  selectedYear = year
  selectedMonth = month
  while (monthIndex (timelineMonths[timelineMonths.length - 1]) < monthIndex ({ year, month })) {
    const last = timelineMonths[timelineMonths.length - 1]
    timelineMonths.push (addCalendarMonths (last, 1))
  }
  while (monthIndex (timelineMonths[0]) > monthIndex ({ year, month })) {
    timelineMonths.unshift (addCalendarMonths (timelineMonths[0], -1))
  }
  renderTimeline ()
  renderMonth ()
  renderWishes ()
  window.requestAnimationFrame (centerSelectedMonth)
}

function resetTimelineFromDate (dateISO: string): void {
  selectedDate = calendarDateForDate (dateISO)
  selectedYear = selectedDate.year
  selectedMonth = selectedDate.month
  timelineMonths = makeTimeline (selectedDate)
}

function formatMonthDay (monthDay: string): string {
  const [month, day] = monthDay.split ('-').map (Number)
  return `${month}月${String (day).padStart (2, '0')}日`
}

function wishedCount (id: string, year = selectedYear): number {
  return data.wishes.filter (wish => wish.recipientId === id && wish.birthdayYear === year).length
}

function legacyWishedCount (id: string): number {
  return data.wishes.filter (wish => wish.recipientId === id && !wish.birthdayYear).length
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

function openWishForm (studentId: string, birthdayYear = selectedYear): void {
  pendingBirthdayYear = birthdayYear
  populateWishYears ()
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
      cards.append (makeTodayCard (student, true, 0, date.getFullYear ()))
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
  for (const item of upcoming.slice (0, 6)) {
    cards.append (makeTodayCard (item.student, false, item.days, item.date.getFullYear ()))
  }
  todayContent.append (cards)
}

function makeTodayCard (student: Classmate, birthdayToday: boolean, days: number, birthdayYear: number): HTMLElement {
  const card = el ('article', `today-person${birthdayToday ? ' is-today' : ''}`)
  const badge = el ('span', `person-avatar ${tones[Number(student.id.replace(/\D/g, '')) % tones.length] ?? tones[0]}`, student.name.slice (0, 1))
  badge.setAttribute ('aria-hidden', 'true')
  appendStudentPhoto (badge, student)
  const details = el ('div', 'today-person-copy')
  details.append (el ('strong', '', student.name), el ('span', 'today-person-date', `${birthdayYear}年 · ${formatMonthDay (student.monthDay)}`))
  const countdown = birthdayToday ? '今天生日' : days === 1 ? '明天生日' : `${days} 天后`
  const daysBadge = el ('span', `days-badge${birthdayToday ? ' is-birthday' : ''}`, countdown)
  const button = el ('button', 'small-wish-button', birthdayToday ? '送祝福' : '提前写卡')
  button.type = 'button'
  button.addEventListener ('click', () => openWishForm (student.id, birthdayYear))
  card.append (badge, details, daysBadge, button)
  return card
}

function renderMonth (): void {
  if (!classmateGrid || !monthEmpty) return
  const students = classmatesForMonth (selectedMonth)
  const previewNote = $<HTMLElement>('#month-preview-note')
  const previewTitle = $<HTMLElement>('#month-preview-title')
  const previewDescription = $<HTMLElement>('#month-preview-description')
  const previewingNextMonth = isMonthPreview (currentDate (), selectedYear, selectedMonth)
  if (previewNote) previewNote.hidden = !previewingNextMonth
  if (previewTitle) previewTitle.textContent = `${selectedYear}年${selectedMonth}月生日墙提前开门啦`
  if (previewDescription) previewDescription.textContent = students.length
    ? `${selectedYear}年${selectedMonth}月有 ${students.length} 位寿星，大家现在就可以提前送上祝福。`
    : '这个月暂时还没有生日名单，管理员补充后会显示在这里。'
  const label = $<HTMLElement>('#month-label')
  if (label) label.textContent = `${selectedYear}年${selectedMonth}月生日的同学`
  const count = $<HTMLElement>('#month-birthday-count')
  if (count) count.textContent = `${students.length} 位寿星`
  classmateGrid.replaceChildren ()
  for (const student of students) classmateGrid.append (makeClassmateCard (student))
  monthEmpty.hidden = students.length > 0

}

function renderTimeline (): void {
  const tabList = $<HTMLElement>('#month-tabs')
  if (!tabList) return
  tabList.replaceChildren ()
  for (const item of timelineMonths) {
    const button = el ('button', `month-tab${item.year === selectedYear && item.month === selectedMonth ? ' is-active' : ''}`)
    button.type = 'button'
    button.setAttribute ('role', 'tab')
    button.dataset.year = String (item.year)
    button.dataset.month = String (item.month)
    button.setAttribute ('aria-selected', String (item.year === selectedYear && item.month === selectedMonth))
    button.setAttribute ('aria-label', `${item.year}年${item.month}月，${classmatesForMonth (item.month).length} 位寿星`)
    const date = el ('span', 'month-tab-date', `${String (item.year).slice (-2)}.${String (item.month).padStart (2, '0')}`)
    const count = el ('span', 'month-count', String (classmatesForMonth (item.month).length))
    button.append (date, count)
    button.addEventListener ('click', () => selectTimelineDate (item.year, item.month))
    button.addEventListener ('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes (event.key)) return
      const buttons = [...tabList.querySelectorAll<HTMLButtonElement>('.month-tab')]
      const index = buttons.indexOf (button)
      const next = event.key === 'ArrowRight' ? Math.min (index + 1, buttons.length - 1) : event.key === 'ArrowLeft' ? Math.max (index - 1, 0) : event.key === 'Home' ? 0 : buttons.length - 1
      if (next === index) return
      event.preventDefault ()
      const targetYear = Number (buttons[next].dataset.year)
      const targetMonth = Number (buttons[next].dataset.month)
      selectTimelineDate (targetYear, targetMonth)
      tabList.querySelector<HTMLButtonElement>(`[data-year="${targetYear}"][data-month="${targetMonth}"]`)?.focus ()
    })
    tabList.append (button)
  }
  const expand = $<HTMLButtonElement>('#timeline-expand')
  if (expand) expand.hidden = timelineMonths[timelineMonths.length - 1].year >= 2199
}

function populateWishYears (): void {
  if (!wishYearSelect) return
  const years = [...new Set ([pendingBirthdayYear, ...timelineMonths.map (item => item.year)])].sort ((a, b) => a - b)
  wishYearSelect.replaceChildren (...years.map (year => new Option (`${year} 年生日`, String (year))))
  wishYearSelect.value = String (pendingBirthdayYear)
}

function makeClassmateCard (student: Classmate): HTMLElement {
  const wishes = wishedCount (student.id)
  const card = el ('article', 'classmate-card')
  const top = el ('div', 'classmate-card-top')
  const avatar = el ('span', `person-avatar ${tones[Number(student.id.replace(/\D/g, '')) % tones.length] ?? tones[0]}`, student.name.slice (0, 1))
  avatar.setAttribute ('aria-hidden', 'true')
  appendStudentPhoto (avatar, student)
  const date = el ('time', 'birthday-date', formatMonthDay (student.monthDay))
  top.append (avatar, date)
  card.append (top, el ('h3', 'classmate-name', student.name))
  const oldWishes = legacyWishedCount (student.id)
  const count = el ('span', 'classmate-wish-count', wishes ? `已收到 ${wishes} 份祝福` : oldWishes ? `往年有 ${oldWishes} 份祝福，等今年第一份` : '等第一份生日祝福')
  card.append (count)
  const button = el ('button', 'card-wish-button', wishes ? '再写一张卡' : '送上第一份祝福')
  button.type = 'button'
  button.addEventListener ('click', () => openWishForm (student.id, selectedYear))
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
    .filter (wish => wish.birthdayYear === selectedYear && (filterId === 'all' || wish.recipientId === filterId))
    .sort ((a, b) => b.createdAt.localeCompare (a.createdAt))
  wishesGrid.replaceChildren ()
  renderWishCards (wishesGrid, filtered.slice (0, 12))
  emptyWishes.hidden = filtered.length > 0
  const legacyGrid = $<HTMLElement>('#legacy-wishes-grid')
  const legacySection = $<HTMLElement>('#legacy-wishes')
  const legacy = data.wishes.filter (wish => {
    const recipient = data.classmates.find (student => student.id === wish.recipientId)
    return !wish.birthdayYear && (filterId === 'all' || wish.recipientId === filterId)
  }).sort ((a, b) => b.createdAt.localeCompare (a.createdAt))
  if (legacyGrid && legacySection) {
    legacyGrid.replaceChildren ()
    renderWishCards (legacyGrid, legacy.slice (0, 6))
    legacySection.hidden = legacy.length === 0
  }
  emptyWishes.hidden = filtered.length > 0 || legacy.length > 0
}

function renderWishCards (grid: HTMLElement, wishes: BirthdayWish[]): void {
  for (const wish of wishes) {
    const recipient = data.classmates.find (student => student.id === wish.recipientId)
    if (!recipient) continue
    const card = el ('article', `wish-card ${wish.tone}`)
    const yearTag = el ('span', `wish-recipient${wish.birthdayYear ? '' : ' is-unassigned'}`, wish.birthdayYear ? `${wish.birthdayYear} 年生日 · TO  ${recipient.name}` : `年份未记录 · TO  ${recipient.name}`)
    card.append (yearTag)
    const recipientPhoto = el ('span', `wish-recipient-photo ${tones[Number(recipient.id.replace(/\D/g, '')) % tones.length] ?? tones[0]}`, recipient.name.slice (0, 1))
    appendStudentPhoto (recipientPhoto, recipient)
    card.append (recipientPhoto)
    const quote = el ('p', 'wish-message', wish.message)
    card.append (quote)
    const meta = el ('div', 'wish-meta')
    const avatar = el ('span', 'wish-avatar', wish.senderName.slice (0, 1))
    avatar.setAttribute ('aria-hidden', 'true')
    meta.append (avatar, el ('strong', '', wish.anonymous ? '匿名同学' : wish.senderName), el ('time', '', new Date (wish.createdAt).toLocaleDateString ('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })))
    card.append (meta, el ('span', 'wish-flower', ['✿', '✦', '❋', '✳'][Math.abs(wish.id.length + wish.message.length) % 4]))
    grid.append (card)
  }
}

function updateWishDateFromRecipient (): void {
  const student = data.classmates.find (item => item.id === recipientSelect?.value)
  if (!student) return
  if (student.monthDay.slice (0, 2) !== String (selectedMonth).padStart (2, '0')) {
    const nextDate = daysUntil (student.monthDay, currentDate ()).date
    selectTimelineDate (nextDate.getFullYear (), nextDate.getMonth () + 1)
  }
  pendingBirthdayYear = selectedYear
  populateWishYears ()
}

function appendStudentPhoto (avatar: HTMLElement, student: Classmate): void {
  if (!student.photoSource) return
  const image = el ('img', 'person-photo')
  image.src = student.photoSource
  image.alt = ''
  image.setAttribute ('aria-hidden', 'true')
  image.addEventListener ('error', () => image.remove (), { once: true })
  avatar.append (image)
}

function centerSelectedMonth (): void {
  const tabList = $<HTMLElement>('.month-tabs')
  const activeTab = $<HTMLElement>(`[data-year="${selectedYear}"][data-month="${selectedMonth}"]`)
  if (!tabList || !activeTab || tabList.scrollWidth <= tabList.clientWidth) return
  const tabBounds = activeTab.getBoundingClientRect ()
  const listBounds = tabList.getBoundingClientRect ()
  tabList.scrollLeft += tabBounds.left - listBounds.left - (listBounds.width - tabBounds.width) / 2
}

function renderAll (): void {
  renderHeroContent ()
  renderTimeline ()
  window.requestAnimationFrame (centerSelectedMonth)
  const count = $<HTMLElement>('#classmate-total')
  if (count) count.textContent = String (data.classmates.length)
  const wishesCount = $<HTMLElement>('#wish-total')
  if (wishesCount) wishesCount.textContent = String (data.wishes.length)
  renderToday ()
  renderMonth ()
  populateRecipientSelect ()
  populateWishFilter ()
  renderWishes ()
  populateWishYears ()
  const wishesPeriod = $<HTMLElement>('#wishes-period')
  if (wishesPeriod) wishesPeriod.textContent = `${selectedYear}年${selectedMonth}月的生日祝福`
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
    const photo = el ('span', `person-avatar roster-photo-avatar ${tones[Number(student.id.replace(/\D/g, '')) % tones.length] ?? tones[0]}`, student.name.slice (0, 1))
    appendStudentPhoto (photo, student)
    row.append (photo, el ('strong', '', student.name), el ('time', '', formatMonthDay (student.monthDay)))
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
      if (pendingStudentPhotoUrl) URL.revokeObjectURL (pendingStudentPhotoUrl)
      pendingStudentPhotoUrl = null
      pendingStudentPhoto = null
      removeStudentPhoto = false
      setStudentPhotoPreview (student.photoSource)
      if (studentPhotoRemove) studentPhotoRemove.hidden = !student.photoSource
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
        if (student.photoPath) await supabase.storage.from (classmatePhotoBucket).remove ([student.photoPath])
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
  renderWishAdmin ()
}

function renderWishAdmin (): void {
  if (!wishAdminList || !wishAdminStudent) return
  const current = wishAdminStudent.value || 'all'
  wishAdminStudent.replaceChildren (new Option ('全班寿星', 'all'))
  for (const student of [...data.classmates].sort ((a, b) => a.name.localeCompare (b.name, 'zh-CN'))) wishAdminStudent.add (new Option (student.name, student.id))
  wishAdminStudent.value = [...wishAdminStudent.options].some (option => option.value === current) ? current : 'all'
  const selected = wishAdminStudent.value
  const query = wishAdminSearch?.value.trim ().toLowerCase () ?? ''
  const wishes = data.wishes.filter (wish => {
    const recipient = data.classmates.find (student => student.id === wish.recipientId)
    const text = `${recipient?.name ?? ''} ${wish.senderName} ${wish.message}`.toLowerCase ()
    return (selected === 'all' || wish.recipientId === selected) && (!query || text.includes (query))
  }).sort ((a, b) => b.createdAt.localeCompare (a.createdAt))
  if (wishAdminCount) wishAdminCount.textContent = `${wishes.length} 份祝福`
  wishAdminList.replaceChildren ()
  for (const wish of wishes) {
    const recipient = data.classmates.find (student => student.id === wish.recipientId)
    const row = el ('div', 'wish-admin-row')
    const copy = el ('div', 'wish-admin-copy')
    copy.append (el ('strong', '', `${recipient?.name ?? '未知同学'} · ${wish.birthdayYear ? `${wish.birthdayYear}年` : '年份未记录'}`), el ('p', '', wish.message), el ('span', '', `${wish.anonymous ? '匿名同学' : wish.senderName} · ${new Date (wish.createdAt).toLocaleDateString ('zh-CN')}`))
    const remove = el ('button', 'row-delete-button', '删除')
    remove.type = 'button'
    remove.addEventListener ('click', () => { void deleteWishAsAdmin (wish.id) })
    row.append (copy, remove)
    wishAdminList.append (row)
  }
  if (wishAdminEmpty) wishAdminEmpty.hidden = wishes.length > 0
}

async function deleteWishAsAdmin (id: string): Promise<void> {
  if (!window.confirm ('确定删除这条祝福吗？删除后无法恢复。')) return
  if (supabase) {
    const { error } = await supabase.from ('wishes').delete ().eq ('id', id)
    if (error) { announce ('删除失败，请确认管理员权限。'); return }
    await refreshCloudState ()
  } else {
    data.wishes = data.wishes.filter (wish => wish.id !== id)
    persist ()
    renderAll ()
    renderRoster ()
  }
  announce ('祝福已删除。')
}

function resetStudentForm (): void {
  if (pendingStudentPhotoUrl) URL.revokeObjectURL (pendingStudentPhotoUrl)
  pendingStudentPhotoUrl = null
  pendingStudentPhoto = null
  removeStudentPhoto = false
  studentForm?.reset ()
  if (studentIdInput) studentIdInput.value = ''
  if (studentMonthInput) studentMonthInput.value = '01'
  updateDayOptions (1, 1)
  setStudentPhotoPreview ()
  if (studentPhotoRemove) studentPhotoRemove.hidden = true
  const save = $<HTMLElement>('#student-save')
  if (save) save.innerHTML = '添加到生日簿 <span aria-hidden="true">↗</span>'
  $<HTMLElement>('#student-cancel')?.setAttribute ('hidden', '')
}

function setStudentPhotoPreview (source?: string): void {
  if (!studentPhotoPreview) return
  studentPhotoPreview.replaceChildren ()
  if (!source) {
    studentPhotoPreview.append (el ('span', 'student-photo-empty', '尚未添加寿星照片'))
    return
  }
  const image = el ('img', 'student-photo-thumb')
  image.src = source
  image.alt = '寿星照片预览'
  image.addEventListener ('error', () => setStudentPhotoPreview (), { once: true })
  studentPhotoPreview.append (image)
}

function compressStudentPhoto (file: File): Promise<Blob> {
  return new Promise ((resolve, reject) => {
    const objectUrl = URL.createObjectURL (file)
    const image = new Image ()
    image.onload = () => {
      URL.revokeObjectURL (objectUrl)
      const scale = Math.min (1, 640 / Math.max (image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement ('canvas')
      canvas.width = Math.max (1, Math.round (image.naturalWidth * scale))
      canvas.height = Math.max (1, Math.round (image.naturalHeight * scale))
      const context = canvas.getContext ('2d')
      if (!context) return reject (new Error ('Photo could not be processed'))
      context.drawImage (image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob (blob => blob ? resolve (blob) : reject (new Error ('Photo could not be processed')), 'image/jpeg', 0.78)
    }
    image.onerror = () => {
      URL.revokeObjectURL (objectUrl)
      reject (new Error ('Photo could not be read'))
    }
    image.src = objectUrl
  })
}

async function saveCloudStudentPhoto (id: string, previousPath?: string): Promise<void> {
  if (!supabase) return
  if (pendingStudentPhoto) {
    const blob = await compressStudentPhoto (pendingStudentPhoto)
    const { data: { user } } = await supabase.auth.getUser ()
    if (!user) throw new Error ('管理员登录已失效，请重新登录。')
    const path = `${user.id}/${id}/${globalThis.crypto?.randomUUID?.() ?? Date.now ()}.jpg`
    const { error: uploadError } = await supabase.storage.from (classmatePhotoBucket).upload (path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
    if (uploadError) throw uploadError
    const { error: updateError } = await supabase.from ('classmates').update ({ photo_path: path }).eq ('id', id)
    if (updateError) {
      await supabase.storage.from (classmatePhotoBucket).remove ([path])
      throw updateError
    }
    if (previousPath) await supabase.storage.from (classmatePhotoBucket).remove ([previousPath])
  } else if (removeStudentPhoto) {
    const { error } = await supabase.from ('classmates').update ({ photo_path: null }).eq ('id', id)
    if (error) throw error
    if (previousPath) await supabase.storage.from (classmatePhotoBucket).remove ([previousPath])
  }
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
  $('#timeline-expand')?.addEventListener ('click', () => {
    const last = timelineMonths[timelineMonths.length - 1]
    timelineMonths.push (...Array.from ({ length: 12 }, (_, index) => addCalendarMonths (last, index + 1)))
    renderTimeline ()
  })

  wishFilter?.addEventListener ('change', renderWishes)
  recipientSelect?.addEventListener ('change', () => {
    updateWishDateFromRecipient ()
    if (formStatus) formStatus.textContent = ''
  })
  wishYearSelect?.addEventListener ('change', () => {
    pendingBirthdayYear = Number (wishYearSelect.value)
    if (formStatus) formStatus.textContent = ''
  })
  messageInput?.addEventListener ('input', () => {
    if (charCount) charCount.textContent = String (messageInput.value.length)
    if (formStatus) formStatus.textContent = ''
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

  $('#copy-month-list')?.addEventListener ('click', () => { void (async () => {
    const students = classmatesForMonth (selectedMonth)
    const grouped = new Map<string, string[]> ()
    for (const student of students) {
      const day = student.monthDay.slice (3)
      grouped.set (day, [...(grouped.get (day) ?? []), student.name])
    }
    const lines = [...grouped.entries ()]
      .sort(([a], [b]) => a.localeCompare (b))
      .map(([day, names]) => `${Number(day)}日：${names.join ('、')}`)
    const text = [`${selectedYear}年${selectedMonth}月生日墙提前开门啦 🎂`, ...lines, '', `来这里送祝福：${window.location.href.split ('#')[0]}`].join ('\n')
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText (text)
      } else {
        const field = el ('textarea')
        field.value = text
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.append (field)
        field.select ()
        const copied = document.execCommand ('copy')
        field.remove ()
        if (!copied) throw new Error ('Clipboard unavailable')
      }
      announce ('寿星清单已复制，可以发到班级群啦。')
    } catch {
      announce ('复制失败，请稍后再试。')
    }
  })() })

  wishForm?.addEventListener ('submit', event => { void (async () => {
    event.preventDefault ()
    if (!recipientSelect || !messageInput || !nicknameInput) return
    const submitButton = wishForm.querySelector<HTMLButtonElement>('[type="submit"]')
    if (submitButton?.disabled) return
    const student = data.classmates.find (item => item.id === recipientSelect.value)
    const message = messageInput.value.trim ()
    if (!student || !message) {
      if (formStatus) formStatus.textContent = '先选择一位寿星，再写下祝福内容。'
      return
    }
    const nickname = nicknameInput.value.trim ()
    const anonymous = !nickname
    const senderName = nickname || '匿名同学'
    let savedToYearArchive = true
    if (submitButton) {
      submitButton.disabled = true
      submitButton.textContent = '正在送出…'
    }
    if (formStatus) formStatus.textContent = '正在送出生日卡…'
    try {
    if (supabase) {
      const payload = {
        recipient_id: student.id,
        sender_name: senderName,
        message,
        anonymous,
        birthday_year: pendingBirthdayYear
      }
      let { error } = await supabase.from ('wishes').insert (payload)
      if (error && isMissingColumnError (error, 'birthday_year')) {
        birthdayYearSchemaReady = false
        savedToYearArchive = false
        updateSchemaNotice ()
        const retry = await supabase.from ('wishes').insert ({ recipient_id: student.id, sender_name: senderName, message, anonymous })
        error = retry.error
      }
      if (error) {
        if (formStatus) formStatus.textContent = '祝福暂时没有送出，请稍后重试。'
        announce ('祝福没有送出，请检查网络后重试。')
        return
      }
      const refreshed = await refreshCloudState ()
      if (!refreshed && !data.wishes.some (wish => wish.recipientId === student.id && wish.message === message && wish.senderName === senderName)) {
        data.wishes.unshift ({ id: globalThis.crypto?.randomUUID?.() ?? `w-${Date.now ()}`, recipientId: student.id, senderName, message, anonymous, createdAt: new Date ().toISOString (), tone: tones[data.wishes.length % tones.length], birthdayYear: pendingBirthdayYear })
      }
    } else {
      const wish: BirthdayWish = {
        id: globalThis.crypto?.randomUUID?.() ?? `w-${Date.now ()}`,
        recipientId: student.id,
        senderName,
        message,
        anonymous,
        createdAt: new Date ().toISOString (),
        tone: tones[data.wishes.length % tones.length],
        birthdayYear: pendingBirthdayYear
      }
      data.wishes.unshift (wish)
      persist ()
    }
    selectTimelineDate (pendingBirthdayYear, Number (student.monthDay.slice (0, 2)))
    renderAll ()
    if (recipientSelect) recipientSelect.value = student.id
    if (formStatus) formStatus.textContent = savedToYearArchive
      ? `送给 ${student.name} 的 ${pendingBirthdayYear} 年生日卡已经放进祝福墙。`
      : `祝福已送出。管理员运行数据库升级 SQL 后，新卡片才能按年份归档。`
    messageInput.value = ''
    if (charCount) charCount.textContent = '0'
    celebrate ()
    announce (`已成功送出给 ${student.name} 的生日祝福！`)
    } catch (error) {
      if (formStatus) formStatus.textContent = '发送结果暂时无法确认，请刷新祝福墙查看后再重试。'
      announce ('发送结果暂时无法确认，请先刷新页面核对，避免重复发送。')
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.innerHTML = '送出这张生日卡 <span aria-hidden="true">↗</span>'
      }
    }
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
  wishAdminStudent?.addEventListener ('change', renderWishAdmin)
  wishAdminSearch?.addEventListener ('input', renderWishAdmin)
  studentMonthInput?.addEventListener ('change', () => updateDayOptions (Number(studentMonthInput.value)))
  studentPhotoInput?.addEventListener ('change', () => {
    if (pendingStudentPhotoUrl) URL.revokeObjectURL (pendingStudentPhotoUrl)
    pendingStudentPhotoUrl = null
    pendingStudentPhoto = studentPhotoInput.files?.[0] ?? null
    removeStudentPhoto = false
    if (!pendingStudentPhoto) {
      const existing = data.classmates.find (student => student.id === studentIdInput?.value)
      setStudentPhotoPreview (existing?.photoSource)
      if (studentPhotoRemove) studentPhotoRemove.hidden = !existing?.photoSource
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes (pendingStudentPhoto.type) || pendingStudentPhoto.size > 2 * 1024 * 1024) {
      pendingStudentPhoto = null
      studentPhotoInput.value = ''
      setStudentPhotoPreview (data.classmates.find (student => student.id === studentIdInput?.value)?.photoSource)
      if (studentPhotoRemove) studentPhotoRemove.hidden = !data.classmates.find (student => student.id === studentIdInput?.value)?.photoSource
      announce ('请选择 JPG、PNG 或 WebP 图片，且文件不超过 2 MB。')
      return
    }
    pendingStudentPhotoUrl = URL.createObjectURL (pendingStudentPhoto)
    setStudentPhotoPreview (pendingStudentPhotoUrl)
    if (studentPhotoRemove) studentPhotoRemove.hidden = false
  })
  studentPhotoRemove?.addEventListener ('click', () => {
    if (pendingStudentPhotoUrl) URL.revokeObjectURL (pendingStudentPhotoUrl)
    pendingStudentPhotoUrl = null
    pendingStudentPhoto = null
    if (studentPhotoInput) studentPhotoInput.value = ''
    const existing = data.classmates.find (student => student.id === studentIdInput?.value)
    removeStudentPhoto = Boolean (existing?.photoPath || existing?.photoSource)
    setStudentPhotoPreview ()
    studentPhotoRemove.hidden = true
  })
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
    if (supabase && (pendingStudentPhoto || removeStudentPhoto) && !photoSchemaReady) {
      announce ('先在 Supabase 运行数据库升级 SQL，再保存寿星照片。管理员窗口里有 SQL 链接。')
      return
    }
    const monthDay = `${month}-${day}`
    const existingStudent = data.classmates.find (student => student.id === id)
    const saveButton = $<HTMLButtonElement>('#student-save')
    if (saveButton) saveButton.disabled = true
    if (supabase) {
      try {
        const result = id
          ? await supabase.from ('classmates').update ({ name, month_day: monthDay }).eq ('id', id).select ('id').single ()
          : await supabase.from ('classmates').insert ({ name, month_day: monthDay }).select ('id').single ()
        if (result.error || !result.data?.id) {
          announce (result.error?.code === '23505' ? '生日簿中已有相同的同学记录。' : '保存失败，请确认管理员账号仍有权限。')
          return
        }
        await saveCloudStudentPhoto (result.data.id, existingStudent?.photoPath)
        await refreshCloudState ()
        announce (pendingStudentPhoto ? `已保存 ${name} 的生日和照片。` : id ? `已更新 ${name} 的生日。` : `已把 ${name} 加入生日簿。`)
      } catch (error) {
        await refreshCloudState ()
        announce (error instanceof Error && error.message === '管理员登录已失效，请重新登录。'
          ? error.message
          : '生日资料已保存，但照片未能上传。请检查数据库升级和管理员权限后重试。')
        return
      } finally {
        if (saveButton) saveButton.disabled = false
      }
    } else {
      try {
        let photoSource = removeStudentPhoto ? undefined : existingStudent?.photoSource
        if (pendingStudentPhoto) photoSource = await readImageDataUrl (await compressStudentPhoto (pendingStudentPhoto))
        if (id) {
          data.classmates = data.classmates.map (student => student.id === id ? { ...student, name, monthDay, photoSource } : student)
          announce (pendingStudentPhoto ? `已更新 ${name} 的生日和照片。` : `已更新 ${name} 的生日。`)
        } else {
          data.classmates.push ({ id: globalThis.crypto?.randomUUID?.() ?? `m-${Date.now ()}`, name, monthDay, photoSource })
          announce (pendingStudentPhoto ? `已把 ${name} 和照片加入生日簿。` : `已把 ${name} 加入生日簿。`)
        }
        persist ()
      } catch {
        announce ('照片读取失败，请换一张 JPG、PNG 或 WebP 图片后重试。')
        return
      } finally {
        if (saveButton) saveButton.disabled = false
      }
    }
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
    resetTimelineFromDate (date)
    persist ()
    renderAll ()
    announce (`演示日期已切换到 ${localDate (date).toLocaleDateString ('zh-CN', { month: 'long', day: 'numeric' })}。`)
  })
  $('#reset-demo-date')?.addEventListener ('click', () => {
    data.demoDate = null
    resetTimelineFromDate (getLocalDateISO ())
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
