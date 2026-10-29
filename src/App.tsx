import { getLocalDateISO } from './data'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Copy, Gift, PartyPopper, PenLine, Settings2, Sparkles, WandSparkles, X, Plus } from 'lucide-react'

const currentDate = getLocalDateISO ()
const currentMonth = Number(currentDate.slice (5, 7))

export function App () {
  return (
    <>
      <div className='home-arrival' id='home-arrival' role='region' aria-label='欢迎回家'>
        <div className='arrival-welcome'><span>25 学硕大家庭</span><strong>欢迎回家</strong></div>
        <div className='arrival-stage' aria-hidden='true'>
          <div className='arrival-house'>
            <div className='arrival-chimney'></div>
            <div className='arrival-roof'></div>
            <div className='arrival-wall'>
              <div className='arrival-attic-window'></div>
              <div className='arrival-window arrival-window-left'><i></i></div>
              <div className='arrival-window arrival-window-right'><i></i></div>
              <div className='arrival-doorway'><div className='arrival-door-light'></div><div className='arrival-door'><i></i></div></div>
            </div>
            <div className='arrival-steps'></div>
          </div>
          <div className='arrival-ground'></div>
        </div>
        <button className='arrival-enter' id='arrival-enter' type='button'>进入生日墙 <ArrowRight size={16} aria-hidden='true' /></button>
      </div>
      <header className='topbar'>
        <a className='brand' href='#top' aria-label='生日祝福墙首页'>
          <span className='brand-mark' aria-hidden='true'>25</span>
          <span className='brand-copy'><strong>25学硕大家庭</strong><small>温暖生日祝福</small></span>
        </a>
        <nav className='topnav' aria-label='主导航'>
          <a className='topnav-link' href='#today'>今日寿星</a>
          <a className='topnav-link' href='#calendar'>生日簿</a>
          <a className='topnav-action' href='#wish-form'>写祝福 <ArrowUpRight size={14} aria-hidden='true' /></a>
          <button className='admin-trigger' id='admin-open' type='button'><Settings2 size={14} aria-hidden='true' /> 管理员</button>
        </nav>
      </header>

      <main id='top'>
        <section className='hero' aria-labelledby='page-title'>
          <div className='hero-copy'>
            <p className='eyebrow'><span className='status-dot' /> 班级生日簿</p>
            <h1 id='page-title'>每个生日，<br />都有全班的祝福。</h1>
            <p className='hero-description' id='hero-description'>记住同学的生日，在那一天把心意送到 TA 手上。</p>
            <div className='hero-actions'>
              <a className='primary-link' href='#today'>看看今天为谁庆祝 <ArrowDown size={15} aria-hidden='true' /></a>
              <span className='hero-class-count'><strong id='classmate-total'>12</strong> 位同学 · <strong id='wish-total'>3</strong> 份心意</span>
            </div>
          </div>
          <div className='hero-visual'>
            <img id='hero-image' src='./assets/birthday-cake.jpg' alt='缀着彩色糖霜的生日蛋糕' />
            <div className='photo-label'><span>MAKE A WISH</span><span>✳</span></div>
            <span className='visual-note'>给今天<br />留个位置</span>
          </div>
          <span className='hero-spark spark-one' aria-hidden='true'>✳</span>
          <span className='hero-spark spark-two' aria-hidden='true'>✴</span>
        </section>

        <section className='today-section' id='today' aria-labelledby='today-title'>
          <div className='today-header'>
            <div>
              <span className='section-kicker'>TODAY AT OUR CLASS</span>
              <h2 id='today-title'>今天，一起为 TA 庆祝</h2>
            </div>
            <div className='today-date'><span className='date-icon' aria-hidden='true'><CalendarDays size={15} /></span><span id='today-date'>10月28日</span></div>
          </div>
          <div className='today-content' id='today-content' aria-live='polite'></div>
        </section>

        <section className='calendar-section' id='calendar' aria-labelledby='calendar-title'>
          <div className='section-heading'>
            <div><span className='section-kicker'>BIRTHDAY CALENDAR</span><h2 id='calendar-title'>班级生日簿</h2></div>
            <span className='month-hint'>按月份找寿星，给 TA 留一句话</span>
          </div>
          <div className='month-tabs' id='month-tabs' role='tablist' aria-label='按年份和月份排列的生日时间轴'></div>
          <button className='timeline-expand' id='timeline-expand' type='button'>继续看下一年 <ArrowRight size={14} aria-hidden='true' /></button>
          <div className='month-preview-note' id='month-preview-note' hidden>
            <span className='preview-seal' aria-hidden='true'>✦</span>
            <div className='preview-copy'><strong id='month-preview-title'></strong><span id='month-preview-description'></span></div>
            <button className='copy-month-list' id='copy-month-list' type='button'><Copy size={14} aria-hidden='true' />复制寿星清单</button>
          </div>
          <div className='calendar-caption'><strong id='month-label'>{currentMonth}月生日的同学</strong><span id='month-birthday-count'>0 位寿星</span></div>
          <div className='classmate-grid' id='classmate-grid' aria-live='polite'></div>
          <div className='empty-state' id='month-empty' hidden><span className='empty-mark' aria-hidden='true'>✳</span><strong>这个月暂时没有生日</strong><span>换个月份看看，或者请管理员补充生日。</span></div>
        </section>

        <section className='wishes-section' id='wishes' aria-labelledby='wishes-title'>
          <div className='wishes-heading'>
            <div><span className='section-kicker'>LITTLE NOTES, BIG SMILES</span><h2 id='wishes-title'>这一个月，收到的温暖</h2></div>
            <div className='wish-filters'>
              <label className='wish-filter-label' htmlFor='wish-filter'>
                <span>看谁收到的</span>
                <select id='wish-filter' aria-label='筛选收到祝福的同学'><option value='all'>全班同学</option></select>
              </label>
            </div>
          </div>
          <p className='wishes-period' id='wishes-period'>祝福按生日年份归档</p>
          <div className='wishes-grid' id='wishes-grid' aria-live='polite'></div>
          <button className='wishes-more' id='wishes-more' type='button' hidden>加载更多祝福</button>
          <div className='legacy-wishes' id='legacy-wishes' hidden><strong>早期祝福 · 尚未归档年份</strong><div className='wishes-grid' id='legacy-wishes-grid'></div><button className='wishes-more' id='legacy-wishes-more' type='button' hidden>加载更多早期祝福</button></div>
          <div className='empty-wishes' id='empty-wishes' hidden>还没有收到祝福，选一位寿星送上第一张卡片吧。</div>
        </section>

        <section className='write-section' id='write' aria-labelledby='write-title'>
          <div className='write-intro'>
            <span className='section-kicker'>A NOTE JUST FOR YOU</span>
            <h2 id='write-title'>把喜欢的话，<br />送给今天的主角。</h2>
            <p>点选寿星卡片，或者在这里选一位同学，再留下一份小小心意。</p>
            <span className='write-illustration' aria-hidden='true'>✳</span>
          </div>
          <form className='write-panel' id='wish-form'>
            <div className='write-panel-heading'><span className='write-icon' aria-hidden='true'><PenLine size={15} /></span><strong>写一张生日卡片</strong></div>
            <label className='field-label' htmlFor='recipient'>送给谁 <span>必选</span></label>
            <select className='text-input' id='recipient' name='recipient' required><option value=''>先选一位同学</option></select>
            <label className='field-label wish-year-label' htmlFor='wish-birthday-year'>哪一年的生日</label>
            <select className='text-input' id='wish-birthday-year' name='birthday-year' required></select>
            <label className='field-label' htmlFor='nickname'>你的称呼 <span>选填，留空匿名</span></label>
            <input className='text-input' id='nickname' name='nickname' maxLength={18} placeholder='留下昵称署名，或留空匿名送出' autoComplete='nickname' />
            <label className='field-label message-label' htmlFor='message'>祝福内容 <span>必填</span></label>
            <div className='message-tools' aria-label='添加祝福点子'>
              <button type='button' className='phrase-button' data-phrase='愿你每天都开开心心！'>天天开心 <Sparkles size={11} aria-hidden='true' /></button>
              <button type='button' className='phrase-button' data-phrase='愿你的愿望都实现，零食永远吃不胖！'>愿望实现 <Gift size={11} aria-hidden='true' /></button>
              <button type='button' className='phrase-button' id='random-wish'>帮我想一句 <WandSparkles size={11} aria-hidden='true' /></button>
            </div>
            <textarea id='message' name='message' maxLength={140} required placeholder='写下专属 TA 的生日祝福…'></textarea>
            <div className='form-footnote'><span>最多 140 字</span><span><b id='char-count'>0</b> / 140</span></div>
            <button className='submit-button' type='submit'>送出这张生日卡 <ArrowUpRight size={16} aria-hidden='true' /></button>
            <p className='form-status' id='form-status' role='status' aria-live='polite'></p>
            <div className='privacy-note'><span aria-hidden='true'>✳</span> 只展示你愿意分享的内容</div>
          </form>
        </section>
      </main>

      <footer className='footer'><span>记住每一个日期，珍惜每一份心意。</span><span>25学硕大家庭 <b>·</b> 温暖生日祝福</span></footer>

      <dialog className='admin-dialog' id='admin-dialog' aria-labelledby='admin-title'>
        <div className='dialog-head'><div><span className='section-kicker'>CLASS ADMIN</span><h2 id='admin-title'>管理员入口</h2></div><button className='dialog-close' id='admin-close' type='button' aria-label='关闭管理员窗口'><X size={17} /></button></div>
        <section id='admin-auth'>
          <p className='admin-intro' id='admin-auth-copy'>使用获准的管理员邮箱登录后可管理班级生日簿。</p>
          <form id='admin-login-form'>
            <label className='field-label' htmlFor='admin-email'>管理员邮箱</label>
            <input className='text-input' id='admin-email' type='email' required autoComplete='username' placeholder='name@example.com' />
            <label className='field-label admin-password-label' htmlFor='admin-password'>管理员密码</label>
            <input className='text-input' id='admin-password' type='password' minLength={8} maxLength={128} required autoComplete='current-password' placeholder='输入管理员密码' />
            <p className='admin-error' id='admin-auth-error' role='alert'></p>
            <button className='submit-button' id='admin-login-submit' type='submit'>登录管理员 <span aria-hidden='true'>↗</span></button>
          </form>
          <p className='local-only-note'>仅经管理员授权的邮箱可以编辑生日簿。</p>
        </section>
        <section id='admin-tools' hidden>
          <div className='admin-notice'><span aria-hidden='true'>✳</span> 管理生日名单 · <strong id='admin-student-count'>12</strong> 位同学</div>
          <div className='admin-schema-note' id='admin-schema-note' hidden>照片和跨年祝福归档需要更新一次数据库。<a href='https://github.com/Hcl-tcl/25-xueshu-birthday-wall/blob/main/supabase/migrations/20261029_birthday_timeline_and_photos.sql' target='_blank' rel='noreferrer'>打开升级 SQL</a></div>
          <section className='hero-editor'>
            <div className='roster-heading'><strong>横幅内容</strong><span>全班可见</span></div>
            <form id='hero-form'>
              <label className='field-label' htmlFor='hero-title-input'>主标题</label>
              <textarea className='text-input hero-editor-title' id='hero-title-input' rows={2} maxLength={80} required />
              <label className='field-label' htmlFor='hero-description-input'>说明文字</label>
              <textarea className='text-input hero-editor-description' id='hero-description-input' rows={2} maxLength={160} required />
              <label className='field-label' htmlFor='hero-image-input'>横幅图片</label>
              <input className='text-input hero-image-input' id='hero-image-input' type='file' accept='image/jpeg,image/png,image/webp' />
              <p className='hero-image-help'>JPG、PNG 或 WebP，最大 2 MB。</p>
              <img className='hero-image-preview' id='hero-image-preview' src='./assets/birthday-cake.jpg' alt='横幅图片预览' />
              <p className='admin-error' id='hero-form-error' role='alert'></p>
              <p className='hero-form-status' id='hero-form-status' role='status'></p>
              <button className='submit-button' type='submit' id='hero-save'>保存横幅设置 <ArrowUpRight size={15} aria-hidden='true' /></button>
            </form>
          </section>
          <form className='student-form' id='student-form'>
            <input type='hidden' id='student-id' />
            <label className='field-label' htmlFor='student-name'>同学姓名</label>
            <input className='text-input' id='student-name' maxLength={18} required placeholder='输入同学姓名' />
            <span className='field-label birthday-label'>生日日期</span>
            <div className='date-fields'><label className='accessibly-hidden' htmlFor='student-month'>月份</label><select className='text-input' id='student-month' required></select><label className='accessibly-hidden' htmlFor='student-day'>日期</label><select className='text-input' id='student-day' required></select></div>
            <label className='field-label student-photo-label' htmlFor='student-photo'>寿星照片 <span>选填，照片会公开显示</span></label>
            <div className='student-photo-tools'><div className='student-photo-preview' id='student-photo-preview' aria-live='polite'></div><button type='button' className='remove-student-photo' id='student-photo-remove' hidden>移除照片</button></div>
            <input className='text-input student-photo-input' id='student-photo' type='file' accept='image/jpeg,image/png,image/webp' />
            <p className='student-photo-help'>JPG、PNG 或 WebP，最大 2 MB。请先征得同学同意。</p>
            <div className='admin-form-actions'><button type='submit' className='submit-button' id='student-save'><Plus size={15} aria-hidden='true' /> 添加到生日簿 <ArrowUpRight size={15} aria-hidden='true' /></button><button type='button' className='cancel-edit' id='student-cancel' hidden>取消编辑</button></div>
          </form>
          <div className='roster-heading'><strong>班级名单</strong><span id='roster-count'>12 位同学</span></div>
          <div className='roster-list' id='roster-list'></div>
          <section className='wish-admin-section' aria-labelledby='wish-admin-title'>
            <div className='roster-heading'><strong id='wish-admin-title'>祝福管理</strong><span id='wish-admin-count'>0 份祝福</span></div>
            <div className='wish-admin-filters'>
              <label className='accessibly-hidden' htmlFor='wish-admin-student'>筛选寿星</label><select className='text-input' id='wish-admin-student'><option value='all'>全班寿星</option></select>
              <label className='accessibly-hidden' htmlFor='wish-admin-search'>搜索祝福</label><input className='text-input' id='wish-admin-search' type='search' placeholder='搜索祝福内容或署名' />
            </div>
            <div className='wish-admin-bulk'><label><input id='wish-admin-select-all' type='checkbox' /> 选择当前结果</label><button className='row-delete-button' id='wish-admin-delete-selected' type='button' disabled>批量删除所选</button></div>
            <div className='wish-admin-list' id='wish-admin-list'></div>
            <p className='admin-error' id='wish-admin-empty' hidden>没有找到符合条件的祝福。</p>
          </section>
          <div className='demo-date-panel'>
            <div><strong>生日当天演示</strong><span>临时选择一个日期，预览寿星当天页面。</span></div>
            <label className='accessibly-hidden' htmlFor='demo-date'>演示日期</label>
            <div className='demo-date-controls'><input className='text-input' id='demo-date' type='date' /><button type='button' className='apply-date' id='apply-demo-date'>应用日期</button><button type='button' className='reset-date' id='reset-demo-date'>今天</button></div>
          </div>
          <button className='logout-button' type='button' id='admin-logout'>退出管理员</button>
        </section>
      </dialog>
      <div className='toast' id='toast' role='status' aria-live='polite'></div>
      <canvas id='celebration-canvas' aria-hidden='true'></canvas>
    </>
  )
}
