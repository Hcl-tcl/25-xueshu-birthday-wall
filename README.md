# 25学硕大家庭 · 温暖生日祝福

一个供全班共同使用的生日祝福墙：全班同学可以查看生日、在生日当天送出署名或匿名祝福；管理员维护生日名单，也可以编辑首页横幅标题、说明和图片。新增祝福或修改横幅后，页面会实时同步。

页面标题为“25学硕大家庭 · 温暖生日祝福”。首次接入时需按 [Supabase 设置指南](./SUPABASE_SETUP.md) 创建共享数据库并填入配置。未配置 Supabase 时，网站保留本地演示数据，浏览器之间不会同步。

## 本地运行

```sh
npm install
npm run dev
```

打开终端显示的本地地址（默认 `http://localhost:8080/`）。运行 `npm run typecheck` 执行 TypeScript 检查。

管理员登录后可以编辑横幅内容、维护同学名单，并用“生日当天演示”切换本地预览日期。云端编辑保存在 Supabase，未配置 Supabase 时保存在当前浏览器。只有 `admin_emails` 白名单中的账号可以编辑名单和横幅。

`npm run build` 会生成可部署的静态文件到 `public/`。云端构建需设置环境变量 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`；生产发布流程会要求两项配置齐全。

数据库表、权限策略和实时订阅由 [supabase/schema.sql](./supabase/schema.sql) 建立。

## 开源来源

页面结构改自 [SheepTester/guestbook](https://github.com/SheepTester/guestbook)，原项目采用 MIT License，原许可证保留在 [LICENSE](./LICENSE)。

礼花动画使用 [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti)，ISC License。

界面图标使用 [lucide-icons/lucide](https://github.com/lucide-icons/lucide) 的 React 图标包，ISC License。

生日蛋糕图片来自 [Unsplash 图片 CDN](https://images.unsplash.com/photo-1464349095431-e9a21285b5f3)。
