import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface AiringSchedule {
  airingAt: number;
  episode: number;
  media: {
    id: number;
    title: {
      romaji: string;
      english: string;
    };
    coverImage: {
      large: string;
      extraLarge: string;
    };
    genres: string[];
    episodes: number;
    status: string;
    nextAiringEpisode: {
      airingAt: number;
      episode: number;
    } | null;
  };
}

export const Route = createFileRoute('/schedule')({
  component: RouteComponent,
  loader: async () => {
    const query = `
      query {
        Page(perPage: 50) {
          airingSchedules(notYetAired: true, sort: TIME) {
            airingAt
            episode
            media {
              id
              title {
                romaji
                english
              }
              coverImage {
                large
                extraLarge
              }
              genres
              episodes
              status
              nextAiringEpisode {
                airingAt
                episode
              }
            }
          }
        }
      }
    `;

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query
      })
    });

    const { data } = await res.json();
    return data.Page.airingSchedules;
  }
})

function RouteComponent() {
  const schedules = useLoaderData({ from: Route.id }) as AiringSchedule[]
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  function groupByDay(schedules: AiringSchedule[]) {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Unknown'];

    const grouped = schedules.reduce((acc: Record<string, AiringSchedule[]>, schedule) => {
      const date = new Date(schedule.airingAt * 1000);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = [...(acc[day] || []), schedule];
      return acc;
    }, {});

    // Sort anime within each day by airing time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.airingAt - b.airingAt);
    });

    // Return sorted by day order
    const sortedGrouped: Record<string, AiringSchedule[]> = {};
    dayOrder.forEach(day => {
      if (grouped[day]) {
        sortedGrouped[day] = grouped[day];
      }
    });

    return sortedGrouped;
  }

  const grouped = groupByDay(schedules);
  const uniqueAnimeList = Array.from(
    new Map(schedules.map(schedule => [schedule.media.id, schedule])).values()
  );

  function formatDate(timestamp: number) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-2.5 md:p-6">
        <header className="text-center flex items-center justify-between border-b py-3">
          <div>
            <p className="text-4xl font-black text-slate-800 dark:text-slate-200 mb-2">
              Upcoming Schedule
            </p>
          </div>
        </header>

        <section className='py-5'>
          <p className="text-slate-600 dark:text-slate-400 text-center pb-5">
            {schedules.length} upcoming anime episodes
          </p>
          <div className='flex gap-2.5 overflow-x-scroll pb-4'>
            {uniqueAnimeList.map((schedule) => (
              <div key={schedule.media.id} className="relative min-w-[225px]">
                <div className='w-[225px] h-[318px] rounded-lg overflow-hidden'>
                  <img
                    className='size-full object-cover'
                    src={schedule.media.coverImage.extraLarge}
                    alt={schedule.media.title.english || schedule.media.title.romaji}
                  />
                </div>
                <h2 className="bg-black text-white p-0.5 border-4 border-black absolute top-2.5 w-fit text-xs mx-2.5 text-left">
                  {schedule.media.title.english || schedule.media.title.romaji}
                </h2>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center space-x-2 mb-6">
            <h2 className="bg-black text-white px-4 py-2 border-4 border-black transform rotate-1 w-fit font-black">
              Airing Schedule
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {Object.entries(grouped).map(([day, episodes]) => (
              <Card key={day} className="h-fit shadow-none gap-2.5">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                    {day}
                    <Badge variant="outline">{episodes.length} episodes</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {episodes.map((episode, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-rose-200 pl-3 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {formatDate(episode.airingAt)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          EP {episode.episode}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm text-gray-900 mb-1">
                        {episode.media.title.english || episode.media.title.romaji}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {episode.media.genres.map((genre) => (
                          <Badge key={genre} variant="secondary" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

