"use client";

import { useState, useEffect, useCallback } from "react";
import ReturnButton from "@/components/ui/ReturnButton";
import {
  fetchStorybookOverview,
  fetchProjects,
  fetchChapters,
  createProject,
  updateProject,
  deleteProject,
  toggleProjectFeatured,
  createChapter,
  deleteChapter,
  Project,
  StoryChapter,
  StorybookOverview,
} from "@/lib/api";

type TabMode = "overview" | "projects" | "chapters" | "achievements" | "portfolio";

export default function StorybookPage() {
  const [activeTab, setActiveTab] = useState<TabMode>("overview");
  const [overview, setOverview] = useState<StorybookOverview | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter for projects
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("all");

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState("in_progress");
  const [projectTechInput, setProjectTechInput] = useState("");
  const [projectGithub, setProjectGithub] = useState("");
  const [projectLive, setProjectLive] = useState("");
  const [projectLessons, setProjectLessons] = useState("");
  const [projectFeatured, setProjectFeatured] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  // Chapter Modal State
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterDescription, setChapterDescription] = useState("");
  const [chapterPeriod, setChapterPeriod] = useState("");
  const [chapterReflections, setChapterReflections] = useState("");
  const [isSubmittingChapter, setIsSubmittingChapter] = useState(false);

  // Load everything
  const loadData = useCallback(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const [ov, pList, cList] = await Promise.all([
          fetchStorybookOverview().catch(() => null),
          fetchProjects().catch(() => ({ items: [], total: 0 })),
          fetchChapters().catch(() => ({ items: [], total: 0 })),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setProjects(pList.items);
        setChapters(cList.items);
      } catch (err) {
        console.error("Failed to load Storybook data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = loadData();
    return () => cancel?.();
  }, [loadData]);

  // Project modal handlers
  const openNewProject = () => {
    setEditingProject(null);
    setProjectTitle("");
    setProjectDescription("");
    setProjectStatus("in_progress");
    setProjectTechInput("");
    setProjectGithub("");
    setProjectLive("");
    setProjectLessons("");
    setProjectFeatured(false);
    setShowProjectModal(true);
  };

  const openEditProject = (p: Project) => {
    setEditingProject(p);
    setProjectTitle(p.title);
    setProjectDescription(p.description || "");
    setProjectStatus(p.status);
    setProjectTechInput(p.technologies.join(", "));
    setProjectGithub(p.github_url || "");
    setProjectLive(p.live_url || "");
    setProjectLessons(p.lessons_learned || "");
    setProjectFeatured(p.is_featured);
    setShowProjectModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;
    setIsSubmittingProject(true);

    const techArray = projectTechInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          title: projectTitle.trim(),
          description: projectDescription.trim() || null,
          status: projectStatus,
          technologies: techArray,
          github_url: projectGithub.trim() || null,
          live_url: projectLive.trim() || null,
          lessons_learned: projectLessons.trim() || null,
          is_featured: projectFeatured,
        });
      } else {
        await createProject({
          title: projectTitle.trim(),
          description: projectDescription.trim() || null,
          status: projectStatus,
          technologies: techArray,
          github_url: projectGithub.trim() || null,
          live_url: projectLive.trim() || null,
          lessons_learned: projectLessons.trim() || null,
          is_featured: projectFeatured,
        });
      }
      setShowProjectModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to remove this project from your chronicle?")) return;
    try {
      await deleteProject(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      await toggleProjectFeatured(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Chapter modal handlers
  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim()) return;
    setIsSubmittingChapter(true);
    try {
      await createChapter({
        title: chapterTitle.trim(),
        description: chapterDescription.trim() || null,
        period: chapterPeriod.trim() || null,
        reflections: chapterReflections.trim() || null,
        order_index: chapters.length + 1,
      });
      setShowChapterModal(false);
      setChapterTitle("");
      setChapterDescription("");
      setChapterPeriod("");
      setChapterReflections("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingChapter(false);
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm("Remove this chapter from your storybook?")) return;
    try {
      await deleteChapter(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (projectStatusFilter === "all") return true;
    return p.status === projectStatusFilter;
  });

  return (
    <main className="min-h-screen bg-[#13151A] text-[#EAE6DF] p-4 sm:p-8 flex flex-col items-center">
      {/* Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-6 pb-4 border-b border-[#2B303C]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#271E1D] border border-[#BA533C]/40 flex items-center justify-center text-xl shadow-inner">
            📖
          </div>
          <div>
            <h1 className="font-serif text-2xl text-[#EAE6DF] font-medium flex items-center gap-2">
              The Storybook
              <span className="text-xs font-doodle text-[#BA533C] font-normal tracking-wide">
                ~ look how far you&apos;ve come ~
              </span>
            </h1>
            <p className="text-xs text-[#9D978C]">
              Your personal chronicle of engineering milestones, projects, achievements, and lessons.
            </p>
          </div>
        </div>

        <ReturnButton />
      </div>

      {/* Navigation Ribbon */}
      <div className="w-full max-w-5xl flex items-center justify-between flex-wrap gap-2 mb-8 bg-[#1A1D24] p-1.5 rounded-2xl border border-[#2B303C]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-sans transition-all ${
              activeTab === "overview"
                ? "bg-[#271E1D] text-[#EAE6DF] border border-[#BA533C]/50 shadow"
                : "text-[#9D978C] hover:text-[#EAE6DF]"
            }`}
          >
            Chronicle Overview
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-sans transition-all ${
              activeTab === "projects"
                ? "bg-[#271E1D] text-[#EAE6DF] border border-[#BA533C]/50 shadow"
                : "text-[#9D978C] hover:text-[#EAE6DF]"
            }`}
          >
            Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("chapters")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-sans transition-all ${
              activeTab === "chapters"
                ? "bg-[#271E1D] text-[#EAE6DF] border border-[#BA533C]/50 shadow"
                : "text-[#9D978C] hover:text-[#EAE6DF]"
            }`}
          >
            Chapters ({chapters.length})
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-sans transition-all ${
              activeTab === "achievements"
                ? "bg-[#271E1D] text-[#EAE6DF] border border-[#BA533C]/50 shadow"
                : "text-[#9D978C] hover:text-[#EAE6DF]"
            }`}
          >
            Garden Achievements ({overview?.achievements_earned_count || 0})
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-sans transition-all ${
              activeTab === "portfolio"
                ? "bg-[#271E1D] text-[#EAE6DF] border border-[#BA533C]/50 shadow"
                : "text-[#9D978C] hover:text-[#EAE6DF]"
            }`}
          >
            ✦ Portfolio View
          </button>
        </div>

        {activeTab === "projects" && (
          <button
            onClick={openNewProject}
            className="px-3.5 py-1.5 rounded-xl bg-[#BA533C] hover:bg-[#a04632] text-white text-xs font-medium transition-colors shadow flex items-center gap-1.5"
          >
            <span>+</span> Log Project
          </button>
        )}

        {activeTab === "chapters" && (
          <button
            onClick={() => setShowChapterModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#BA533C] hover:bg-[#a04632] text-white text-xs font-medium transition-colors shadow flex items-center gap-1.5"
          >
            <span>+</span> Pen New Chapter
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center font-serif text-sm italic text-[#9D978C]">
          Unrolling the illuminated parchment...
        </div>
      ) : (
        <div className="w-full max-w-5xl">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Metrics Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-4 text-center">
                  <span className="text-2xl font-serif text-[#EAE6DF] block mb-1">
                    {overview?.projects_count || 0}
                  </span>
                  <span className="text-[11px] text-[#9D978C] uppercase tracking-wider">
                    Total Projects
                  </span>
                </div>
                <div className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-4 text-center">
                  <span className="text-2xl font-serif text-[#86A868] block mb-1">
                    {overview?.completed_projects_count || 0}
                  </span>
                  <span className="text-[11px] text-[#9D978C] uppercase tracking-wider">
                    Completed
                  </span>
                </div>
                <div className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-4 text-center">
                  <span className="text-2xl font-serif text-[#E5B458] block mb-1">
                    {overview?.achievements_earned_count || 0}
                  </span>
                  <span className="text-[11px] text-[#9D978C] uppercase tracking-wider">
                    Garden Achievements
                  </span>
                </div>
                <div className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-4 text-center">
                  <span className="text-2xl font-serif text-[#BA533C] block mb-1">
                    {overview?.chapters_count || 0}
                  </span>
                  <span className="text-[11px] text-[#9D978C] uppercase tracking-wider">
                    Story Chapters
                  </span>
                </div>
              </div>

              {/* Technologies Mastered */}
              {overview?.all_technologies && overview.all_technologies.length > 0 && (
                <div className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-5">
                  <h3 className="font-serif text-sm text-[#EAE6DF] mb-3 flex items-center gap-2">
                    <span>🛠️</span> Technologies Mastered
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {overview.all_technologies.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg bg-[#14161C] border border-[#2B303C] text-xs text-[#EAE6DF] font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Chronicles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Featured Projects */}
                <div className="bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-base text-[#EAE6DF] flex items-center gap-2">
                      <span>⭐</span> Featured Projects
                    </h3>
                    <button
                      onClick={() => setActiveTab("projects")}
                      className="text-xs text-[#BA533C] hover:underline"
                    >
                      View All →
                    </button>
                  </div>
                  {overview?.featured_projects && overview.featured_projects.length > 0 ? (
                    <div className="space-y-3">
                      {overview.featured_projects.map((p) => (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-xl bg-[#14161C] border border-[#252A34] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-serif text-sm text-[#EAE6DF] font-medium">
                                {p.title}
                              </h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#271E1D] text-[#BA533C] border border-[#BA533C]/30">
                                {p.status}
                              </span>
                            </div>
                            <p className="text-xs text-[#9D978C] line-clamp-2 leading-relaxed">
                              {p.description || "No description provided."}
                            </p>
                          </div>
                          {p.technologies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {p.technologies.slice(0, 3).map((tech) => (
                                <span
                                  key={tech}
                                  className="text-[10px] text-[#9D978C] bg-[#1A1D24] px-1.5 py-0.5 rounded border border-[#2B303C]"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#9D978C] italic font-serif py-6 text-center">
                      No featured projects starred yet.
                    </p>
                  )}
                </div>

                {/* Recent Chapters */}
                <div className="bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-base text-[#EAE6DF] flex items-center gap-2">
                      <span>📜</span> Recent Narrative Chapters
                    </h3>
                    <button
                      onClick={() => setActiveTab("chapters")}
                      className="text-xs text-[#BA533C] hover:underline"
                    >
                      View All →
                    </button>
                  </div>
                  {overview?.recent_chapters && overview.recent_chapters.length > 0 ? (
                    <div className="space-y-3">
                      {overview.recent_chapters.map((ch) => (
                        <div
                          key={ch.id}
                          className="p-3.5 rounded-xl bg-[#14161C] border border-[#252A34]"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <h4 className="font-serif text-sm text-[#EAE6DF] font-medium">
                              {ch.title}
                            </h4>
                            <span className="text-[10px] text-[#BA533C] font-mono">
                              {ch.period || "Chronicle"}
                            </span>
                          </div>
                          <p className="text-xs text-[#9D978C] line-clamp-2 leading-relaxed">
                            {ch.description || ch.reflections || "A quiet chapter in the story."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#9D978C] italic font-serif py-6 text-center">
                      The first chapter hasn&apos;t been written yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECTS */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              {/* Filter Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {["all", "in_progress", "completed", "concept"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setProjectStatusFilter(st)}
                    className={`px-3 py-1 rounded-xl text-xs capitalize border transition-all ${
                      projectStatusFilter === st
                        ? "bg-[#271E1D] border-[#BA533C] text-[#EAE6DF]"
                        : "bg-[#1A1D24] border-[#2B303C] text-[#9D978C] hover:border-[#BA533C]/50"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>

              {filteredProjects.length === 0 ? (
                <div className="py-20 text-center bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-8">
                  <span className="text-3xl block mb-2 opacity-50">🛠️</span>
                  <p className="font-serif italic text-sm text-[#9D978C] mb-4">
                    No projects inked on this page yet.
                  </p>
                  <button
                    onClick={openNewProject}
                    className="px-4 py-1.5 rounded-xl bg-[#BA533C] text-white text-xs font-medium shadow"
                  >
                    + Log Your First Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProjects.map((p) => (
                    <div
                      key={p.id}
                      className="bg-[#1A1D24] border border-[#2B303C] hover:border-[#BA533C]/50 rounded-2xl p-5 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-serif text-base text-[#EAE6DF] font-medium flex items-center gap-1.5">
                            {p.title}
                            {p.is_featured && <span title="Featured">⭐</span>}
                          </h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-mono ${
                              p.status === "completed"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                                : "bg-[#271E1D] text-[#BA533C] border border-[#BA533C]/40"
                            }`}
                          >
                            {p.status.replace("_", " ")}
                          </span>
                        </div>

                        <p className="text-xs text-[#9D978C] leading-relaxed mb-4">
                          {p.description || "No description provided."}
                        </p>

                        {/* Tech Stack */}
                        {p.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {p.technologies.map((tech) => (
                              <span
                                key={tech}
                                className="text-[11px] font-mono text-[#EAE6DF]/80 bg-[#14161C] px-2 py-0.5 rounded-md border border-[#252A34]"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Lessons Learned */}
                        {p.lessons_learned && (
                          <div className="p-3 rounded-xl bg-[#14161C] border border-[#252A34] text-xs text-[#EAE6DF]/90 mb-4 font-sans italic">
                            <span className="text-[#BA533C] font-serif not-italic block mb-0.5">
                              Lessons Learned:
                            </span>
                            &ldquo;{p.lessons_learned}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-[#252A34] flex items-center justify-between text-xs text-[#9D978C]">
                        <div className="flex items-center gap-3">
                          {p.github_url && (
                            <a
                              href={p.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#BA533C] hover:underline flex items-center gap-1"
                            >
                              Code ↗
                            </a>
                          )}
                          {p.live_url && (
                            <a
                              href={p.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              Live ↗
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleFeatured(p.id)}
                            className="hover:text-[#EAE6DF] transition-colors"
                            title={p.is_featured ? "Unstar" : "Star as featured"}
                          >
                            {p.is_featured ? "★" : "☆"}
                          </button>
                          <button
                            onClick={() => openEditProject(p)}
                            className="hover:text-[#EAE6DF] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHAPTERS */}
          {activeTab === "chapters" && (
            <div className="space-y-6">
              {chapters.length === 0 ? (
                <div className="py-20 text-center bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-8">
                  <span className="text-3xl block mb-2 opacity-50">📜</span>
                  <p className="font-serif italic text-sm text-[#9D978C] mb-4">
                    The first chapter hasn&apos;t been written yet.
                  </p>
                  <button
                    onClick={() => setShowChapterModal(true)}
                    className="px-4 py-1.5 rounded-xl bg-[#BA533C] text-white text-xs font-medium shadow"
                  >
                    + Pen Chapter One
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {chapters.map((ch, idx) => (
                    <div
                      key={ch.id}
                      className="bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 shadow-lg relative"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono uppercase text-[#BA533C] tracking-wider">
                          Chapter {idx + 1} • {ch.period || "Undated Period"}
                        </span>
                        <button
                          onClick={() => handleDeleteChapter(ch.id)}
                          className="text-xs text-[#9D978C] hover:text-red-400"
                        >
                          Remove Chapter
                        </button>
                      </div>

                      <h3 className="font-serif text-xl sm:text-2xl text-[#EAE6DF] font-medium mb-3">
                        {ch.title}
                      </h3>

                      {ch.description && (
                        <p className="text-sm text-[#9D978C] leading-relaxed mb-4 font-sans">
                          {ch.description}
                        </p>
                      )}

                      {ch.reflections && (
                        <div className="p-4 rounded-2xl bg-[#14161C] border border-[#252A34] text-xs text-[#EAE6DF]/90 font-serif italic leading-relaxed">
                          &ldquo;{ch.reflections}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACHIEVEMENTS */}
          {activeTab === "achievements" && (
            <div className="space-y-6">
              <div className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-4 text-xs text-[#9D978C] flex items-center justify-between">
                <span>
                  🌿 Source of Truth: Earned dynamically in your Garden of Tomorrow through consistency.
                </span>
                <span className="font-mono text-[#E5B458]">
                  {overview?.achievements_earned_count || 0} durable milestones unlocked
                </span>
              </div>

              {!overview?.earned_achievements || overview.earned_achievements.length === 0 ? (
                <div className="py-20 text-center bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-8">
                  <span className="text-3xl block mb-2 opacity-50">🌱</span>
                  <p className="font-serif italic text-sm text-[#9D978C]">
                    Achievements earned in your Garden of Tomorrow will appear here as your story unfolds.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {overview.earned_achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="bg-[#1A1D24] border border-[#2B303C] rounded-2xl p-5 flex items-start gap-4 shadow"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#14161C] border border-[#E5B458]/30 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                        {ach.icon || "🌱"}
                      </div>
                      <div>
                        <span className="text-[10px] text-[#E5B458] uppercase font-mono tracking-wider">
                          {ach.category}
                        </span>
                        <h4 className="font-serif text-sm text-[#EAE6DF] font-medium mt-0.5 mb-1">
                          {ach.title}
                        </h4>
                        <p className="text-xs text-[#9D978C] leading-snug">{ach.description}</p>
                        <span className="text-[10px] text-[#9D978C]/50 font-mono block mt-2">
                          Unlocked {new Date(ach.unlocked_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PORTFOLIO VIEW */}
          {activeTab === "portfolio" && (
            <div className="bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-8 sm:p-12 shadow-2xl relative">
              <div className="border-b border-[#2B303C] pb-6 mb-8 text-center">
                <span className="text-xs uppercase tracking-widest text-[#BA533C] font-semibold">
                  Personal Engineering Portfolio
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#EAE6DF] mt-2 mb-2 font-medium">
                  The Story of a Builder
                </h2>
                <p className="text-[#9D978C] text-sm max-w-xl mx-auto font-sans">
                  A calm, authentic portfolio showcasing projects built with care, technologies mastered,
                  and reflective growth over time.
                </p>
              </div>

              {/* Skills / Tech */}
              {overview?.all_technologies && overview.all_technologies.length > 0 && (
                <div className="mb-10 text-center">
                  <h3 className="text-xs uppercase tracking-wider text-[#9D978C] font-mono mb-3">
                    Craft &amp; Technologies
                  </h3>
                  <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                    {overview.all_technologies.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 rounded-xl bg-[#14161C] border border-[#2B303C] text-xs font-mono text-[#EAE6DF]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured Showcase */}
              <div className="mb-10">
                <h3 className="font-serif text-xl text-[#EAE6DF] mb-4 pb-2 border-b border-[#252A34]">
                  Key Works &amp; Explorations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects
                    .filter((p) => p.is_featured || p.status === "completed")
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-5 rounded-2xl bg-[#14161C] border border-[#252A34] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-serif text-base text-[#EAE6DF] font-medium">
                              {p.title}
                            </h4>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {p.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#9D978C] leading-relaxed mb-3">
                            {p.description}
                          </p>
                          {p.lessons_learned && (
                            <p className="text-xs text-[#EAE6DF]/80 italic mb-3">
                              &ldquo;{p.lessons_learned}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 pt-3 border-t border-[#252A34] text-xs">
                          {p.github_url && (
                            <a
                              href={p.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#BA533C] hover:underline"
                            >
                              Source Code ↗
                            </a>
                          )}
                          {p.live_url && (
                            <a
                              href={p.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline"
                            >
                              Live Demonstration ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Achievements Highlight */}
              {overview?.earned_achievements && overview.earned_achievements.length > 0 && (
                <div>
                  <h3 className="font-serif text-xl text-[#EAE6DF] mb-4 pb-2 border-b border-[#252A34]">
                    Durable Milestones
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {overview.earned_achievements.slice(0, 4).map((ach) => (
                      <div
                        key={ach.id}
                        className="p-3 rounded-xl bg-[#14161C] border border-[#252A34] text-center"
                      >
                        <span className="text-2xl block mb-1">{ach.icon}</span>
                        <span className="text-xs font-serif text-[#EAE6DF] block font-medium">
                          {ach.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowProjectModal(false)}
              className="absolute top-4 right-4 text-sm text-[#9D978C] hover:text-[#EAE6DF]"
            >
              ✕
            </button>

            <h3 className="font-serif text-xl text-[#EAE6DF] mb-1">
              {editingProject ? "Update Project Log" : "Inscribe New Project"}
            </h3>
            <p className="text-xs text-[#9D978C] mb-6">
              Record what you built, what tech you chose, and what you learned.
            </p>

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9D978C] mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Your Little World"
                  className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                />
              </div>

              <div>
                <label className="block text-[#9D978C] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="What is this project and why did you build it?..."
                  className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9D978C] mb-1">Status</label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="concept">Concept</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#9D978C] mb-1">Featured in Portfolio?</label>
                  <div className="flex items-center h-9">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#EAE6DF]">
                      <input
                        type="checkbox"
                        checked={projectFeatured}
                        onChange={(e) => setProjectFeatured(e.target.checked)}
                        className="rounded border-[#2B303C] bg-[#14161C] text-[#BA533C]"
                      />
                      <span>Featured (Star)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#9D978C] mb-1">
                  Technologies (comma-separated)
                </label>
                <input
                  type="text"
                  value={projectTechInput}
                  onChange={(e) => setProjectTechInput(e.target.value)}
                  placeholder="React, Next.js, FastAPI, SQLite"
                  className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9D978C] mb-1">GitHub / Code URL</label>
                  <input
                    type="url"
                    value={projectGithub}
                    onChange={(e) => setProjectGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                  />
                </div>
                <div>
                  <label className="block text-[#9D978C] mb-1">Live Demo URL</label>
                  <input
                    type="url"
                    value={projectLive}
                    onChange={(e) => setProjectLive(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9D978C] mb-1">Lessons Learned</label>
                <textarea
                  rows={2}
                  value={projectLessons}
                  onChange={(e) => setProjectLessons(e.target.value)}
                  placeholder="What was difficult? What would you do differently next time?..."
                  className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#252A34]">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#2B303C] text-xs text-[#9D978C] hover:text-[#EAE6DF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProject}
                  className="px-5 py-2 rounded-xl bg-[#BA533C] hover:bg-[#a04632] text-white text-xs font-medium shadow"
                >
                  {isSubmittingProject ? "Inscribing..." : editingProject ? "Save Changes" : "Record Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowChapterModal(false)}
              className="absolute top-4 right-4 text-sm text-[#9D978C] hover:text-[#EAE6DF]"
            >
              ✕
            </button>

            <h3 className="font-serif text-xl text-[#EAE6DF] mb-1">Pen a New Chapter</h3>
            <p className="text-xs text-[#9D978C] mb-6">
              Mark a milestone in your journey — learning, career, or personal evolution.
            </p>

            <form onSubmit={handleSaveChapter} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9D978C] mb-1">Chapter Title *</label>
                <input
                  type="text"
                  required
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="e.g. Venturing into Systems Architecture"
                  className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                />
              </div>

              <div>
                <label className="block text-[#9D978C] mb-1">Time Period</label>
                <input
                  type="text"
                  value={chapterPeriod}
                  onChange={(e) => setChapterPeriod(e.target.value)}
                  placeholder="e.g. Autumn 2026, Year of Awakening"
                  className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                />
              </div>

              <div>
                <label className="block text-[#9D978C] mb-1">Chapter Description</label>
                <textarea
                  rows={3}
                  value={chapterDescription}
                  onChange={(e) => setChapterDescription(e.target.value)}
                  placeholder="What defined this era of your work and life?..."
                  className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                />
              </div>

              <div>
                <label className="block text-[#9D978C] mb-1">Personal Reflection</label>
                <textarea
                  rows={3}
                  value={chapterReflections}
                  onChange={(e) => setChapterReflections(e.target.value)}
                  placeholder="How did you grow? What surprised you?..."
                  className="w-full bg-[#14161C] border border-[#2B303C] rounded-xl px-3 py-2 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#BA533C]"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#252A34]">
                <button
                  type="button"
                  onClick={() => setShowChapterModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#2B303C] text-xs text-[#9D978C] hover:text-[#EAE6DF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingChapter}
                  className="px-5 py-2 rounded-xl bg-[#BA533C] hover:bg-[#a04632] text-white text-xs font-medium shadow"
                >
                  {isSubmittingChapter ? "Inscribing..." : "Inscribe Chapter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
