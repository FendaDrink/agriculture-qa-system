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
  permission: {
    'scope.record': {
      desc: '用于语音输入并转换为文字',
    },
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
        iconPath: 'assets/images/center.png',
        selectedIconPath: 'assets/images/center_active.png',
      },
      {
        pagePath: 'pages/chat/index',
        text: '聊天',
        iconPath: 'assets/images/qa.png',
        selectedIconPath: 'assets/images/qa_active.png',
      },
      {
        pagePath: 'pages/faq/index',
        text: '常见问答',
        iconPath: 'assets/images/message.png',
        selectedIconPath: 'assets/images/message_active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/images/mine.png',
        selectedIconPath: 'assets/images/mine_active.png',
      },
    ],
  },
})
