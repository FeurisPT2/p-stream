import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import classNames from "classnames";
import { Link } from "react-router-dom";
import { useDiscoverOptions } from "@/pages/discover/hooks/useDiscoverMedia";
import { Icon, Icons } from "@/components/Icon";

export function GenreChips() {
  const { genres, isLoading } = useDiscoverOptions("movie");
  const [expanded, setExpanded] = useState(false);
  const [parentRef] = useAutoAnimate<HTMLDivElement>();

  if (isLoading || genres.length === 0) return null;

  // Display top 5 genres by default
  const displayGenres = expanded ? genres : genres.slice(0, 5);
  const hasMore = genres.length > 5;

  const getGenreIcon = (name: string): Icons => {
    const normalized = name.toLowerCase();
    if (normalized.includes("action")) return Icons.GENRE_ACTION;
    if (normalized.includes("adventure")) return Icons.GENRE_ADVENTURE;
    if (normalized.includes("animation")) return Icons.GENRE_ANIMATION;
    if (normalized.includes("comedy")) return Icons.GENRE_COMEDY;
    if (normalized.includes("crime")) return Icons.GENRE_CRIME;
    if (normalized.includes("documentary")) return Icons.GENRE_DOCUMENTARY;
    if (normalized.includes("drama")) return Icons.GENRE_DRAMA;
    if (normalized.includes("family")) return Icons.GENRE_FAMILY;
    if (normalized.includes("fantasy")) return Icons.GENRE_FANTASY;
    if (normalized.includes("history")) return Icons.GENRE_HISTORY;
    if (normalized.includes("horror")) return Icons.GENRE_HORROR;
    if (normalized.includes("music")) return Icons.GENRE_MUSIC;
    if (normalized.includes("mystery")) return Icons.GENRE_MYSTERY;
    if (normalized.includes("romance")) return Icons.GENRE_ROMANCE;
    if (normalized.includes("sci-fi") || normalized.includes("science")) return Icons.GENRE_SCIFI;
    if (normalized.includes("thriller")) return Icons.GENRE_THRILLER;
    if (normalized.includes("war")) return Icons.GENRE_WAR;
    if (normalized.includes("western")) return Icons.GENRE_WESTERN;
    return Icons.FILM;
  };

  return (
    <div className={classNames(
      "w-full transition-all duration-300",
      !expanded && "overflow-x-auto scrollbar-hide py-2 -my-2"
    )}>
      <div 
        ref={parentRef}
        className={classNames(
          "flex gap-2 mt-3 px-2 opacity-0 animate-fade-in mx-auto",
          expanded ? "flex-wrap justify-center" : "w-max min-w-full justify-center sm:justify-center"
        )}
        style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
      >
      {displayGenres.map((genre) => (
        <Link
          key={genre.id}
          to={`/discover/more/genre/${genre.id}/movie`}
          className={classNames(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap shrink-0",
            "bg-search-background/40 backdrop-blur-md hover:bg-search-hoverBackground/80",
            "text-type-secondary hover:text-white border border-white/5 hover:border-white/15 select-none",
            "transition-all duration-300 ease-out",
            "hover:-translate-y-0.5 active:translate-y-0 active:scale-95 hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
          )}
        >
          <Icon icon={getGenreIcon(genre.name)} className="text-[14px] opacity-70" />
          {genre.name}
        </Link>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={classNames(
            "flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap shrink-0",
            "bg-search-background/60 backdrop-blur-md hover:bg-search-hoverBackground",
            "text-type-secondary hover:text-white border border-white/40 hover:border-white/60",
            "transition-all duration-300 ease-out",
            "hover:-translate-y-0.5 active:translate-y-0 active:scale-95 hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)] select-none"
          )}
        >
          {expanded ? (
            <Icon icon={Icons.CHEVRON_LEFT} />
          ) : (
            <Icon icon={Icons.PLUS} />
          )}
          {expanded ? "Less" : "More"}
        </button>
      )}
      </div>
    </div>
  );
}
