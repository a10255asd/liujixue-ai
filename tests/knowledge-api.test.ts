import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getInterviewQuestionDetailWithApi,
  getInterviewSetCollectionsWithApi,
  getKnowledgeDetailWithApi,
  getLearningPathCollectionsWithApi
} from '../lib/content/knowledge-api'

const originalFetch = globalThis.fetch

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ success: true, data, message: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
}

test('learning path collections hydrate list summaries with detail items', async (t) => {
  const calls: string[] = []

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    calls.push(url)

    if (url.includes('/collections?')) {
      return jsonResponse([
        {
          publicId: 'KCOL-test',
          siteCode: 'ai',
          slug: 'api-path',
          title: 'AI 应用工程入门路径',
          summary: '从服务器列表返回的路径摘要。',
          collectionType: 'learning_path',
          status: 'published',
          sortOrder: 10,
          items: []
        }
      ])
    }

    if (url.endsWith('/collections/api-path')) {
      return jsonResponse({
        publicId: 'KCOL-test',
        siteCode: 'ai',
        slug: 'api-path',
        title: 'AI 应用工程入门路径',
        summary: '从详情接口返回的路径摘要。',
        collectionType: 'learning_path',
        status: 'published',
        sortOrder: 10,
        items: [
          {
            itemPublicId: 'KNO-rag',
            sortOrder: 10,
            sectionTitle: 'RAG 基础',
            item: {
              publicId: 'KNO-rag',
              siteCode: 'ai',
              topicCode: 'rag',
              contentType: 'article',
              slug: 'rag-from-zero-to-one',
              title: 'RAG 从 0 到 1',
              summary: '用最小闭环理解 RAG。',
              bodyMarkdown: null,
              difficulty: 'beginner',
              status: 'published',
              tags: [],
              sources: [],
              questionDetail: null
            }
          },
          {
            itemPublicId: 'KNO-draft',
            sortOrder: 20,
            sectionTitle: '未发布内容',
            item: {
              publicId: 'KNO-draft',
              siteCode: 'ai',
              topicCode: 'agent',
              contentType: 'article',
              slug: 'draft-agent',
              title: '草稿 Agent',
              summary: '不应该出现在路径里。',
              bodyMarkdown: null,
              difficulty: 'beginner',
              status: 'draft',
              tags: [],
              sources: [],
              questionDetail: null
            }
          }
        ]
      })
    }

    return new Response(null, { status: 404 })
  }) as typeof fetch

  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const collections = await getLearningPathCollectionsWithApi()

  assert.equal(calls.length, 2)
  assert.deepEqual(collections.map((collection) => collection.slug), ['api-path'])
  assert.equal(collections[0].summary, '从详情接口返回的路径摘要。')
  assert.equal(collections[0].itemCount, 1)
  assert.deepEqual(collections[0].items[0], {
    slug: 'rag-from-zero-to-one',
    title: 'RAG 从 0 到 1',
    summary: '用最小闭环理解 RAG。',
    sectionTitle: 'RAG 基础',
    topicCode: 'rag',
    level: '入门',
    href: '/knowledge/rag-from-zero-to-one'
  })
})

test('interview set collections hydrate only published interview questions', async (t) => {
  const calls: string[] = []

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    calls.push(url)

    if (url.includes('/collections?')) {
      return jsonResponse([
        {
          publicId: 'KCOL-set',
          siteCode: 'ai',
          slug: 'rag-set',
          title: 'RAG 面试题组',
          summary: '从服务器列表返回的题组摘要。',
          collectionType: 'interview_set',
          status: 'published',
          sortOrder: 20,
          items: []
        }
      ])
    }

    if (url.endsWith('/collections/rag-set')) {
      return jsonResponse({
        publicId: 'KCOL-set',
        siteCode: 'ai',
        slug: 'rag-set',
        title: 'RAG 面试题组',
        summary: '从详情接口返回的题组摘要。',
        collectionType: 'interview_set',
        status: 'published',
        sortOrder: 20,
        items: [
          {
            itemPublicId: 'KNO-rag-question',
            sortOrder: 10,
            sectionTitle: 'Chunking 取舍',
            item: {
              publicId: 'KNO-rag-question',
              siteCode: 'ai',
              topicCode: 'rag',
              contentType: 'interview_question',
              slug: 'rag-chunking-tradeoffs',
              title: 'RAG chunking 怎么取舍？',
              summary: '考察 RAG 切块策略。',
              bodyMarkdown: null,
              difficulty: 'advanced',
              status: 'published',
              tags: [],
              sources: [],
              questionDetail: {
                questionText: 'RAG 里 chunk size 和 overlap 怎么权衡？',
                expectedAnswerMarkdown: '先看文档结构、召回质量和成本。',
                evaluationPoints: ['能说明召回和噪声的取舍'],
                followUpQuestions: [],
                roles: [],
                techTags: [],
                answerTimeMinutes: 3
              }
            }
          },
          {
            itemPublicId: 'KNO-article',
            sortOrder: 20,
            sectionTitle: '知识文章',
            item: {
              publicId: 'KNO-article',
              siteCode: 'ai',
              topicCode: 'rag',
              contentType: 'article',
              slug: 'rag-from-zero-to-one',
              title: 'RAG 从 0 到 1',
              summary: '不应该出现在题组里。',
              bodyMarkdown: null,
              difficulty: 'beginner',
              status: 'published',
              tags: [],
              sources: [],
              questionDetail: null
            }
          }
        ]
      })
    }

    return new Response(null, { status: 404 })
  }) as typeof fetch

  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const collections = await getInterviewSetCollectionsWithApi()

  assert.equal(calls.length, 2)
  assert.deepEqual(collections.map((collection) => collection.slug), ['rag-set'])
  assert.equal(collections[0].summary, '从详情接口返回的题组摘要。')
  assert.equal(collections[0].itemCount, 1)
  assert.deepEqual(collections[0].items[0], {
    slug: 'rag-chunking-tradeoffs',
    question: 'RAG 里 chunk size 和 overlap 怎么权衡？',
    title: 'RAG chunking 怎么取舍？',
    summary: '考察 RAG 切块策略。',
    sectionTitle: 'Chunking 取舍',
    topicCode: 'rag',
    level: '高级',
    href: '/interview/rag-chunking-tradeoffs'
  })
})

test('knowledge detail preserves API metadata for detail pages', async (t) => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (url.endsWith('/items/rag-from-zero-to-one')) {
      return jsonResponse({
        publicId: 'KNO-rag',
        siteCode: 'ai',
        topicCode: 'rag',
        contentType: 'article',
        slug: 'rag-from-zero-to-one',
        title: 'RAG 从 0 到 1',
        summary: '用最小闭环理解 RAG。',
        bodyMarkdown: '## RAG 是什么\n\n先检索，再生成。',
        difficulty: 'beginner',
        status: 'published',
        tags: ['rag', 'retrieval'],
        sources: [
          {
            sourceType: 'official-doc',
            title: '检索文档',
            url: 'https://example.com/rag',
            publisher: 'Example'
          }
        ],
        sourceCount: 1,
        viewCount: 7,
        safetyLevel: 'normal',
        disclaimerType: null,
        asOfDate: null,
        publishedAt: '2026-07-16T04:00:32Z',
        updatedAt: '2026-07-17T04:00:32Z',
        questionDetail: null
      })
    }

    return new Response(null, { status: 404 })
  }) as typeof fetch

  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const detail = await getKnowledgeDetailWithApi('rag-from-zero-to-one')

  assert.equal(detail?.slug, 'rag-from-zero-to-one')
  assert.equal(detail?.api?.publicId, 'KNO-rag')
  assert.deepEqual(detail?.api?.tags, ['rag', 'retrieval'])
  assert.equal(detail?.api?.sources[0].title, '检索文档')
  assert.equal(detail?.api?.updatedAt, '2026-07-17T04:00:32Z')
  assert.equal(detail?.api?.bodyMarkdown, '## RAG 是什么\n\n先检索，再生成。')
})

test('interview detail preserves question metadata for detail pages', async (t) => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (url.endsWith('/interview-questions/temperature-question')) {
      return jsonResponse({
        publicId: 'KNO-question',
        siteCode: 'ai',
        topicCode: 'llm-basics',
        contentType: 'interview_question',
        slug: 'temperature-question',
        title: 'temperature 和 top_p 的取舍',
        summary: '考察采样参数。',
        bodyMarkdown: '采样参数要结合场景调。',
        difficulty: 'beginner',
        status: 'published',
        tags: ['llm', 'sampling'],
        sources: [],
        sourceCount: 0,
        viewCount: 3,
        safetyLevel: 'normal',
        disclaimerType: null,
        asOfDate: null,
        publishedAt: '2026-07-16T04:00:32Z',
        updatedAt: '2026-07-17T04:00:32Z',
        questionDetail: {
          questionText: 'temperature 和 top_p 分别控制什么？',
          expectedAnswerMarkdown: 'temperature 控制随机性，top_p 控制候选概率质量。',
          evaluationPoints: ['能区分两个参数'],
          followUpQuestions: ['为什么不要同时大幅调整？'],
          roles: ['AI 应用工程师'],
          techTags: ['LLM', 'Sampling'],
          answerTimeMinutes: 6
        }
      })
    }

    return new Response(null, { status: 404 })
  }) as typeof fetch

  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const detail = await getInterviewQuestionDetailWithApi('temperature-question')

  assert.equal(detail?.id, 'temperature-question')
  assert.equal(detail?.question, 'temperature 和 top_p 分别控制什么？')
  assert.equal(detail?.api?.publicId, 'KNO-question')
  assert.equal(detail?.api?.questionDetail?.answerTimeMinutes, 6)
  assert.deepEqual(detail?.api?.questionDetail?.roles, ['AI 应用工程师'])
  assert.deepEqual(detail?.api?.questionDetail?.techTags, ['LLM', 'Sampling'])
  assert.deepEqual(detail?.api?.questionDetail?.followUpQuestions, ['为什么不要同时大幅调整？'])
})
