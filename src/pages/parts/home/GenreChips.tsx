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

  // Display top 8 genres by default
  const displayGenres = expanded ? genres : genres.slice(0, 8);
  const hasMore = genres.length > 8;

  return (
    <div 
      ref={parentRef}
      className="flex flex-wrap justify-center gap-2 mt-3 px-2 opacity-0 animate-fade-in" 
      style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
    >
      {displayGenres.map((genre) => (
        <Link
          key={genre.id}
          to={`/discover/more/genre/${genre.id}/movie`}
          className={classNames(
            "px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide",
            "bg-search-background/40 backdrop-blur-md hover:bg-search-hoverBackground/80",
            "text-type-secondary hover:text-white border border-white/5 hover:border-white/15 select-none",
            "transition-all duration-300 ease-out",
            "hover:-translate-y-0.5 active:translate-y-0 active:scale-95 hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
          )}
        >
          {genre.name}
        </Link>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={classNames(
            "flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide",
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
  );
}
