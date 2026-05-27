export async function GET() {
  const token = process.env.MY_VERCEL_TOKEN;
  if (!token) {
    return Response.json(
      { error: 'MY_VERCEL_TOKEN environment variable is not set.' },
      { status: 500 }
    );
  }

  try {
    let allProjects = [];
    let url = 'https://api.vercel.com/v9/projects?limit=100';

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = await res.json();
        return Response.json({ error: err.error?.message || 'Vercel API error' }, { status: res.status });
      }
      const data = await res.json();
      allProjects = allProjects.concat(data.projects || []);
      if (data.pagination?.next) {
        url = `https://api.vercel.com/v9/projects?limit=100&until=${data.pagination.next}`;
      } else {
        url = null;
      }
    }

    const projects = allProjects
      .filter((p) => {
        const state = p.targets?.production?.readyState;
        return state === 'READY';
      })
      .map((p) => {
        const aliases = p.targets?.production?.alias || [];
        const automaticAliases = p.targets?.production?.automaticAliases || [];

        // Stable short alias: in alias[] but NOT in automaticAliases[]
        const stableAlias = aliases.find((a) => !automaticAliases.includes(a));
        const displayUrl = stableAlias || aliases[0] || null;

        return {
          id: p.id,
          name: p.name,
          framework: p.framework || null,
          updatedAt: p.updatedAt,
          displayUrl,
        };
      });

    return Response.json({ projects });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
