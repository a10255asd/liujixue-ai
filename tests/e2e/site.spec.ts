import { expect, test } from '@playwright/test'

const routes = [
  '/',
  '/roadmap',
  '/knowledge',
  '/agent',
  '/interview',
  '/projects',
  '/resources',
  '/journal'
]

for (const route of routes) {
  test(`${route} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(route)
    await expect(page.locator('main h1')).toBeVisible()
    const sizes = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth
    }))
    expect(sizes.document).toBeLessThanOrEqual(sizes.viewport)
  })
}

test('mobile navigation exposes the site matrix portals', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only navigation check')
  await page.goto('/')
  await page.getByRole('button', { name: '打开导航' }).click()
  await expect(page.getByRole('link', { name: '个人主站' })).toBeVisible()
  await expect(page.getByRole('link', { name: '开发博客' })).toBeVisible()
})

test('interview filters are shareable through the URL', async ({ page }) => {
  await page.goto('/interview')
  await page.getByLabel('分类').selectOption('mcp')
  await expect(page).toHaveURL(/category=mcp/)
  await expect(page.locator('.content-card')).toHaveCount(8)

  await page.getByLabel('难度').selectOption('高级')
  await expect(page).toHaveURL(/level=%E9%AB%98%E7%BA%A7/)
  await expect(page.locator('.content-card')).toHaveCount(3)

  await page.reload()
  await expect(page.getByLabel('分类')).toHaveValue('mcp')
  await expect(page.getByLabel('难度')).toHaveValue('高级')
})
