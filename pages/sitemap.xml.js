// pages/sitemap.xml.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import {
  buildSitemapLoc,
  normalizeSitemapBaseUrl,
  normalizeSitemapLocale,
  toSitemapDateString
} from '@/lib/sitemap-utils'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'
import { getServerSideSitemap } from 'next-sitemap'

export const getServerSideProps = async ctx => {
  let fields = []
  // 站点正式域名，从 Notion 数据里解析（BLOG.LINK 是上游默认值，不能直接用）
  let siteLink = ''
  const siteIds = BLOG.NOTION_PAGE_ID.split(',')

  for (let index = 0; index < siteIds.length; index++) {
    const siteId = siteIds[index]
    const id = extractLangId(siteId)
    const locale = extractLangPrefix(siteId)
    // 第一个id站点默认语言
    const siteData = await fetchGlobalAllData({
      pageId: id,
      from: 'sitemap.xml'
    })
    const link = siteConfig(
      'LINK',
      siteData?.siteInfo?.link,
      siteData.NOTION_CONFIG
    )
    if (!siteLink && link) {
      siteLink = link
    }
    const localeFields = generateLocalesSitemap(link, siteData.allPages, locale)
    fields = fields.concat(localeFields)
  }

  fields = getUniqueFields(fields)

  // VPS 推荐静态页：固定路径，不区分语言
  fields = fields.concat(generateVpsSitemap(siteLink))

  // 缓存
  ctx.res.setHeader(
    'Cache-Control',
    'public, max-age=3600, stale-while-revalidate=59'
  )
  return getServerSideSitemap(ctx, fields)
}

function generateLocalesSitemap(link, allPages, locale) {
  const normalizedLink = normalizeSitemapBaseUrl(link)
  const normalizedLocale = normalizeSitemapLocale(locale)
  const dateNow = toSitemapDateString(new Date())

  const defaultFields = [
    {
      loc: buildSitemapLoc({ baseUrl: normalizedLink, locale: normalizedLocale }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'archive'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'category'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'rss/feed.xml'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'search'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'tag'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    }
  ].filter(field => Boolean(field?.loc))

  const postFields =
    allPages
      ?.filter(p => p.status === BLOG.NOTION_PROPERTY_NAME.status_publish)
      // 过滤掉外部链接(http开头)和锚点链接(#开头)
      ?.filter(p => p.slug && !p.slug.startsWith('http') && !p.slug.startsWith('#'))
      ?.map(post => {
        const loc = buildSitemapLoc({
          baseUrl: normalizedLink,
          locale: normalizedLocale,
          slug: post?.slug
        })
        if (!loc) return null

        return {
          loc,
          lastmod: toSitemapDateString(post?.publishDay, dateNow),
          changefreq: 'daily',
          priority: '0.7'
        }
      })
      ?.filter(Boolean) ?? []

  return defaultFields.concat(postFields)
}

// VPS 推荐静态页（public/vps/<slug>/index.html），新增页面时在此补一行
const VPS_STATIC_PATHS = [
  '/vps',
  '/vps/racknerd',
  '/vps/dmit',
  '/vps/bytevirt',
  '/vps/rarecloud',
  '/vps/yunyoo',
  '/vps/bagevm'
]

function generateVpsSitemap(siteLink) {
  const baseUrl = normalizeSitemapBaseUrl(siteLink)
  if (!baseUrl) return []
  const dateNow = toSitemapDateString(new Date())
  return VPS_STATIC_PATHS.map(slug => ({
    loc: buildSitemapLoc({ baseUrl, slug }),
    lastmod: dateNow,
    changefreq: 'weekly',
    priority: '0.6'
  })).filter(field => field.loc)
}

function getUniqueFields(fields) {
  const uniqueFieldsMap = new Map()

  fields.forEach(field => {
    const existingField = uniqueFieldsMap.get(field.loc)

    if (!existingField || new Date(field.lastmod) > new Date(existingField.lastmod)) {
      uniqueFieldsMap.set(field.loc, field)
    }
  })

  return Array.from(uniqueFieldsMap.values())
}

export default () => { }
