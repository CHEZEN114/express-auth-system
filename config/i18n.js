/**
 * i18n 国际化配置
 */
const i18n = require('i18n');
const path = require('path');

i18n.configure({
  // 设置语言文件目录
  locales: ['zh', 'en'],
  // 默认语言
  defaultLocale: 'zh',
  // 语言文件存放路径
  directory: path.join(__dirname, '../locales'),
  // 从查询参数、cookie 或 session 中获取语言设置
  queryParameter: 'lang',
  // Cookie 名称
  cookie: 'lang',
  // 是否同步写入文件
  updateFiles: false,
  // 对象表示法
  objectNotation: true,
  // 注册模板助手
  register: global
});

module.exports = i18n;
