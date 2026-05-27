import { redirect } from 'next/navigation';

export async function GET(request) {
  const token = process.env.MY_VERCEL_TOKEN;
  if (!token) return Response.json({ error: 'no token' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('id');
  if (!projectId) return Response.json({ error: 'id required' }, { status: 400 });

  // Fetch the project to get its aliases
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) return Response.json({ error: 'project not found' }, { status: 404 });

  const p = await res.json();

  // Get aliases from targets.production.alias
  const aliases = p.targets?.production?.alias || [];
  const automaticAliases = p.targets?.production?.automaticAliases || [];

  // Prefer the stable short alias (in alias[] but NOT in automaticAliases[])
  const stableAlias = aliases.find((a) => !automaticAliases.includes(a));
  const fallback = aliases[0];
  const url = stableAlias || fallback;

  if (!url) return Response.json({ error: 'no URL found' }, { status: 404 });

  return redirect(`https://${url}`);
}
