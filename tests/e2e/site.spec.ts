import { expect, test } from '@playwright/test'

const routes = [
  '/',
  '/tracks',
  '/roadmap',
  '/knowledge',
  '/knowledge/rag-from-zero-to-one',
  '/agent',
  '/career',
  '/career/calibration',
  '/interview',
  '/interview/llm-temperature-top-p-tradeoffs',
  '/projects',
  '/labs/prompt-regression',
  '/labs/rag-retrieval',
  '/labs/controlled-agent',
  '/labs/agent-evaluation',
  '/labs/mcp-tools',
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

test('server-backed detail pages expose content and question evidence', async ({ page }) => {
  await page.goto('/knowledge/rag-from-zero-to-one')
  await expect(page.getByText('内容档案', { exact: true })).toBeVisible()
  await expect(page.getByText('内容 ID', { exact: true })).toBeVisible()
  await expect(page.getByText('参考来源', { exact: true })).toBeVisible()

  await page.goto('/interview/llm-temperature-top-p-tradeoffs')
  await expect(page.getByRole('heading', { name: '题目背景' })).toBeVisible()
  await expect(page.getByText('题目档案', { exact: true })).toBeVisible()
  await expect(page.getByText('面试官可能追问', { exact: true })).toBeVisible()
})

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
  await expect(page.locator('.content-card')).toHaveCount(12)

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

test('career calibration maps real JD evidence and scores a fixed interview', async ({ page }) => {
  await page.goto('/career/calibration')
  await expect(page.getByTestId('jd-coverage-score')).toHaveText('70/100')
  await expect(page.getByTestId('mock-interview-score')).toHaveText('0%')

  await page.getByTestId('jd-source-select').selectOption('planera-senior-agent-engineer')
  await expect(page.getByTestId('jd-coverage-score')).toHaveText('64/100')
  await expect(page.locator('.jd-source-brief h3')).toHaveText('Planera · Senior AI Agent Engineer')

  await page.locator('.mock-question input[type="checkbox"]').first().check()
  await expect(page.getByTestId('mock-interview-score')).toHaveText('5%')
  await expect(page.getByTestId('mock-weakest')).not.toContainText('完成本轮后生成')
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

test('project catalog separates runnable evidence from blueprints', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.locator('.delivery-badge--prototype')).toHaveCount(4)
  await expect(page.locator('.delivery-badge--blueprint')).toHaveCount(2)

  await page.goto('/projects/prompt-debugger')
  await expect(page.getByRole('link', { name: /运行原型/ })).toBeVisible()
  await expect(page.getByText('固定响应夹具')).toBeVisible()

  await page.goto('/projects/mcp-file-assistant')
  await expect(page.getByText('尚无可执行命令')).toBeVisible()
  await expect(page.getByRole('link', { name: /运行原型/ })).toHaveCount(0)
})

test('prompt regression prototype compares deterministic fixture reports', async ({ page }) => {
  await page.goto('/labs/prompt-regression')
  await expect(page.getByTestId('business-pass-rate')).toHaveText('25%')
  await expect(page.locator('.prompt-case')).toHaveCount(4)

  await page.getByRole('tab', { name: /V2 契约化指令/ }).click()
  await expect(page.getByTestId('business-pass-rate')).toHaveText('100%')
  await expect(page.locator('.prompt-case .fail')).toHaveCount(0)
})

test('RAG prototype returns stable citations and rejects unsupported questions', async ({ page }) => {
  await page.goto('/labs/rag-retrieval')
  await expect(page.getByTestId('rag-eval-mrr')).toHaveText('1.000')
  await expect(page.getByTestId('rag-citation')).toHaveCount(2)

  await page.getByTestId('rag-query').fill('个人专业版每个月具体多少钱？')
  await page.getByRole('button', { name: '检索并生成引用答案' }).click()
  await expect(page.getByTestId('rag-answer')).toContainText('没有足够证据')
  await expect(page.getByTestId('rag-citation')).toHaveCount(0)

  await page.getByTestId('rag-query').fill('接口返回 429 时应该怎样重试？')
  await page.getByRole('button', { name: '检索并生成引用答案' }).click()
  await expect(page.getByTestId('rag-answer')).toContainText('指数退避')
  await expect(page.getByTestId('rag-citation')).toHaveCount(2)
})

test('controlled Agent prototype enforces budget and human approval gates', async ({ page }) => {
  await page.goto('/labs/controlled-agent')
  await expect(page.getByTestId('runtime-mode')).toContainText('服务端安全模式')
  await page.getByRole('button', { name: '开始受控运行' }).click()
  await expect(page.getByTestId('runtime-status')).toContainText('运行完成')
  await expect(page.getByTestId('runtime-provider')).toContainText('SERVER FIXTURE')
  await expect(page.getByTestId('runtime-observation')).toHaveCount(2)
  await expect(page.getByTestId('runtime-summary')).toContainText('受控任务执行 Agent')
  await expect(page.getByTestId('runtime-summary')).toContainText('prototype')
  await expect(page.getByTestId('runtime-persistence')).toContainText(/临时回放|本次响应|Redis/)

  await page.getByRole('button', { name: '查找 Agent 工具权限知识，并保存成学习笔记' }).click()
  await page.getByRole('button', { name: '开始受控运行' }).click()
  await expect(page.getByTestId('runtime-status')).toContainText('等待审批')
  await expect(page.getByTestId('runtime-approval')).toContainText('notes:write')
  await expect(page.getByTestId('runtime-observation')).toHaveCount(1)
  await page.getByRole('button', { name: '批准写入' }).click()
  await expect(page.getByTestId('runtime-status')).toContainText('运行完成')
  await expect(page.getByTestId('runtime-observation')).toHaveCount(2)
  await expect(page.getByTestId('runtime-summary')).toContainText('已保存学习笔记')

  await expect(page.getByTestId('agent-state')).toContainText('已完成')

  await page.getByRole('tab', { name: /步数预算终止/ }).click()
  await expect(page.getByTestId('agent-state')).toContainText('预算终止')
  await expect(page.getByTestId('agent-trace')).toContainText('步数预算耗尽')

  await page.getByRole('tab', { name: /高风险人工审批/ }).click()
  await expect(page.getByTestId('agent-state')).toContainText('等待审批')
  await expect(page.getByTestId('agent-side-effects')).toHaveText('0')

  await page.getByRole('button', { name: '批准一次执行' }).click()
  await expect(page.getByTestId('agent-state')).toContainText('已完成')
  await expect(page.getByTestId('agent-side-effects')).toHaveText('1')
})

test('Agent evaluation gate blocks regressions and passes the controlled version', async ({ page }) => {
  await page.goto('/labs/agent-evaluation')
  await expect(page.getByTestId('eval-release-status')).toContainText('阻止发布')
  await expect(page.getByTestId('eval-overall-score')).toHaveText('56/100')
  await expect(page.getByTestId('eval-regression-row')).toHaveCount(4)

  await page.getByRole('tab', { name: /V2 受控状态机/ }).click()
  await expect(page.getByTestId('eval-release-status')).toContainText('允许进入发布流程')
  await expect(page.getByTestId('eval-overall-score')).toHaveText('100/100')
  await expect(page.getByTestId('eval-regression-row')).toHaveCount(0)
})

test('MCP lab completes a real protocol session with visible JSON-RPC messages', async ({ page }) => {
  await page.goto('/labs/mcp-tools')
  await expect(page.getByTestId('mcp-transport')).toContainText('JSON-RPC 2.0')
  await page.getByTestId('mcp-run').click()
  await expect(page.getByTestId('mcp-message')).toHaveCount(8)
  await expect(page.getByTestId('mcp-trace')).toContainText('notifications/initialized')
  await expect(page.getByTestId('mcp-trace')).toContainText('tools/list')
  await expect(page.getByTestId('mcp-tool-result')).toContainText('isError: false')

  await page.getByRole('button', { name: /inspect_project_evidence/ }).click()
  await page.getByTestId('mcp-run').click()
  await expect(page.getByTestId('mcp-message')).toHaveCount(8)
  await expect(page.getByTestId('mcp-tool-result')).toContainText('受控任务执行 Agent')
})
