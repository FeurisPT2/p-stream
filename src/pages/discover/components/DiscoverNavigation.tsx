import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";
import { useTranslation } from "react-i18next";

interface DiscoverNavigationProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

function DiscoverTab({
  category,
  isSelected,
  onClick,
}: {
  category: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const focusKey = `discover-tab-${category}`;
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onClick,
    onFocus: () => {
      setTimeout(() => {
        const element = document.querySelector(`[data-focuskey="${focusKey}"]`);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }
      }, 0);
    },
  });

  return (
    <button
      ref={ref}
      type="button"
      className={`text-xl md:text-2xl font-bold p-2 bg-transparent text-center rounded-full cursor-pointer flex items-center transition-all duration-200 border-2 ${
        isSelected
          ? "transform scale-105 text-type-link"
          : "text-type-secondary"
      } ${focused ? "border-type-link" : "border-transparent"}`}
      onClick={onClick}
      data-focuskey={focusKey}
    >
      {t(`discover.tabs.${category}`)}
    </button>
  );
}

export function DiscoverNavigation({
  selectedCategory,
  onCategoryChange,
}: DiscoverNavigationProps) {
  return (
    <div className="pb-4 w-full max-w-screen-xl mx-auto">
      <div className="relative flex justify-center">
        <div className="flex space-x-4">
          {["movies", "tvshows", "editorpicks"].map((category) => (
            <DiscoverTab
              key={category}
              category={category}
              isSelected={selectedCategory === category}
              onClick={() => onCategoryChange(category)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
