import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

interface ProjectCardProps {
    id: number;
    name: string;
    full_name: string;
    description: string;
    language?: string;
    stars_count: number;
    trending_date: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
    id,
    name,
    full_name,
    description,
    language,
    stars_count,
    trending_date,
}) => {
    const { t } = useTranslation('common');
    const router = useRouter();
    const { locale } = router;

    // Format star count
    const formatStarCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    // Select correct date locale
    const dateLocale = locale === 'zh' ? zhCN : enUS;

    return (
        <Link href={`/${full_name}`}>
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300 cursor-pointer">
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                            <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dt className="text-sm font-medium text-gray-500 truncate">
                                {full_name}
                            </dt>
                            <dd className="flex items-center text-lg font-medium text-gray-900">
                                {name}
                                {language && (
                                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                        {language}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div className="flex items-center text-yellow-500">
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="ml-1 text-sm">{formatStarCount(stars_count)}</span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-gray-500 line-clamp-2">
                            {description || t('project.noDescription')}
                        </p>
                    </div>
                    <div className="mt-4 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(trending_date), {
                            addSuffix: true,
                            locale: dateLocale
                        })}
                        {t('project.trendingSuffix')}
                    </div>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="text-sm">
                        <span className="font-medium text-indigo-600 hover:text-indigo-500">
                            {t('project.viewAnalysis')} &rarr;
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ProjectCard; 