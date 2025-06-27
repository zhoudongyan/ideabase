import openai

from typing import Dict, Any, Optional
import re

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Set OpenAI API configuration
openai.api_key = settings.OPENAI_API_KEY
openai.api_base = settings.OPENAI_BASE_URL


class ProjectAnalyzer:
    """Use LLM to analyze GitHub projects and discover business opportunities and startup ideas"""

    def __init__(self, model_name: Optional[str] = None, output_language: str = "en"):
        self.model_name = model_name or settings.OPENAI_MODEL
        self.output_language = output_language  # Expected output language

    async def analyze_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze project and generate business insights and startup ideas

        Args:
            project_data: Project data including name, description, language, etc.

        Returns:
            Analysis results containing business value, market opportunities, startup ideas, etc.
        """
        try:
            # Extract key information
            project_name = project_data.get("full_name", "")
            description = project_data.get("description", "")
            language = project_data.get("language", "")
            stars = project_data.get("stars_count", 0)

            # Build analysis prompt
            prompt = self._build_analysis_prompt(project_name, description, language, stars)

            # Direct call to OpenAI
            response = await openai.ChatCompletion.acreate(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a professional startup advisor and technical analyst, "
                            "specializing in discovering the business value and startup opportunities "
                            "of technical projects."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1500,
            )

            # Parse response and extract analysis results
            result = self._parse_llm_response(response.choices[0].message.content)
            # Add success status marker and language identifier
            result["analysis_status"] = "success"
            result["language"] = self.output_language
            return result
        except Exception as e:
            logger.error(f"Error analyzing project {project_data.get('full_name')}: {e}")
            # Return default analysis with failure status
            return self._get_default_analysis()

    def _build_analysis_prompt(
        self, project_name: str, description: str, language: str, stars: int
    ) -> str:
        """Build analysis prompt"""
        # Determine language instruction based on output language
        language_instruction = (
            "Please return the analysis in Chinese"
            if self.output_language == "zh"
            else "Please return the analysis in English"
        )

        return f"""
        Analyze the following GitHub project and discover its business value and startup opportunities:
        
        项目名称: {project_name}
        项目描述: {description}
        主要语言: {language}
        Star数量: {stars}
        
        Please provide the following analysis:
        1. Business value: What problem does this project solve? What unique business value does it have?
        2. Market opportunity: What market does this project target? What is the market size and growth potential?
        3. Startup ideas: Based on this project, what startup directions or business models can be developed?
        4. Target audience: Who will be the main users or customers of this project?
        5. Competition analysis: What are the competitors in the market? What is the competitive advantage of this project?
        
        {language_instruction}
        
        Return the analysis results in XML format, please strictly follow the following format:
        
        <analysis>
          <business_value>
            Your analysis content for business value
          </business_value>
          <market_opportunity>
            Your analysis content for market opportunity
          </market_opportunity>
          <startup_ideas>
            Your analysis content for startup ideas
          </startup_ideas>
          <target_audience>
            Your analysis content for target audience
          </target_audience>
          <competition_analysis>
            Your analysis content for competition analysis
          </competition_analysis>
        </analysis>
        """

    def _extract_xml(self, text: str, tag_name: str) -> str:
        """
        Extract XML tag content from text

        Args:
            text: Text containing XML
            tag_name: Tag name to extract

        Returns:
            Extracted XML content
        """
        pattern = rf"<{tag_name}>([\s\S]*?)</{tag_name}>"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return ""

    def _parse_llm_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM response and extract analysis results"""
        try:
            # Clean response text, remove possible code block markers
            cleaned_text = response_text.strip()

            # Try to extract content surrounded by ``` and ```
            code_pattern = r"```(?:xml)?\s*([\s\S]*?)\s*```"
            code_matches = re.findall(code_pattern, cleaned_text)

            if code_matches:
                cleaned_text = code_matches[0].strip()

            # Use regex to extract each section content directly
            result = {}
            sections = [
                "business_value",
                "market_opportunity",
                "startup_ideas",
                "target_audience",
                "competition_analysis",
            ]

            for section in sections:
                content = self._extract_xml(cleaned_text, section)
                if content:
                    result[section] = content
                else:
                    result[section] = self._get_default_field_value(section)

            # Validate results
            result = self._validate_analysis_result(result)

            # Return result dictionary directly without JSON serialization
            return result

        except Exception as e:
            logger.error(f"Error parsing LLM response: {e}")
            # Return default analysis results (already modified to not perform JSON serialization)
            return self._get_default_analysis()

    def _validate_analysis_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate completeness of analysis results, ensure all necessary fields are included"""
        required_fields = [
            "business_value",
            "market_opportunity",
            "startup_ideas",
            "target_audience",
            "competition_analysis",
        ]

        for field in required_fields:
            if field not in result or not result[field]:
                result[field] = self._get_default_field_value(field)

        return result

    def _get_default_field_value(self, field: str) -> str:
        """Get default value for field"""
        if self.output_language == "zh":
            defaults = {
                "business_value": "无法确定该项目的商业价值。",
                "market_opportunity": "市场机会需要进一步评估。",
                "startup_ideas": "暂时没有基于该项目的创业想法。",
                "target_audience": "目标用户需要进一步调研。",
                "competition_analysis": "竞争情况需要深入分析。",
            }
        else:
            defaults = {
                "business_value": "Unable to determine the business value of this project.",
                "market_opportunity": "Market opportunities need further evaluation.",
                "startup_ideas": "No startup ideas based on this project for now.",
                "target_audience": "Target users need further research.",
                "competition_analysis": "Competitive situation needs in-depth analysis.",
            }
        return defaults.get(
            field, "信息不足" if self.output_language == "zh" else "Insufficient information"
        )

    def _get_default_analysis(self) -> Dict[str, str]:
        """Get default analysis results and mark as analysis failed"""
        if self.output_language == "zh":
            result = {
                "business_value": "无法分析该项目的商业价值。",
                "market_opportunity": "无法评估市场机会。",
                "startup_ideas": "无法生成创业想法。",
                "target_audience": "无法确定目标用户。",
                "competition_analysis": "无法分析竞争情况。",
                "analysis_status": "failed",  # Add failure status marker
                "language": "zh",  # Add language identifier
            }
        else:
            result = {
                "business_value": "Unable to analyze the business value of this project.",
                "market_opportunity": "Unable to evaluate market opportunities.",
                "startup_ideas": "Unable to generate startup ideas.",
                "target_audience": "Unable to identify target users.",
                "competition_analysis": "Unable to analyze competitive situation.",
                "analysis_status": "failed",  # Add failure status marker
                "language": "en",  # Add language identifier
            }

        # Return result dictionary directly without JSON serialization
        return result
