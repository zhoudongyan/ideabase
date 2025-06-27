import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';

export default function LanguageSwitcher() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { pathname, asPath, query, locale } = router;

    return (
        <div className="flex items-center space-x-2">
            {router.locales?.map((loc) => (
                <Link
                    key={loc}
                    href={{ pathname, query }}
                    as={asPath}
                    locale={loc}
                    className={`px-2 py-1 text-sm rounded ${locale === loc
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'text-gray-500 hover:text-indigo-600'
                        }`}
                >
                    {t(`language.${loc}`)}
                </Link>
            ))}
        </div>
    );
} 