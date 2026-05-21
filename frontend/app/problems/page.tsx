import { getProblems, Problem } from '../../lib/api';
import ProblemsClient from './client';

export default async function ProblemsPage() {
  let problems: Problem[] = [];
  try {
    problems = await getProblems();
  } catch {
    // backend offline — client handles empty state
  }
  return <ProblemsClient initialProblems={problems} />;
}
