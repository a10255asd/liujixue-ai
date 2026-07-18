import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { getLabRelatedKnowledge, getLabRelatedQuestions, type LabSlug } from '@/lib/content/lab-relations'

export function LabRelatedContent({ lab }: { lab: LabSlug }) {
  const knowledge = getLabRelatedKnowledge(lab)
  const questions = getLabRelatedQuestions(lab)
  if (knowledge.length === 0 && questions.length === 0) return null

  return (
    <section className="lab-related">
      <div className="lab-related__column">
        <span>相关知识点</span>
        {knowledge.length
          ? knowledge.map((item) => (
            <Link href={`/knowledge/${item.slug}`} key={item.slug}>{item.title}<ArrowRight size={14} /></Link>
          ))
          : <p>关联知识点待补充</p>}
      </div>
      <div className="lab-related__column">
        <span>相关面试题</span>
        {questions.length
          ? questions.map((question) => (
            <Link href={`/interview/${question.id}`} key={question.id}>{question.question}<ArrowRight size={14} /></Link>
          ))
          : <p>关联面试题待补充</p>}
      </div>
    </section>
  )
}
