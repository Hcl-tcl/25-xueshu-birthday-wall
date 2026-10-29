# Supabase 设置指南

下面操作只需要做一次。项目由你自己的 Supabase 账号持有。

## 1. 创建项目

1. 打开 [Supabase](https://supabase.com/dashboard)，注册或登录。
2. 点 **New project**，新建一个组织（如有提示），项目名称可填 `25-xueshu-birthday-wall`。
3. 选择离你较近的区域，设置一个数据库密码并保存好，等待项目创建完成。
4. 在项目 **Project Settings → API** 页面找到 **Project URL** 和 **anon / publishable key**。后者是可放在浏览器使用的公开客户端密钥；不要复制 `service_role` 或 Secret key。

## 2. 建立共享数据表

1. 打开项目左侧 **SQL Editor**，点 **New query**。
2. 在本项目打开 `supabase/schema.sql`，完整复制到 SQL Editor，执行一次。
3. 该脚本会创建同学、按生日年份归档的祝福、管理员邮箱和首页设置表；同时建立公开读取、仅管理员可上传的横幅和寿星照片存储桶，并配置行级权限和实时更新。

## 已建数据库升级

如果你的项目之前运行过旧版 `schema.sql`，请另外运行一次 `supabase/migrations/20261029_birthday_timeline_and_photos.sql`。在 SQL Editor 点 **New query**，粘贴这个文件的全部内容后点 **Run**。它会增加照片字段和生日年份归档，并设置照片桶权限；之前的祝福会保留并显示在“年份未记录”的单独区域。

上传的同学照片会公开显示给所有访问网页的人。请先征得本人同意；网页上传后会缩小并压缩图片。

## 3. 创建管理员账号

1. 在 Supabase 打开 **Authentication → Users → Add user**，填写管理员邮箱和强密码，并确认创建。
2. 回到 **SQL Editor** 执行下面语句，把邮箱替换成刚创建的管理员邮箱（保留单引号）：

```sql
insert into public.admin_emails (email)
values (lower('你的管理员邮箱'))
on conflict (email) do nothing;
```

只有这里列出的管理员邮箱可以新增、修改和移除生日名单，也可以编辑首页横幅。管理员登录网站后，打开“管理员”即可修改标题、说明和横幅图片。全班同学无需登录即可浏览和投稿。

## 4. 发给我三项公开客户端配置

请从 **Project Settings → API** 复制并发来：

- Project URL
- anon / publishable key（`sb_publishable_...` 或旧版 `anon` JWT）
- 管理员邮箱

这些配置用于连接公开网站；绝不要发送数据库密码、`service_role` 或 Secret key。拿到配置后，我会把它们设为 GitHub Actions 部署密钥，再创建公开仓库并发布全班版。

## 本地检查

要在本机预览云端模式，可在启动开发服务器前设置环境变量 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`。未设置时会显示独立的本地演示数据，且管理员登录仅用于本机预览。
