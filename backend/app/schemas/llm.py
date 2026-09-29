from pydantic import BaseModel, Field


class NewsSummarySchema(BaseModel):
    """
    Validated structured summary of a news article.
    Distinguishes generated analysis from raw source material.
    """

    summary: str = Field(
        ...,
        description="A concise 2-3 sentence overview of the article.",
    )
    key_points: list[str] = Field(
        default_factory=list,
        description="3 to 5 key takeaways or facts extracted from the article.",
    )
    why_it_matters: str = Field(
        ...,
        description="Reflective context on why this discovery, project, or event is meaningful.",
    )
    category: str = Field(
        ...,
        description="The assigned news category: ai, mystery, science_defence, developer.",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Model confidence score for classification and extraction.",
    )


class DiaryReflectionSchema(BaseModel):
    """
    Gentle, non-clinical reflective thoughts generated on an explicitly requested diary entry.
    """

    reflection: str = Field(
        ...,
        description="A compassionate, poetic, and grounding reflection on the entry.",
    )
    themes: list[str] = Field(
        default_factory=list,
        description="Key emotional or narrative threads observed.",
    )
    gentle_questions: list[str] = Field(
        default_factory=list,
        description="1-3 open-ended questions for personal introspection.",
    )


class NoteCategorizationSchema(BaseModel):
    """
    Suggested classification and tags for Little Attic notes.
    """

    suggested_category: str = Field(
        default="idea",
        description="Recommended category for the note.",
    )
    suggested_tags: list[str] = Field(
        default_factory=list,
        description="Recommended tags for indexing the note.",
    )
