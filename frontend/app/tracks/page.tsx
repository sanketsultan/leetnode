import { getProblems, Problem } from '../../lib/api';
import { TRACKS } from '../../lib/tracks';
import TracksClient from './client';

export default async function TracksPage() {
  let problems: Problem[] = [];
  try { problems = await getProblems(); } catch {}
  return <TracksClient problems={problems} />;
}
