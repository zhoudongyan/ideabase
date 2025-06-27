import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, startOfDay, startOfWeek, startOfMonth, isAfter, isSameDay, isWithinInterval } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import apiService, { Project } from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

// Define pagination parameters
const PAGE_SIZE = 12;
const MAX_FRONTEND_CACHE = 100; // Maximum number of projects cached on frontend
const MAX_BACKEND_LIMIT = 100; // Maximum backend return limit

// Home page component
export default function Home() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { locale } = router;

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [languageFilter, setLanguageFilter] = useState<string>('');
    const [dateRangeFilter, setDateRangeFilter] = useState<string>('');
    const [sortOption, setSortOption] = useState<string>('date');
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [offset, setOffset] = useState<number>(0);
    const [availableLanguages, setAvailableLanguages] = useState<{ language: string; count: number }[]>([]);
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
    const [reachedLimit, setReachedLimit] = useState<boolean>(false);

    const observer = useRef<IntersectionObserver | null>(null);

    // Monitor scroll position, show/hide back to top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.pageYOffset > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Back to top functionality
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Fetch data from API
    const fetchProjects = useCallback(async (currentOffset: number) => {
        try {
            // Check if frontend cache limit has been reached
            if (currentOffset >= MAX_FRONTEND_CACHE) {
                setHasMore(false);
                setReachedLimit(true);
                setLoading(false);
                setLoadingMore(false);
                return;
            }

            // Build API request parameters
            const params: any = {
                limit: PAGE_SIZE,
                offset: currentOffset
            };

            // Add search and filter parameters
            if (searchTerm) params.search = searchTerm;
            if (languageFilter) params.language = languageFilter;

            // Set days parameter based on date range
            if (dateRangeFilter === 'today') {
                params.days = 1;
            } else if (dateRangeFilter === 'this_week') {
                params.days = 7;
            } else if (dateRangeFilter === 'this_month') {
                params.days = 30;
            }

            // Use apiService to get data
            const response = await apiService.getProjects(params);

            // Check if server returned limit-related indicators
            if (response.message === 'limit_reached' || response.message === 'approaching_limit') {
                setReachedLimit(true);
            }

            // Check if new data is returned
            if (response.data.length === 0) {
                setHasMore(false);
                setLoading(false);
                setLoadingMore(false);
                return;
            }

            if (currentOffset === 0) {
                // Initial load, directly set project list
                setProjects(response.data);
                setHasMore(response.data.length === PAGE_SIZE);
            } else {
                // Append load
                setProjects(prev => {
                    // Get existing project ID set
                    const existingIds = new Set(prev.map(p => p.id));
                    // Filter out existing projects
                    const newProjects = response.data.filter(p => !existingIds.has(p.id));

                    // If no new projects, data is duplicated, stop loading more
                    if (newProjects.length === 0) {
                        console.log('No new projects, stop loading more');
                        setHasMore(false);
                        return prev;
                    }

                    const updatedProjects = [...prev, ...newProjects];

                    // If frontend cached project count exceeds limit, keep only the latest projects
                    if (updatedProjects.length > MAX_FRONTEND_CACHE) {
                        setHasMore(false);
                        setReachedLimit(true);
                        return updatedProjects.slice(0, MAX_FRONTEND_CACHE);
                    }

                    return updatedProjects;
                });

                // Check if there's more data
                setHasMore(response.data.length === PAGE_SIZE && currentOffset + PAGE_SIZE < MAX_BACKEND_LIMIT);
            }

            setOffset(currentOffset + PAGE_SIZE);
            setLoading(false);
            setLoadingMore(false);
        } catch (err) {
            console.error("API Error:", err);
            setError(t('project.error'));
            setLoading(false);
            setLoadingMore(false);
        }
    }, [searchTerm, languageFilter, dateRangeFilter, t]);

    // Load more data
    const loadMore = useCallback(() => {
        if (!hasMore || loadingMore || loading || reachedLimit) return;

        setLoadingMore(true);
        fetchProjects(offset);
    }, [hasMore, loadingMore, loading, offset, fetchProjects, reachedLimit]);

    const loadMoreRef = useCallback((node: HTMLDivElement) => {
        if (!node || loading || loadingMore || reachedLimit) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            // Ensure observer detects element entering view
            if (entries[0]?.isIntersecting && hasMore && !reachedLimit) {
                console.log('Trigger load more');
                loadMore();
            }
        }, {
            rootMargin: '100px', // Trigger 100px in advance
            threshold: 0.1 // Only need 10% visible to trigger
        });

        observer.current.observe(node);

        // Cleanup function
        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [loading, loadingMore, hasMore, loadMore, reachedLimit]);

    // Disconnect observer when component unmounts
    useEffect(() => {
        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, []);

    // Re-fetch data when search conditions change
    useEffect(() => {
        setLoading(true);
        setProjects([]);
        setOffset(0);
        setHasMore(true);
        setReachedLimit(false);
        fetchProjects(0);
    }, [searchTerm, languageFilter, dateRangeFilter, fetchProjects]);

    // Get available language list when component loads
    useEffect(() => {
        async function fetchLanguages() {
            try {
                const languages = await apiService.getLanguages();
                setAvailableLanguages(languages);
            } catch (err) {
                console.error("Failed to fetch language list:", err);
            }
        }

        fetchLanguages();
    }, []);

    // Handle date range selection (avoid circular dependency with useEffect)
    const handleDateRangeChange = useCallback((value: string) => {
        setDateRangeFilter(value);
    }, []);

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value);
    };

    // Handle search submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchTerm(filter);
    };

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setSearchTerm(filter);
        }
    };

    // Format star count
    const formatStarCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    // Filter project list
    const filteredProjects = projects.filter(project => {
        const matchesSearch = !filter ||
            project.name.toLowerCase().includes(filter.toLowerCase()) ||
            project.description?.toLowerCase().includes(filter.toLowerCase());

        const matchesLanguage = !languageFilter ||
            project.language?.toLowerCase() === languageFilter.toLowerCase();

        // Date range filtering
        let matchesDateRange = true;
        if (dateRangeFilter) {
            const projectDate = new Date(project.trending_date);
            const today = new Date();

            if (dateRangeFilter === 'today') {
                matchesDateRange = isSameDay(projectDate, today);
            } else if (dateRangeFilter === 'this_week') {
                const weekStart = startOfWeek(today, { weekStartsOn: 1 });
                matchesDateRange = isWithinInterval(projectDate, {
                    start: weekStart,
                    end: today
                });
            } else if (dateRangeFilter === 'this_month') {
                const monthStart = startOfMonth(today);
                matchesDateRange = isWithinInterval(projectDate, {
                    start: monthStart,
                    end: today
                });
            }
        }

        return matchesSearch && matchesLanguage && matchesDateRange;
    });

    // Sort project list
    const sortedProjects = [...filteredProjects].sort((a, b) => {
        if (sortOption === 'date') {
            return new Date(b.trending_date).getTime() - new Date(a.trending_date).getTime();
        } else if (sortOption === 'stars') {
            return b.stars_count - a.stars_count;
        } else if (sortOption === 'forks') {
            return b.forks_count - a.forks_count;
        }
        return 0; // Default no sorting
    });

    // Get all available languages
    // Extract languages from current projects (as fallback)
    const projectLanguages = Array.from(new Set(projects.map(p => p.language).filter(Boolean)));

    // Prioritize language list from API, use extracted languages from projects if empty
    const languages = availableLanguages.length > 0
        ? availableLanguages.map(l => l.language)
        : projectLanguages;

    // Select correct date locale setting
    const dateLocale = locale === 'zh' ? zhCN : enUS;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center">
                        <h1 className="text-2xl font-bold text-gray-900">{t('header.title')}</h1>
                        <span className="mx-2 text-gray-400">|</span>
                        <p className="text-gray-500">{t('header.subtitle')}</p>
                    </div>
                    <LanguageSwitcher />
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Filter controls */}
                <div className="bg-white p-4 rounded-lg shadow mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                                {t('filter.search')}
                            </label>
                            <form className="relative" onSubmit={handleSearchSubmit}>
                                <input
                                    type="text"
                                    id="search"
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md pr-10"
                                    placeholder={t('filter.searchPlaceholder')}
                                    value={filter}
                                    onChange={handleSearchChange}
                                    onKeyDown={handleKeyDown}
                                />
                                <button
                                    type="submit"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                        <div className="md:w-48">
                            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                                {t('filter.language')}
                            </label>
                            <select
                                id="language"
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                value={languageFilter}
                                onChange={(e) => setLanguageFilter(e.target.value)}
                            >
                                <option value="">{t('filter.allLanguages')}</option>
                                {languages.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:w-48">
                            <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-1">
                                {t('filter.dateRange')}
                            </label>
                            <select
                                id="dateRange"
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                value={dateRangeFilter}
                                onChange={(e) => handleDateRangeChange(e.target.value)}
                            >
                                <option value="">{t('filter.allTime')}</option>
                                <option value="today">{t('filter.today')}</option>
                                <option value="this_week">{t('filter.thisWeek')}</option>
                                <option value="this_month">{t('filter.thisMonth')}</option>
                            </select>
                        </div>
                        <div className="md:w-48">
                            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                                {t('filter.sortBy')}
                            </label>
                            <select
                                id="sort"
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                            >
                                <option value="date">{t('filter.byDate')}</option>
                                <option value="stars">{t('filter.byStars')}</option>
                                <option value="forks">{t('filter.byForks')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Project list */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-gray-500">{t('project.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 p-4 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                            </div>
                        </div>
                    </div>
                    ) : sortedProjects.length === 0 ? (
                    <div className="text-center py-12">
                                <p className="text-gray-500">{t('project.noResults')}</p>
                    </div>
                ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                        {sortedProjects.map((project) => (
                                            <Link key={project.id} href={`/${project.full_name}`}>
                                                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300 cursor-pointer">
                                                    <div className="px-4 py-5 sm:p-6">
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-medium text-gray-900 truncate">
                                                                {project.full_name}
                                                            </h3>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <div className="text-xs text-gray-400">
                                                                {formatDistanceToNow(new Date(project.trending_date), {
                                                                    addSuffix: true,
                                                                    locale: dateLocale
                                                                })} {t('project.trendingSuffix')}
                                                            </div>
                                                            <div className="flex items-center space-x-3">
                                                                {project.language && (
                                                                    <div className="flex items-center">
                                                                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                                                            {project.language}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center text-yellow-500">
                                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                    </svg>
                                                                    <span className="ml-1 text-sm">{formatStarCount(project.stars_count)}</span>
                                                                </div>
                                                                <div className="flex items-center text-gray-500">
                                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"></path>
                                                                    </svg>
                                                                    <span className="ml-1 text-sm">{formatStarCount(project.forks_count)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3">
                                                            <p className="text-sm text-gray-500 line-clamp-2">
                                                                {project.description || t('project.noDescription')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-50 px-4 py-3 sm:px-6">
                                                        <div className="text-sm">
                                                            <span className="font-medium text-indigo-600 hover:text-indigo-500">
                                                                {t('project.viewAnalysis')} &rarr;
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>

                                    {/* Load more indicator */}
                                    {hasMore && (
                                        <div ref={loadMoreRef} className="flex justify-center my-8">
                                            {loadingMore ? (
                                                <div className="flex items-center">
                                                    <div className="w-5 h-5 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin mr-2"></div>
                                                    <p className="text-gray-500">{t('project.loading')}</p>
                                                </div>
                                            ) : (
                                                <div className="h-10"></div>
                                            )}
                                        </div>
                                    )}

                                    {/* Data limit hint */}
                                    {reachedLimit && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-medium text-blue-800">
                                                        {t('project.loadLimitReached')}
                                                    </h3>
                                                    <div className="mt-2 text-sm text-blue-700">
                                                        <p>
                                                            {t('project.loadLimitTip')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Project statistics */}
                                    <div className="mt-8 text-center text-sm text-gray-500">
                                        <p>
                                            {t('project.showingResults', {
                                                current: sortedProjects.length,
                                                total: projects.length
                                            })}
                                        </p>
                                    </div>
                                </>
                )}
            </main>

            {/* Back to top button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-[42px] right-8 bg-indigo-600/95 hover:bg-indigo-700 text-white p-3 rounded-full shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 z-[9999] backdrop-blur-sm border-2 border-white/20"
                    aria-label={t('common.backToTop')}
                >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            )}

            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-gray-500 text-sm">
                            &copy; {new Date().getFullYear()} {t('footer.copyright')}
                        </p>
                        <div className="mt-4 md:mt-0 flex space-x-4">
                            <a href="mailto:contact@ideabase.ai" className="text-gray-500 hover:text-indigo-600 text-sm">
                                {t('footer.contactUs')}
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// getServerSideProps add internationalization support
export async function getServerSideProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common'])),
        },
    };
}
