from enum import StrEnum
from typing import NamedTuple


class NewsCategory(StrEnum):
    """Stable internal identifiers for the four Faraway Window categories."""

    AI = "ai"
    MYSTERY = "mystery"
    SCIENCE_DEFENCE = "science_defence"
    DEVELOPER = "developer"


class CategoryMeta(NamedTuple):
    id: NewsCategory
    label: str
    description: str
    icon: str


CATEGORY_REGISTRY: dict[NewsCategory, CategoryMeta] = {
    NewsCategory.AI: CategoryMeta(
        id=NewsCategory.AI,
        label="AI Tools & AI News",
        description="Machine intelligence breakthroughs, tooling, and dispatches from the digital frontier.",
        icon="⚡",
    ),
    NewsCategory.MYSTERY: CategoryMeta(
        id=NewsCategory.MYSTERY,
        label="Detective / Mystery / Investigation",
        description="Puzzles, forensic inquiries, historical mysteries, and investigative dispatches.",
        icon="🔍",
    ),
    NewsCategory.SCIENCE_DEFENCE: CategoryMeta(
        id=NewsCategory.SCIENCE_DEFENCE,
        label="Space / Science / Defence-Tech",
        description="NASA, ISRO, deep space discoveries, planetary science, and advanced engineering.",
        icon="🛰️",
    ),
    NewsCategory.DEVELOPER: CategoryMeta(
        id=NewsCategory.DEVELOPER,
        label="Software / Developer News",
        description="Language evolutions, open source craft, software architectures, and developer stories.",
        icon="💻",
    ),
}


def is_valid_category(category: str) -> bool:
    """Validate whether a category string belongs to the official news categories."""
    return category in [c.value for c in NewsCategory]


def get_category_label(category: str) -> str:
    """Return the human-readable display label for a category."""
    try:
        cat_enum = NewsCategory(category)
        return CATEGORY_REGISTRY[cat_enum].label
    except ValueError:
        return category.replace("_", " ").title()
