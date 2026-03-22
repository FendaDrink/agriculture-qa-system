export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/chat/index',
    'pages/faq/index',
    'pages/profile/index',
    'pages/login/index',
    'pages/sessions/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0f5b3b',
    navigationBarTitleText: '农业智能问答助手',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f3f8f3',
  },
  tabBar: {
    color: '#73877b',
    selectedColor: '#0f6a43',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
      },
      {
        pagePath: 'pages/chat/index',
        text: '聊天',
      },
      {
        pagePath: 'pages/faq/index',
        text: '常见问答',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
})
