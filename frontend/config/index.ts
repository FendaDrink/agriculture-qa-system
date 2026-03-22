import { defineConfig } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'
import path from 'path'

const baseConfig = defineConfig({
  projectName: 'agriculture-qa-miniapp',
  date: '2026-03-07',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false,
    },
  },
  cache: {
    enable: false,
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  plugins: ['@tarojs/plugin-framework-react', '@tarojs/plugin-platform-weapp'],
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
      },
      url: {
        enable: true,
        config: {
          limit: 1024,
        },
      },
      cssModules: {
        enable: false,
      },
    },
  },
})

export default defineConfig(async (merge) => {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
