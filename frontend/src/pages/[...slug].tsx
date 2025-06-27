import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import apiService, { Project, ProjectInsight } from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

// Try to parse JSON string
const tryParseJSON = (content: any) => {
    if (typeof content === 'string') {
        try {
            return JSON.parse(content);
        } catch (e) {
            return content;
        }
    }
    return content;
};

// Helper function: render different types of analysis results
const renderAnalysisContent = (content: any, t: any) => {
// Try to parse content
    const parsedContent = tryParseJSON(content);

    if (!parsedContent) return <p className="text-sm text-gray-500">{t('analysis.noData')}</p>;

    // Detect error messages - when content starts with "很抱歉" it might be an error message
    if (typeof parsedContent === 'string' && parsedContent.startsWith('很抱歉')) {
        return (
            <p className="mt-2 text-sm text-red-500">
                {parsedContent}
                <br />
                <span className="text-gray-500 mt-1 block">
                    {t('analysis.errorRetry')}
                </span>
            </p>
        );
    }

    // If it's a simple object with summary field, prioritize displaying it
    if (typeof parsedContent === 'object' && !Array.isArray(parsedContent) && parsedContent.summary) {
        return <p className="mt-2 text-sm text-gray-500 whitespace-pre-line">{parsedContent.summary}</p>;
    }

    // If it's a string type, render directly
    if (typeof parsedContent === 'string') {
        return <p className="mt-2 text-sm text-gray-500 whitespace-pre-line">{parsedContent}</p>;
    }

    // If it's an array type, render as list
    if (Array.isArray(parsedContent)) {
        return (
            <ul className="mt-2 text-sm text-gray-500 list-disc pl-5 space-y-1">
                {parsedContent.map((item, index) => (
                    <li key={index} className="whitespace-pre-line">
                        {typeof item === 'object' ? JSON.stringify(item, null, 2) : item}
                    </li>
                ))}
            </ul>
        );
    }

    // If it's an object type, render as key-value pairs
    if (typeof parsedContent === 'object') {
        return (
            <div className="mt-2 text-sm text-gray-500 space-y-2">
                {Object.entries(parsedContent).map(([key, value]) => (
                    <div key={key} className="mb-2">
                        <h5 className="font-medium text-gray-700">{key.replace(/_/g, ' ')}</h5>
                        {typeof value === 'string' ? (
                            <p className="whitespace-pre-line ml-4">{value}</p>
                        ) : Array.isArray(value) ? (
                            <ul className="list-disc pl-8 space-y-1">
                                {value.map((item, idx) => (
                                    <li key={idx} className="whitespace-pre-line">
                                        {typeof item === 'object' ? JSON.stringify(item, null, 2) : item}
                                    </li>
                                ))}
                            </ul>
                        ) : typeof value === 'object' && value !== null ? (
                            <div className="ml-4">
                                {Object.entries(value).map(([subKey, subValue]) => (
                                    <div key={subKey} className="mb-1">
                                        <span className="font-medium">{subKey.replace(/_/g, ' ')}:</span>{' '}
                                        {typeof subValue === 'string' ? (
                                            <span className="whitespace-pre-line">{subValue}</span>
                                        ) : (
                                            <span>{JSON.stringify(subValue, null, 2)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="ml-4">{String(value)}</p>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Other types, convert to string
    return <p className="mt-2 text-sm text-gray-500">{JSON.stringify(parsedContent)}</p>;
};

export default function ProjectDetail() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { locale } = router;
    const { slug } = router.query;

    const [project, setProject] = useState<Project | null>(null);
    const [insight, setInsight] = useState<ProjectInsight | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string>('');

    // Select correct date locale setting
    const dateLocale = locale === 'zh' ? zhCN : enUS;

    useEffect(() => {
        // Ensure slug exists and contains two parts (owner/repo)
        if (!slug || !Array.isArray(slug) || slug.length !== 2) return;

        const [owner, repo] = slug;

        // Set share URL
        setShareUrl(`${window.location.origin}/${owner}/${repo}`);

        const fetchProjectDetails = async () => {
            try {
                // Use new API method to get project data
                const projectData = await apiService.getProjectByName(owner, repo);
                const insightData = await apiService.getProjectInsightByName(owner, repo, locale);

                setProject(projectData);
                setInsight(insightData);
                setLoading(false);
            } catch (err) {
                console.error("API错误:", err);
                setError(t('project.error'));
                setLoading(false);
            }
        };

        fetchProjectDetails();
    }, [slug, t, locale]);

    // Format star count
    const formatCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-500">{t('project.loading')}</p>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
                    <div className="flex items-center text-red-500 mb-4">
                        <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-lg font-medium">{t('project.errorTitle')}</h2>
                    </div>
                    <p className="text-gray-600 mb-4">{error || t('project.noResults')}</p>
                    <Link href="/">
                        <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            {t('project.backToList')}
                        </span>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-gray-900 truncate">
                                {project.name}
                            </h1>
                        </div>
                        <div className="mt-4 flex items-center md:mt-0 md:ml-4">
                            <Link href="/">
                                <span className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    {t('project.backToList')}
                                </span>
                            </Link>
                            <a
                                href={project.repository_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {t('project.visitGitHub')}
                            </a>

                            <div className="h-6 mx-4 w-px bg-gray-300" aria-hidden="true"></div>

                            <div className="flex items-center space-x-2">
                                {/* X/Twitter分享 */}
                                <a
                                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${project.name} - ${project.description?.slice(0, 100) || t('project.noDescription')}`)}&url=${encodeURIComponent(shareUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-blue-400"
                                    title={t('share.label')}
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                                    </svg>
                                </a>
                                {/* LinkedIn分享 */}
                                <a
                                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center p-1.5 border border-gray-300 rounded-full text-gray-500 hover:text-blue-600 hover:bg-gray-100"
                                    title={t('share.linkedin')}
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </a>
                                {/* Facebook分享 */}
                                <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center p-1.5 border border-gray-300 rounded-full text-gray-500 hover:text-blue-800 hover:bg-gray-100"
                                    title={t('share.facebook')}
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </a>
                            </div>

                            <div className="h-6 mx-4 w-px bg-gray-300" aria-hidden="true"></div>

                            <div className="ml-4 md:ml-0">
                                <LanguageSwitcher />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
                    {/* 项目基本信息 */}
                    <div className="px-4 py-5 sm:px-6">
                        <div className="flex items-center">
                            <div className="w-0 flex-1">
                                <p className="text-sm text-gray-500 flex items-center flex-wrap gap-x-3">
                                    {locale === 'zh' ? '由 ' : 'Created by '}
                                    <a
                                        href={`https://github.com/${project.owner}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-indigo-600 hover:text-indigo-500"
                                    >
                                        {project.owner}
                                    </a>
                                    {locale === 'zh' ? ' 创建' : ''}
                                    <span className="inline-flex items-center">•</span>
                                    {t('project.listedDate')}: {new Date(project.trending_date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                                </p>
                            </div>
                            <div className="flex items-center space-x-6">
                                {project.language && (
                                    <div className="flex flex-col items-center">
                                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                            {project.language}
                                        </span>
                                    </div>
                                )}
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center text-yellow-500">
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="ml-1 text-sm font-medium">{formatCount(project.stars_count)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center text-gray-500">
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                                            <path fillRule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"></path>
                                        </svg>
                                        <span className="ml-1 text-sm font-medium">{formatCount(project.forks_count)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-gray-500">
                                {project.description || t('project.noDescription')}
                            </p>
                        </div>
                        <div className="mt-4">
                            {project.homepage_url && (
                                <a
                                    href={project.homepage_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:text-indigo-500"
                                >
                                    {t('project.projectHomepage')} &rarr;
                                </a>
                            )}
                        </div>
                    </div>

                    {/* 商业分析 */}
                    {insight && (
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {t('insight.title')}
                            </h3>

                            {/* 分析错误提示 */}
                            {insight.analysis_status === "failed" && (
                                <div className="mt-4 rounded-md bg-yellow-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-yellow-800">
                                                {t('analysis.processingIssue')}
                                            </h3>
                                            <div className="mt-2 text-sm text-yellow-700">
                                                <p>
                                                    {t('analysis.technicalIssue')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-gray-200 mt-4">
                                <dl>
                                    <div className="bg-gray-50 px-4 py-5 sm:px-6 rounded-md">
                                        <dt className="text-base font-medium text-gray-900">{t('insight.businessValue')}</dt>
                                        {renderAnalysisContent(insight.business_value, t)}
                                    </div>

                                    <div className="bg-gray-50 px-4 py-5 sm:px-6 rounded-md">
                                        <dt className="text-base font-medium text-gray-900">{t('insight.marketOpportunity')}</dt>
                                        {renderAnalysisContent(insight.market_opportunity, t)}
                                    </div>

                                    <div className="bg-gray-50 px-4 py-5 sm:px-6 rounded-md">
                                        <dt className="text-base font-medium text-gray-900">{t('insight.startupIdeas')}</dt>
                                        {renderAnalysisContent(insight.startup_ideas, t)}
                                    </div>

                                    <div className="bg-gray-50 px-4 py-5 sm:px-6 rounded-md">
                                        <dt className="text-base font-medium text-gray-900">{t('insight.targetAudience')}</dt>
                                        {renderAnalysisContent(insight.target_audience, t)}
                                    </div>

                                    <div className="bg-gray-50 px-4 py-5 sm:px-6 rounded-md">
                                        <dt className="text-base font-medium text-gray-900">{t('insight.competitionAnalysis')}</dt>
                                        {renderAnalysisContent(insight.competition_analysis, t)}
                                    </div>
                                </dl>
                            </div>
                            <div className="flex justify-end mt-4">
                                <div className="text-gray-400 text-xs">
                                    <span>{t('analysis.analysisTime')}: {new Date(insight.created_at).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-gray-500 font-medium">Powered by {insight.analysis_version || 'IdeaBase.ai AI'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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

// getServerSideProps with internationalization support
export async function getServerSideProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common'])),
        },
    };
}