import httpx
from bs4 import BeautifulSoup

from typing import List, Dict, Any, Optional
from datetime import datetime

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class GitHubTrendingScraper:
    """GitHub Trending scraper class"""

    def __init__(self, github_token: Optional[str] = None):
        self.base_url = "https://github.com/trending"
        self.github_token = github_token or settings.GITHUB_TOKEN
        self.headers = {}

        if self.github_token:
            self.headers["Authorization"] = f"token {self.github_token}"

    async def get_trending_projects(
        self, language: str = "", time_range: str = "daily"
    ) -> List[Dict[str, Any]]:
        """
        Get GitHub Trending project list

        Args:
            language: Programming language filter, empty means all languages
            time_range: Time range, options: daily, weekly, monthly

        Returns:
            Project list
        """
        url = self.base_url
        if language:
            url += f"/{language}"

        if time_range == "weekly":
            url += "?since=weekly"
        elif time_range == "monthly":
            url += "?since=monthly"

        logger.info(f"Scraping GitHub Trending: {url}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                return self._parse_trending_html(response.text)
        except Exception as e:
            logger.error(f"Error scraping GitHub Trending: {e}")
            return []

    def _parse_trending_html(self, html_content: str) -> List[Dict[str, Any]]:
        """Parse GitHub Trending page HTML"""
        projects = []
        soup = BeautifulSoup(html_content, "html.parser")

        # Find all project containers
        article_tags = soup.select("article.Box-row")

        for article in article_tags:
            try:
                # Extract project name and owner
                repo_link = article.select_one("h2.h3 a")
                if not repo_link:
                    continue

                repo_path = repo_link.get("href", "").strip("/")
                if not repo_path or "/" not in repo_path:
                    continue

                owner, name = repo_path.split("/", 1)

                # Extract description
                description_tag = article.select_one("p")
                description = description_tag.text.strip() if description_tag else None

                # Extract language
                language_tag = article.select_one("span[itemprop='programmingLanguage']")
                language = language_tag.text.strip() if language_tag else None

                # Extract star count
                stars_tag = article.select_one("a.Link--muted:nth-of-type(1)")
                stars_text = stars_tag.text.strip() if stars_tag else "0"
                stars_count = self._parse_count(stars_text)

                # Extract fork count
                forks_tag = article.select_one("a.Link--muted:nth-of-type(2)")
                forks_text = forks_tag.text.strip() if forks_tag else "0"
                forks_count = self._parse_count(forks_text)

                # Create project data
                project = {
                    "name": name,
                    "owner": owner,
                    "full_name": f"{owner}/{name}",
                    "description": description,
                    "repository_url": f"https://github.com/{owner}/{name}",
                    "language": language,
                    "stars_count": stars_count,
                    "forks_count": forks_count,
                    "trending_date": datetime.utcnow(),
                }

                projects.append(project)
            except Exception as e:
                logger.error(f"Error parsing project: {e}")
                continue

        logger.info(f"Found {len(projects)} projects: {[p['full_name'] for p in projects]}")

        return projects

    @staticmethod
    def _parse_count(count_text: str) -> int:
        """Parse numbers, handle cases with k, m and other units"""
        try:
            count_text = count_text.replace(",", "").strip()

            if "k" in count_text.lower():
                return int(float(count_text.lower().replace("k", "")) * 1000)
            elif "m" in count_text.lower():
                return int(float(count_text.lower().replace("m", "")) * 1000000)
            else:
                return int(count_text)
        except (ValueError, TypeError):
            return 0
