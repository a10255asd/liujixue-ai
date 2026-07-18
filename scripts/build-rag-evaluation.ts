import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  diffEvaluationSnapshot,
  getRagPrototypeData,
  ragEvaluationSnapshotSchema,
  type RagEvaluationSnapshot
} from '../lib/labs/rag-retrieval'

/**
 * 固化三路（关键词 / 混合 / 向量）检索评估对比到 content/labs/rag-evaluation-report.json，
 * 并在终端打印对比表。向量模式的查询向量来自 rag-vectors.json 的构建期固化向量，
 * 因此本脚本完全离线、可复现；向量重建后由 build-rag-vectors.ts 自动调用。
 */

const OUTPUT_PATH = join(process.cwd(), 'content/labs/rag-evaluation-report.json')

export function buildEvaluationSnapshot(): RagEvaluationSnapshot {
  const data = getRagPrototypeData()
  return ragEvaluationSnapshotSchema.parse({
    generatedAt: new Date().toISOString(),
    model: data.vectorModel.model,
    dimensions: data.vectorModel.dimensions,
    caseCount: data.evaluationCases.length,
    reports: data.reports.map((report) => ({
      mode: report.mode,
      label: report.label,
      hitAt3: report.hitAt3,
      mrr: report.mrr,
      citationCoverage: report.citationCoverage,
      unknownRejectionRate: report.unknownRejectionRate
    }))
  })
}

export async function writeRagEvaluationSnapshot() {
  const snapshot = buildEvaluationSnapshot()
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`)

  const { reports } = getRagPrototypeData()
  const drift = diffEvaluationSnapshot(snapshot, reports)
  if (drift.length) {
    throw new Error(`评估快照与实时计算不一致：\n${drift.join('\n')}`)
  }

  console.log(`已写入 ${OUTPUT_PATH}`)
  printComparisonTable(snapshot)
}

function printComparisonTable(snapshot: RagEvaluationSnapshot) {
  const metrics = [
    ['Hit@3', 'hitAt3'],
    ['MRR', 'mrr'],
    ['引用覆盖', 'citationCoverage'],
    ['未知问题拒答', 'unknownRejectionRate']
  ] as const

  const labels = snapshot.reports.map((report) => report.label)
  console.log(`\n三路检索评估对比（${snapshot.caseCount} 条固定评估题，向量模型 ${snapshot.model} · ${snapshot.dimensions} 维）`)
  console.log(`指标\t\t${labels.join('\t\t')}`)
  for (const [label, key] of metrics) {
    console.log(`${label}\t\t${snapshot.reports.map((report) => report[key].toFixed(3)).join('\t\t')}`)
  }
}

if (process.argv[1]?.endsWith('build-rag-evaluation.ts')) {
  await writeRagEvaluationSnapshot()
}
