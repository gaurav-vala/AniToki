import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel";
import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import Autoplay from 'embla-carousel-autoplay';
import { useEffect, useState } from 'react';
import ThemeToggle from '@/components/ui/theme-toggle';


export const Route = createFileRoute('/')({
  component: Index,
  loader: async () => {
    const res = await fetch("https://api.jikan.moe/v4/seasons/now");
    const data = await res.json();
    return data.data;
  }
})

interface Anime {
  mal_id: number;
  title: string;
  title_english: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
    webp: {
      image_url: string;
      large_image_url: string;
    };
  };
  broadcast?: {
    day?: string;
    time?: string;
  };
  score?: number;
  episodes?: number;
  status?: string;
  genres?: Array<{ name: string }>;
}

function groupByDay(animeList: Anime[]) {
  const dayOrder = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays', 'Unknown'];

  const grouped = animeList.reduce((acc: Record<string, Anime[]>, anime) => {
    const day = anime.broadcast?.day ?? "Unknown";
    acc[day] = [...(acc[day] || []), anime];
    return acc;
  }, {});

  // Sort anime within each day by title
  Object.keys(grouped).forEach(day => {
    grouped[day].sort((a, b) => a.title.localeCompare(b.title));
  });

  // Return sorted by day order
  const sortedGrouped: Record<string, Anime[]> = {};
  dayOrder.forEach(day => {
    if (grouped[day]) {
      sortedGrouped[day] = grouped[day];
    }
  });

  return sortedGrouped;
}

function Index() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const animeList = useLoaderData({ from: Route.id }) as Anime[];
  const grouped = groupByDay(animeList);
  const days = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"]

  const uniqueAnimeList = Array.from(
    new Map(animeList.map(anime => [anime.mal_id, anime])).values()
  );

  const totalAnime = animeList.length;
  const todayAnime = animeList.filter((anime) => {
    return anime.broadcast?.day === days[currentTime.getDay()]
  })

  function convertBroadcastToLocal(anime: Anime) {
    if (!anime.broadcast?.day || !anime.broadcast?.time) {
      return null;
    }

    // Map day names to day numbers (0 = Sunday)
    const dayMap: { [key: string]: number } = {
      'Sundays': 0, 'Mondays': 1, 'Tuesdays': 2, 'Wednesdays': 3,
      'Thursdays': 4, 'Fridays': 5, 'Saturdays': 6
    };

    const dayNumber = dayMap[anime.broadcast.day];
    if (dayNumber === undefined) return null;

    // Parse the time (format: "HH:MM")
    const [hours, minutes] = anime.broadcast.time.split(':').map(Number);

    // Create a date for this week's broadcast day in JST
    const now = new Date();
    const currentDay = now.getDay();
    const daysUntilBroadcast = (dayNumber - currentDay + 7) % 7;

    // Create the broadcast date in JST
    const broadcastDate = new Date(now);
    broadcastDate.setDate(now.getDate() + daysUntilBroadcast);
    broadcastDate.setHours(hours, minutes, 0, 0);

    // Convert JST to local time
    // JST is UTC+9, so we subtract 9 hours to get UTC, then let JS handle local conversion
    const jstOffset = 9 * 60; // JST is UTC+9 (in minutes)
    const localOffset = broadcastDate.getTimezoneOffset(); // Local offset from UTC (in minutes)
    const totalOffsetMinutes = jstOffset + localOffset;

    const localBroadcastTime = new Date(broadcastDate.getTime() - (totalOffsetMinutes * 60 * 1000));

    return {
      localDate: localBroadcastTime,
      localDayName: localBroadcastTime.toLocaleDateString('en-US', { weekday: 'long' }),
      localTime: localBroadcastTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      localDateTimeString: localBroadcastTime.toLocaleString(),
      originalJST: {
        day: anime.broadcast.day,
        time: anime.broadcast.time
      }
    };
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-800">
      <div className="container mx-auto p-2.5 md:p-6">
        {/* Header */}
        <header className="text-center flex items-center justify-between border-b py-3">
          <div>
            <p className="text-4xl font-black text-slate-800 dark:text-slate-200 mb-2">
              AniToki
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <section className='py-5'>
          <p className="text-slate-600 dark:text-slate-400 text-center pb-5">
            <span className="font-semibold">{totalAnime} anime</span> series airing this season
          </p>
          <h2 className="bg-black text-white px-4 py-2 border-4 border-black transform rotate-1 w-fit font-black">Today's Anime - {days[currentTime.getDay()]}</h2>
          <Carousel className='pt-2.5' opts={{
            align: "start",
            loop: true,
          }} plugins={[
            Autoplay({
              delay: 2500,
            }),
          ]}>
            <CarouselContent>
              {todayAnime.map((anime, index) => {
                const localTime = convertBroadcastToLocal(anime);

                return (
                  <CarouselItem
                    key={index}
                    className="basis-full md:basis-1/4" // Mobile: 1 slide, Desktop: 2 slides
                  >
                    <div className="p-4 border rounded-xl border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                      <div className='w-full h-[550px] rounded-lg overflow-hidden'>
                        <img
                          className='size-full object-cover object-top'
                          src={anime.images.webp.large_image_url}
                          alt={anime.title_english}
                        />
                      </div>
                      <div className='pt-2.5'>
                        <h3 className='text-2xl font-semibold tracking-tighter leading-none dark:text-neutral-200'>{anime.title_english}</h3>
                        <div className='pt-1.5'>
                          {localTime && (
                            <p>{localTime.localDayName} at {localTime.localTime}</p>
                          )}
                          {!localTime && (
                            <p>Time not available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </section>
        <section className='py-7'>
          <h2 className="bg-black text-white px-4 py-2 border-4 border-black transform rotate-1 w-fit font-black">This Season's Anime</h2>
          <ul className='flex mt-5 space-x-2.5 overflow-x-scroll'>
            {uniqueAnimeList.map((anime, index) => (
              <li key={`${index}-${anime.episodes}`} className={`group relative bg-white shadow-md transition-all duration-300 flex items-start gap-2.5 rounded-lg`}>
                <h2 className="bg-black text-white p-0.5 border-4 border-black absolute top-2.5 w-fit text-xs mx-2.5 text-left">{anime.title_english}</h2>
                <div className='w-[225px] h-[318px] rounded-lg overflow-hidden'>
                  <img className='size-full object-cover' src={`${anime.images.webp.large_image_url}`} alt="" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-center space-x-2 mb-6">
            <h2 className="bg-black text-white px-4 py-2 border-4 border-black transform rotate-1 w-fit font-black">Weekly Schedule</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {Object.entries(grouped).map(([day, episodes]) => (
              <Card key={day} className="h-fit shadow-none gap-2.5">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-200 flex items-center justify-between">
                    {day}
                    <Badge variant="outline">{episodes.length} series</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {episodes.map((episode, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-rose-200 pl-3 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{episode.broadcast?.time}
                        </span>
                        {
                          episode.episodes !== null && episode.episodes !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              EP {episode.episodes}
                            </Badge>
                          )
                        }
                      </div>
                      <h4 className="font-medium text-sm text-gray-900 mb-1 dark:text-neutral-200">{episode.title_english}</h4>
                      {/* <div className="flex flex-wrap gap-1">
                        {episode.genres.map((genre) => (
                          <Badge key={genre} variant="secondary" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div> */}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Schedule Grid */}
        {/* Empty state */}
        {
          Object.keys(grouped).length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📺</div>
              <h2 className="text-2xl font-bold text-slate-600 dark:text-slate-400 mb-2">
                No anime found
              </h2>
              <p className="text-slate-500 dark:text-slate-500">
                There might be an issue loading the current season data.
              </p>
            </div>
          )
        }
      </div>
      <footer className='py-9'>
        <p className='text-center'>
          Made by me <a className='underline' href="https://www.hokoriotaku.space/">Hokori Otaku</a>
        </p>
      </footer>
    </main>
  )
}