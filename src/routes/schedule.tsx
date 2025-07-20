import { createFileRoute, useLoaderData } from '@tanstack/react-router'

export const Route = createFileRoute('/schedule')({
  component: RouteComponent,
  loader: async () => {
    const res = await fetch("https://api.jikan.moe/v4/seasons/now");
    const data = await res.json();
    return data.data;
  }
})

function groupByDay(animeList: any[]) {
  return animeList.reduce((acc: Record<string, any[]>, anime) => {
    const day = anime.broadcast?.day ?? "Unknown";
    acc[day] = [...(acc[day] || []), anime];
    return acc;
  }, {});
}

function RouteComponent() {
  const animeList = useLoaderData({ from: Route.id });
  const grouped = groupByDay(animeList);

  return (
    <></>
  );
}
