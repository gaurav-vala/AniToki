import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import { useState, useEffect } from 'react';

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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-2.5 md:p-6">
        {/* Header */}
        <header className="text-center flex items-center justify-between border-b py-3">
          <div>
            <p className="text-4xl font-black text-slate-800 dark:text-slate-200 mb-2">
              AniToki
            </p>
          </div>
        </header>
        <section className='py-5'>
          <p className="text-slate-600 dark:text-slate-400 text-center pb-5">
            {totalAnime} anime series airing this season
          </p>
          <h2 className="bg-black text-white px-4 py-2 border-4 border-black transform rotate-1 w-fit font-black">Today's Anime - {days[currentTime.getDay()]}</h2>

          <ul className='mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3'>
            {todayAnime.map((anime, index) => {
              const localTime = convertBroadcastToLocal(anime);

              return (
                <li key={`${index}-${anime.mal_id}`} className={`p-2 md:p-3.5 group relative border-4 border-black bg-white shadow-md transition-all duration-300 rounded-lg`}>
                  <div className="absolute -inset-1 bg-black transform rotate-2 -z-10"></div>
                  <div className='w-full h-auto rounded-lg overflow-hidden'>
                    <img
                      className='size-full object-cover'
                      src={anime.images.webp.large_image_url}
                      alt={anime.title}
                    />
                  </div>
                  <div className='flex-1 pt-2.5'>
                    <h3 className='font-bold md:text-xl leading-none'>{anime.title}</h3>
                    {localTime && (
                      <p className='text-sm text-gray-600 mt-1'>
                        {localTime.localDayName} at {localTime.localTime}
                      </p>
                    )}
                    {!localTime && (
                      <p className='text-sm text-gray-500 mt-1'>Time not available</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section className='py-7'>
          <h2 className="bg-black text-white px-4 py-2 border-4 border-black transform rotate-1 w-fit font-black">This Season's Anime</h2>
          <ul className='flex mt-5 space-x-2.5 overflow-x-scroll'>
            {animeList.map((anime, index) => (
              <li key={`${index}-${anime.episodes}`} className={`p-2 md:p-3.5 group relative border-4 border-black bg-white shadow-md transition-all duration-300 flex items-start gap-2.5 rounded-lg`}>
                <div className='w-[225px] h-[318px] rounded-lg overflow-hidden'>
                  <img className='size-full object-cover' src={`${anime.images.webp.image_url}`} alt="" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Schedule Grid */}

        <section>
          <h2 className="bg-black text-white px-4 py-2 border-4 border-black transform rotate-1 w-fit font-black">Weekly Schedule</h2>
          <div className="grid gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-2.5">

            {Object.entries(grouped).map(([day, animeArray], index) => (
              <div key={`${day}-${index}`}>
                <div className="pb-4">
                  <h2 className="bg-black text-white px-1 border-4 border-black transform rotate-1 w-fit font-black">
                    {day}
                  </h2>
                  <p className="text-center bg-gray-500 text-white my-2.5 transform -rotate-1">
                    {animeArray.length} series
                  </p>
                </div>
                <div className="space-y-4">
                  {animeArray.map((anime, index) => {
                    const localTime = convertBroadcastToLocal(anime);

                    return (
                      <div
                        key={`${anime.mal_id}-${index}`}
                        className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] p-3"
                      >
                        <div className="overflow-hidden">
                          <div className="">
                            {anime.episodes && (
                              <div className="text-xs opacity-90 mb-1">
                                {anime.episodes} episodes
                              </div>
                            )}

                            {/* JST Time */}
                            {anime.broadcast?.time && (
                              <div className="text-xs opacity-75 mb-1">
                                <span className="font-medium">JST:</span> {anime.broadcast.time}
                              </div>
                            )}

                            {/* Local Time */}
                            {localTime && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                <span className="font-medium">Local:</span> {localTime.localTime}
                                {localTime.localDayName !== day.slice(0, -1) && (
                                  <span className="ml-1 text-orange-600 dark:text-orange-400">
                                    ({localTime.localDayName})
                                  </span>
                                )}
                              </div>
                            )}

                            {!localTime && anime.broadcast?.time && (
                              <div className="text-xs text-gray-500">
                                Local time unavailable
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="">
                          <h3 className="font-medium text-sm line-clamp-2 text-slate-800 dark:text-slate-200">
                            {anime.title}
                          </h3>

                          {anime.genres && anime.genres.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {anime.genres.slice(0, 2).map((genre) => (
                                <span
                                  key={genre.name}
                                  className="inline-block px-2 py-1 text-xs text-white bg-black"
                                >
                                  {genre.name}
                                </span>
                              ))}
                              {anime.genres.length > 2 && (
                                <span className="inline-block px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                                  +{anime.genres.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>


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