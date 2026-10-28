import { App } from './App'

export function Page () {
  return (
    <html lang='zh-CN'>
      <head>
        <meta charSet='UTF-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='theme-color' content='#f5f7f4' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-title' content='温暖生日墙' />
        <title>25学硕大家庭 · 温暖生日祝福</title>
        <meta name='description' content='记住每一位同学的生日，把全班的温暖祝福送到 TA 手上。' />
        <link rel='manifest' href='./manifest.webmanifest' />
        <link rel='icon' type='image/png' sizes='192x192' href='./assets/pwa-icon-192.png' />
        <link rel='apple-touch-icon' href='./assets/pwa-icon-180.png' />
        <link rel='stylesheet' type='text/css' href='./index.css' />
        <script src='./app.js' defer />
      </head>
      <body>
        <App />
      </body>
    </html>
  )
}
