import type { FeatureExtractionPipeline } from '@huggingface/transformers'

import { ragVectorStore } from '@/lib/labs/rag-vectors'

/**
 * 浏览器端查询向量生成器。
 * - 动态 import transformers.js（WASM），只在用户切换到向量模式时才加载，不进 server bundle；
 * - 模型为 rag-vectors.json 记录的同一本地量化多语言模型（q8），约 130MB，首次加载后由浏览器缓存；
 * - numThreads = 1：避免 SharedArrayBuffer 对 COOP/COEP 响应头的部署要求；
 * - WASM 运行时文件由站点 /vendor/ort/ 自托管，模型文件走 HuggingFace 镜像 CDN。
 *
 * 这是教学原型的本地小模型，不是生产级 embedding 服务。
 */

export type ModelLoadProgress = {
  file: string
  percent: number
  loadedBytes: number
  totalBytes: number
}

type ProgressEvent = {
  status: string
  file?: string
  progress?: number
  loaded?: number
  total?: number
}

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null

export async function loadQueryEmbedder(onProgress?: (progress: ModelLoadProgress) => void) {
  if (typeof window === 'undefined') {
    throw new Error('查询向量只在浏览器端本地生成')
  }

  embedderPromise ??= (async () => {
    const { env, pipeline } = await import('@huggingface/transformers')
    // 小文件（config/tokenizer，约 16MB）随站点静态分发，走 env.localModelPath；
    // 大文件（q8 ONNX，约 113MB）本地缺失时自动回退 remoteHost，
    // 经站点同源 rewrite 代理（/rag-model/* → hf-mirror.com）下载——
    // huggingface.co 国内不可达，hf-mirror 的 CORS 又仅允许其自身源，同源代理绕过跨域限制。
    env.allowLocalModels = true
    env.localModelPath = '/models/rag-embedder/'
    env.remoteHost = '/rag-model/'
    // 关键：模型请求必须去掉 Referer。同源代理会把 Referer 透传给上游，
    // hf-mirror 的反盗链对带外站 Referer 的请求返回 HTML 警告页而不是模型文件。
    const baseFetch = env.fetch
    env.fetch = (input, init) => baseFetch(input, { ...init, referrerPolicy: 'no-referrer' })
    const wasm = env.backends.onnx.wasm
    if (wasm) {
      wasm.numThreads = 1
      wasm.wasmPaths = '/vendor/ort/'
    }

    return pipeline('feature-extraction', ragVectorStore.model, {
      dtype: ragVectorStore.dtype,
      progress_callback: (event: ProgressEvent) => {
        if (event.status === 'progress' && event.file && onProgress) {
          onProgress({
            file: event.file,
            percent: typeof event.progress === 'number' ? event.progress : 0,
            loadedBytes: event.loaded ?? 0,
            totalBytes: event.total ?? 0
          })
        }
      }
    })
  })()

  embedderPromise.catch(() => {
    // 失败后允许重试
    embedderPromise = null
  })

  return embedderPromise
}

export async function embedRagQuery(query: string, onProgress?: (progress: ModelLoadProgress) => void) {
  const extractor = await loadQueryEmbedder(onProgress)
  const output = await extractor(`${ragVectorStore.queryPrefix}${query}`, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

/** 首次加载需下载的模型文件体积（q8 量化模型 + tokenizer），用于 UI 明示。 */
export const RAG_VECTOR_MODEL_DOWNLOAD_HINT = '约 130MB'
