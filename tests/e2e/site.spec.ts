import { expect, test } from '@playwright/test'

const routes = [
  '/',
  '/tracks',
  '/roadmap',
  '/knowledge',
  '/agent',
  '/career',
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

test('career assessment recommends the first unfinished week', async ({ page }) => {
  await page.goto('/career')
  await expect(page.getByTestId('assessment-score')).toHaveText('0')

  await page.getByRole('checkbox', { name: '我能独立完成一次服务端模型调用，并正确管理密钥。' }).check()
  await expect(page.getByTestId('assessment-score')).toHaveText('8')
  await expect(page.getByTestId('assessment-next')).toContainText('建议从第 1 周开始')
})

test('training workspace restores selected track and local progress', async ({ page }) => {
  await page.goto('/tracks#production-rag')
  await expect(page.getByRole('tab', { name: /生产级 RAG/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('track-progress')).toHaveText('0')

  await page.locator('.track-task input[type="checkbox"]').first().check()
  await expect(page.getByTestId('track-progress')).toHaveText('50')

  await page.reload()
  await expect(page.getByTestId('track-progress')).toHaveText('50')
})
