import { getProblem } from '../../../lib/api';
import { notFound } from 'next/navigation';
import ProblemPageClient from './client';

interface PageProps {
  params: { slug: string };
}

export default async function ProblemPage({ params }: PageProps) {
  let problem;
  try {
    problem = await getProblem(params.slug);
  } catch {
    notFound();
  }

  return <ProblemPageClient problem={problem} />;
}
