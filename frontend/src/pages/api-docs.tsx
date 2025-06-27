import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function ApiDocs() {
    const { t } = useTranslation('common');
    const { locale } = useRouter();

    // API endpoint list
    const endpoints = [
        {
            name: t('api.endpoints.getProjects.name'),
            method: 'GET',
            path: '/api/v1/projects',
            description: t('api.endpoints.getProjects.description'),
            parameters: [
                { name: 'language', type: 'string', optional: true, description: t('api.parameters.language') },
                { name: 'limit', type: 'integer', optional: true, description: t('api.parameters.limit') },
                { name: 'offset', type: 'integer', optional: true, description: t('api.parameters.offset') },
            ],
            response: `{
  "total": 100,
  "limit": 20,
  "offset": 0,
  "data": [
    {
      "id": 1,
      "name": "react",
      "owner": "facebook",
      "full_name": "facebook/react",
      "description": "A JavaScript library for building user interfaces",
      "language": "JavaScript",
      "stars_count": 200000,
      "repository_url": "https://github.com/facebook/react",
      "trending_date": "2023-09-22T00:00:00Z"
    },
    // ... more projects
  ]
}`
        },

        {
            name: t('api.endpoints.getProject.name'),
            method: 'GET',
            path: '/api/v1/{owner}/{repo}',
            description: t('api.endpoints.getProject.description'),
            parameters: [
                { name: 'owner', type: 'string', optional: false, description: t('api.parameters.owner') },
                { name: 'repo', type: 'string', optional: false, description: t('api.parameters.repo') },
            ],
            response: `{
  "id": 1,
  "name": "react",
  "owner": "facebook",
  "full_name": "facebook/react",
  "description": "A JavaScript library for building user interfaces",
  "language": "JavaScript",
  "stars_count": 200000,
  "forks_count": 40000,
  "repository_url": "https://github.com/facebook/react",
  "homepage_url": "https://reactjs.org",
  "trending_date": "2023-09-22T12:00:00Z"
}`
        },

        {
            name: t('api.endpoints.getInsights.name'),
            method: 'GET',
            path: '/api/v1/{owner}/{repo}/insights',
            description: t('api.endpoints.getInsights.description'),
            parameters: [
                { name: 'owner', type: 'string', optional: false, description: t('api.parameters.owner') },
                { name: 'repo', type: 'string', optional: false, description: t('api.parameters.repo') },
                { name: 'language', type: 'string', optional: true, description: t('api.parameters.insightLanguage') },
            ],
            response: `{
  "id": 1,
  "project_id": 1,
  "business_value": "React彻底改变了前端开发方式...",
  "market_opportunity": "前端开发工具市场规模巨大且仍在增长...",
  "startup_ideas": "1. React专业组件库：针对特定行业的高质量UI组件库订阅服务...",
  "target_audience": "前端开发者是主要用户群体，从初学者到资深工程师...",
  "competition_analysis": "主要竞争来自Vue、Angular等前端框架...",
  "created_at": "2023-09-22T12:00:00Z"
}`
        },
        {
            name: t('api.endpoints.getLanguages.name'),
            method: 'GET',
            path: '/api/v1/languages',
            description: t('api.endpoints.getLanguages.description'),
            parameters: [],
            response: `[
  {
    "language": "JavaScript",
    "count": 25
  },
  {
    "language": "Python",
    "count": 18
  },
  // ... 更多语言
]`
        },
        {
            name: t('api.endpoints.adminScrape.name'),
            method: 'POST',
            path: '/api/v1/admin/scrape',
            description: t('api.endpoints.adminScrape.description'),
            parameters: [
                { name: 'languages', type: 'array', optional: true, description: t('api.parameters.languages') },
                { name: 'time_range', type: 'string', optional: true, description: t('api.parameters.timeRange') },
            ],
            response: `{
  "task_id": "1234-5678-90ab-cdef",
  "status": "started",
  "message": "爬取任务已启动"
}`
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">{t('api.title')}</h1>
                    <Link href="/">
                        <span className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            {t('api.backToHome')}
                        </span>
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                        <h2 className="text-lg leading-6 font-medium text-gray-900">{t('api.documentTitle')}</h2>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            {t('api.documentDescription')}
                        </p>
                    </div>

                    <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t('api.basicInfo.title')}</h3>

                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">{t('api.basicInfo.baseUrl')}</dt>
                                <dd className="mt-1 text-sm text-gray-900 font-mono">https://api.ideabase.ai</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">{t('api.basicInfo.authentication')}</dt>
                                <dd className="mt-1 text-sm text-gray-900">Bearer Token</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">{t('api.basicInfo.contentType')}</dt>
                                <dd className="mt-1 text-sm text-gray-900 font-mono">application/json</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">{t('api.basicInfo.version')}</dt>
                                <dd className="mt-1 text-sm text-gray-900">v1</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 px-4 py-3">{t('api.endpoints.title')}</h3>

                        <dl>
                            {endpoints.map((endpoint, index) => (
                                <div key={index} className={`${index > 0 ? 'border-t border-gray-200' : ''} px-4 py-5 sm:grid sm:grid-cols-1 sm:gap-4 sm:px-6`}>
                                    <div className="mb-4">
                                        <div className="flex items-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-md ${endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                                                endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                                    endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {endpoint.method}
                                            </span>
                                            <span className="ml-2 text-sm font-medium text-gray-900">{endpoint.path}</span>
                                        </div>
                                        <h4 className="mt-1 text-base font-semibold text-gray-900">{endpoint.name}</h4>
                                        <p className="mt-1 text-sm text-gray-500">{endpoint.description}</p>
                                    </div>

                                    {endpoint.parameters.length > 0 && (
                                        <div className="mt-4">
                                            <h5 className="text-sm font-medium text-gray-700 mb-2">{t('api.table.parameters')}</h5>
                                            <div className="bg-gray-50 overflow-hidden shadow-sm rounded-md">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('api.table.name')}</th>
                                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('api.table.type')}</th>
                                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('api.table.required')}</th>
                                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('api.table.description')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {endpoint.parameters.map((param, paramIndex) => (
                                                            <tr key={paramIndex}>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-900">{param.name}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{param.type}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{param.optional ? t('api.table.no') : t('api.table.yes')}</td>
                                                                <td className="px-4 py-2 text-sm text-gray-500">{param.description}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">{t('api.table.response')}</h5>
                                        <div className="bg-gray-800 rounded-md overflow-auto">
                                            <pre className="p-4 text-xs text-green-400 font-mono">
                                                {endpoint.response}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-gray-500 text-sm">
                        &copy; {new Date().getFullYear()} IdeaBase.ai. {t('api.footer')}
                    </p>
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