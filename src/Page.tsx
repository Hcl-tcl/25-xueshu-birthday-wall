import { App } from './App'

export function Page () {
  return (
    <html lang='zh-CN'>
      <head>
        <meta charSet='UTF-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='theme-color' content='#f5f7f4' />
        <title>25学硕大家庭 · 温暖生日祝福</title>
        <meta name='description' content='记住每一位同学的生日，把全班的温暖祝福送到 TA 手上。' />
        <link rel='stylesheet' type='text/css' href='./index.css' />
        <script src='./app.js' defer />
      </head>
      <body>
        <App />
      </body>
    </html>
  )
}
