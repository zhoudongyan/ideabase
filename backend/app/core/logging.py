from loguru import logger
import sys
import os

# Remove default handler
logger.remove()

# Set log level
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Add console handler
logger.add(
    sys.stderr,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} - {message}",
    level=LOG_LEVEL,
    colorize=True,
)

# Add file handler
log_file = os.getenv("LOG_FILE", "logs/ideabase.log")
os.makedirs(os.path.dirname(log_file), exist_ok=True)
logger.add(
    log_file,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} - {message}",
    level=LOG_LEVEL,
    rotation="10 MB",
    compression="zip",
    retention="10 days",
)


def get_logger(name=None):
    """Get logger with module name"""
    return logger.bind(name=name or "ideabase")
