import { NotionAPI } from 'notion-client'

/**
 * Notion 站点前置了 Cloudflare，会拦截 got 的默认 User-Agent，
 * 返回 403（Attention Required! | Cloudflare），导致构建时拉不到 Notion 数据。
 * 这里统一使用浏览器 UA 发起请求。
 */
export const NOTION_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const withUA = gotOptions => ({
  ...gotOptions,
  headers: {
    'user-agent': NOTION_USER_AGENT,
    ...((gotOptions && gotOptions.headers) || {})
  }
})

/**
 * 创建带浏览器 UA 的 NotionAPI 实例。
 * 各方法签名不同，这里逐个包一层，保证所有请求都带上 UA。
 * @param {object} options 透传给 NotionAPI 的构造参数
 */
export function createNotionAPI(options = {}) {
  const api = new NotionAPI(options)

  const getPage = api.getPage.bind(api)
  api.getPage = (pageId, opts = {}) =>
    getPage(pageId, { ...opts, gotOptions: withUA(opts.gotOptions) })

  const getPageRaw = api.getPageRaw.bind(api)
  api.getPageRaw = (pageId, opts = {}) =>
    getPageRaw(pageId, { ...opts, gotOptions: withUA(opts.gotOptions) })

  const getCollectionData = api.getCollectionData.bind(api)
  api.getCollectionData = (
    collectionId,
    collectionViewId,
    collectionView,
    opts = {}
  ) =>
    getCollectionData(collectionId, collectionViewId, collectionView, {
      ...opts,
      gotOptions: withUA(opts.gotOptions)
    })

  const getUsers = api.getUsers.bind(api)
  api.getUsers = (userIds, gotOptions) => getUsers(userIds, withUA(gotOptions))

  const getBlocks = api.getBlocks.bind(api)
  api.getBlocks = (blockIds, gotOptions) =>
    getBlocks(blockIds, withUA(gotOptions))

  return api
}
