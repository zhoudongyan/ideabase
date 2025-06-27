import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';

interface LayoutProps {
    children: ReactNode;
    title?: string;
    description?: string;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    title = 'IdeaBase.ai',
    description,
}) => {
    const { t } = useTranslation('common');

    // Use translation for description if not provided
    const pageDescription = description || t('header.subtitle');

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Link href="/">
                                <span className="cursor-pointer">
                                    <span className="text-2xl font-bold text-indigo-600">IdeaBase.ai</span>
                                </span>
                            </Link>
                            <div className="hidden md:block ml-10">
                                <div className="flex items-baseline space-x-4">
                                    <Link href="/">
                                        <span className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100 cursor-pointer">
                                            {t('navigation.trending')}
                                        </span>
                                    </Link>
                                    <Link href="/api-docs">
                                        <span className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 cursor-pointer">
                                            {t('navigation.apiDocs')}
                                        </span>
                                    </Link>
                                    <a
                                        href="https://github.com/ideabase/ideabase"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
                                    >
                                        {t('navigation.github')}
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-500 hidden md:block">{pageDescription}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="bg-white border-t border-gray-200">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="mb-4 md:mb-0">
                            <p className="text-gray-500 text-sm">
                                &copy; {new Date().getFullYear()} IdeaBase.ai. {t('footer.dailyAnalysis')}
                            </p>
                        </div>
                        <div className="flex space-x-6">
                            <a
                                href="#"
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <span className="sr-only">{t('footer.aboutUs')}</span>
                                <span className="text-sm">{t('footer.aboutUs')}</span>
                            </a>
                            <a
                                href="#"
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <span className="sr-only">{t('footer.privacyPolicy')}</span>
                                <span className="text-sm">{t('footer.privacyPolicy')}</span>
                            </a>
                            <a
                                href="#"
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <span className="sr-only">{t('footer.termsOfService')}</span>
                                <span className="text-sm">{t('footer.termsOfService')}</span>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout; 