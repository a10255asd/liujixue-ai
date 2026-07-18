/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // transformers.js / onnxruntime 只在浏览器端动态加载（RAG 实验向量模式），
  // 不进入任何 server bundle；这里仅阻止 nft 文件追踪把它们复制进 serverless 产物。
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@huggingface/transformers/**/*',
      'node_modules/onnxruntime-node/**/*',
      'node_modules/onnxruntime-web/**/*'
    ]
  },
  // RAG 向量模式的 q8 ONNX 模型文件（约 113MB）经同源代理转发到 hf-mirror：
  // huggingface.co 在国内不可达，而 hf-mirror 的 CORS 仅允许其自身源。
  // config/tokenizer 等小文件已随站点静态分发（public/models/rag-embedder/）。
  async rewrites() {
    return [{ source: '/rag-model/:path*', destination: 'https://hf-mirror.com/:path*' }]
  },
  experimental: {
    // 上游镜像/CDN 在国内只有约 1MB/s，113MB 模型需要两分钟以上；
    // 默认 30s 的代理超时会把响应截断成损坏的 protobuf。
    proxyTimeout: 600_000
  }
}

export default nextConfig
