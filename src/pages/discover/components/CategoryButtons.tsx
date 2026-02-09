import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

import { Icon, Icons } from "@/components/Icon";

interface CategoryButtonsProps {
  categories: any[];
  onCategoryClick: (id: string, name: string) => void;
  categoryType: string;
  isMobile: boolean;
  showAlwaysScroll: boolean;
}

function CategoryButton({
  category,
  onClick,
  categoryType,
}: {
  category: any;
  onClick: () => void;
  categoryType: string;
}) {
  const focusKey = `category-${categoryType}-${category.id || category.name}`;
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
      className={`whitespace-nowrap flex items-center space-x-2 rounded-full px-4 text-white py-2 bg-pill-background bg-opacity-50 hover:bg-pill-backgroundHover transition-all duration-100 hover:scale-105 border-2 ${
        focused ? "border-type-link scale-105" : "border-transparent"
      }`}
      onClick={onClick}
      data-focuskey={focusKey}
    >
      {category.name}
    </button>
  );
}

function ScrollButton({
  direction,
  categoryType,
}: {
  direction: "left" | "right";
  categoryType: string;
}) {
  const focusKey = `category-scroll-${categoryType}-${direction}`;
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => {
      const element = document.getElementById(
        `button-carousel-${categoryType}`,
      );
      if (element) {
        element.scrollBy({
          left: direction === "left" ? -200 : 200,
          behavior: "smooth",
        });
      }
    },
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
    <div>
      <button
        ref={ref}
        type="button"
        className={`flex items-center rounded-full px-4 text-white py-3 border-2 transition-colors ${
          focused ? "border-type-link" : "border-transparent"
        }`}
        onClick={() => {
          const element = document.getElementById(
            `button-carousel-${categoryType}`,
          );
          if (element) {
            element.scrollBy({
              left: direction === "left" ? -200 : 200,
              behavior: "smooth",
            });
          }
        }}
        data-focuskey={focusKey}
      >
        <Icon
          icon={direction === "left" ? Icons.CHEVRON_LEFT : Icons.CHEVRON_RIGHT}
          className="text-2xl rtl:-scale-x-100"
        />
      </button>
    </div>
  );
}

export function CategoryButtons({
  categories,
  onCategoryClick,
  categoryType,
  isMobile,
  showAlwaysScroll,
}: CategoryButtonsProps) {
  return (
    <div className="flex overflow-x-auto">
      {(showAlwaysScroll || isMobile) && (
        <ScrollButton direction="left" categoryType={categoryType} />
      )}

      <div
        id={`button-carousel-${categoryType}`}
        className="flex lg:px-4 mb-4 overflow-x-auto scroll-smooth"
      >
        <div className="flex space-x-2 py-1">
          {categories.map((category) => (
            <CategoryButton
              key={category.id || category.name}
              category={category}
              onClick={() => onCategoryClick(category.id, category.name)}
              categoryType={categoryType}
            />
          ))}
        </div>
      </div>

      {(showAlwaysScroll || isMobile) && (
        <ScrollButton direction="right" categoryType={categoryType} />
      )}
    </div>
  );
}
