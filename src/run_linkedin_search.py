import os
import sys
import json
import asyncio
import logging

# Fix Windows console emoji encoding crash
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

from browser_use.llm.openai.chat import ChatOpenAI
from browser_use import Agent
from browser_use.browser.session import BrowserSession


class _HidePromptLogs(logging.Filter):
    """Keep browser-use status/errors visible without printing model prompts."""

    _PROMPT_MARKERS = (
        "🎯 Task:",
        "LLM prompt:",
        "Messages sent to LLM:",
    )

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(marker in message for marker in self._PROMPT_MARKERS)


def _hide_browser_use_prompts() -> None:
    prompt_filter = _HidePromptLogs()
    service_logger = logging.getLogger("browser_use.agent.service")
    service_logger.addFilter(prompt_filter)

    # browser-use normally attaches its stream handler to the package logger.
    # Filtering the handlers also covers prompt records from future sub-loggers.
    loggers_and_handlers = [
        logging.getLogger("browser_use"),
        logging.getLogger(),
    ]
    for logger in loggers_and_handlers:
        for handler in logger.handlers:
            handler.addFilter(prompt_filter)


_hide_browser_use_prompts()


def _log(message: str) -> None:
    """Write a flushed worker status line so the parent process can show it immediately."""
    print(f"[run_linkedin_search] {message}", file=sys.stderr, flush=True)


# ─────────────────────────────────────────────────────────────────────────────
# LLM + BROWSER SETUP
# ─────────────────────────────────────────────────────────────────────────────

def create_intelliModel_llm() -> ChatOpenAI:
    """Create the OpenAI-compatible model using the shared project configuration."""
    model_name = os.environ.get("LLM_MODEL", "")
    base_url = os.environ.get("MODEL_BASE_URL", "")
    api_key = os.environ.get("LLM_API_KEY", "")
    if not api_key:
        raise RuntimeError("LLM_API_KEY is missing; cannot start the browser-use agent")

    _log(f"Configuring LLM model={model_name} base_url={base_url} (LLM_API_KEY set)")
    return ChatOpenAI(
        model=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=0,
        add_schema_to_system_prompt=True,
        dont_force_structured_output=False,
        max_completion_tokens=8192,
    )


def launch_chrome_with_remote_debugging() -> None:
    """Launch Chrome with remote debugging enabled so browser-use can connect via CDP.
    Reuse an existing CDP endpoint and fail clearly if Chrome never becomes reachable."""
    import subprocess
    import time
    import urllib.request
    from browser_use.browser.chrome import find_chrome_executable

    cdp_url = "http://127.0.0.1:9222/json/version"

    def cdp_is_available() -> bool:
        try:
            with urllib.request.urlopen(cdp_url, timeout=1) as response:
                return response.status == 200
        except Exception:
            return False

    def wait_for_cdp(timeout_seconds: int = 15) -> None:
        deadline = time.monotonic() + timeout_seconds
        _log(f"Waiting for Chrome remote debugging at {cdp_url}")
        while time.monotonic() < deadline:
            if cdp_is_available():
                _log("Chrome remote debugging is ready")
                return
            time.sleep(0.5)
        raise RuntimeError(
            f"Chrome did not expose remote debugging at {cdp_url} within {timeout_seconds} seconds"
        )

    if cdp_is_available():
        _log("Chrome remote debugging is already available; reusing the existing Chrome process")
        return

    _log("Locating Chrome executable")
    chrome_executable_path = find_chrome_executable()
    _log(f"Chrome executable: {chrome_executable_path}")
    chrome_profile_dir     = os.path.abspath("./chrome_profile")
    os.makedirs(chrome_profile_dir, exist_ok=True)
    _log(f"Chrome profile directory: {chrome_profile_dir}")

    chrome_launch_args = [
        chrome_executable_path,
        "--remote-debugging-port=9222",
        f"--user-data-dir={chrome_profile_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ]

    try:
        _log("Launching Chrome with remote debugging enabled on port 9222")
        subprocess.Popen(chrome_launch_args)
    except Exception as chrome_launch_error:
        # A separate Chrome process may already own the profile or port. Verify CDP
        # below instead of hiding the launch error.
        _log(f"Chrome launch command failed: {chrome_launch_error}")

    wait_for_cdp()


def connect_to_running_chrome() -> BrowserSession:
    """Connect to the Chrome instance via CDP at port 9222."""
    _log("Creating browser-use session over Chrome DevTools Protocol")
    browser_session = BrowserSession(cdp_url="http://127.0.0.1:9222")
    _log("browser-use CDP session created")
    return browser_session


async def ensure_linkedin_login() -> None:
    """Check if the user is logged into LinkedIn. If not, wait for them to log in manually.
    
    Uses Playwright to connect to the same Chrome instance via CDP, navigates to
    LinkedIn, and checks the URL. If it contains 'login', 'checkpoint', or 'authwall',
    the script pauses and polls every 5 seconds until the user completes login.
    """
    from playwright.async_api import async_playwright
    import time

    _log("Starting Playwright connection to Chrome over CDP")

    playwright = await async_playwright().start()
    try:
        _log("Connecting Playwright to Chrome at http://127.0.0.1:9222")
        browser = await playwright.chromium.connect_over_cdp("http://127.0.0.1:9222")
        _log(f"Connected to Chrome ({len(browser.contexts)} existing context(s))")

        # Get the first browser context and page (or create one)
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        page = context.pages[0] if context.pages else await context.new_page()
        _log(f"Using browser page: {page.url or 'new page'}")

        # Navigate to LinkedIn feed to check login
        _log("Navigating to https://www.linkedin.com/feed/")
        response = await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=30000)
        _log(f"LinkedIn navigation completed (HTTP {response.status if response else 'unknown'}; URL: {page.url})")
        _log("Waiting 3 seconds for LinkedIn redirects and login state to settle")
        await page.wait_for_timeout(3000)

        current_url = page.url
        login_indicators = ["login", "checkpoint", "authwall", "uas/login", "signup"]
        is_logged_in = not any(indicator in current_url.lower() for indicator in login_indicators)
        _log(f"LinkedIn login check URL: {current_url}")

        if is_logged_in:
            _log("LinkedIn login detected; proceeding with search")
            return

        # ── User is NOT logged in — wait for them ──
        _log("LinkedIn login is required. Log in using the opened Chrome window.")
        _log("The script will poll the current LinkedIn URL every 5 seconds for up to 5 minutes.")

        # Poll every 5 seconds until the user completes login
        max_wait_seconds = 300  # Wait up to 5 minutes
        elapsed = 0
        poll_interval = 5

        while elapsed < max_wait_seconds:
            await page.wait_for_timeout(poll_interval * 1000)
            elapsed += poll_interval

            current_url = page.url
            is_now_logged_in = not any(indicator in current_url.lower() for indicator in login_indicators)
            _log(f"Login poll {elapsed}/{max_wait_seconds}s: {current_url}")

            if is_now_logged_in:
                _log("LinkedIn login successful; proceeding with search")
                return

        raise TimeoutError("LinkedIn login was not detected after 5 minutes")
    finally:
        _log("Closing Playwright CDP connection")
        await playwright.stop()


def read_topics_from_file(topics_file_path: str) -> list[dict]:
    """Read the list of topics from the JSON file written by the TypeScript node."""
    with open(topics_file_path, "r", encoding="utf-8") as topics_file:
        return json.load(topics_file)


# ─────────────────────────────────────────────────────────────────────────────
# TASK BUILDER
# ─────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel, Field
from browser_use.agent.views import ActionResult

class Interaction(BaseModel):
    interaction_type: str = Field(description="'reaction' or 'comment'")
    user_url: str = Field(description="URL of the interacting user")
    username: str = Field(description="Name of the interacting user")
    value: str = Field(description="Reaction type (e.g. 'thumbs_up') or comment text")
    time: str = Field(description="Timestamp or relative time of the interaction")
    comment_reply_to_user_url: str | None = Field(None, description="URL of user being replied to, if any")

class LinkedInPost(BaseModel):
    topicId: str
    postUrl: str
    authorName: str
    authorUrl: str
    jobTitle: str
    company: str
    location: str
    postText: str
    reactionCount: int
    commentCount: int
    discoveredAt: str
    interactions: list[Interaction]

class LinkedInExtraction(BaseModel):
    posts: list[LinkedInPost]

from browser_use import Controller
controller = Controller()

@controller.action(
    'Call this tool when you have extracted the post and interactions. It returns the data to the TypeScript pipeline; it does not write a file. You MUST pass the data in this exact JSON structure.',
    param_model=LinkedInExtraction
)
def return_extracted_json(extraction: LinkedInExtraction):
    # Print the JSON to stdout for TypeScript to parse
    _log(f"Extracted {len(extraction.posts)} LinkedIn post(s); returning JSON to TypeScript")
    print(extraction.model_dump_json())
    return ActionResult(is_done=True, extracted_content=extraction.model_dump_json())

def build_linkedin_search_task(topics: list[dict], min_comments: int = 5, skipped_urls: list[str] | None = None) -> str:
    """Build the browser-use task prompt for searching LinkedIn for all topics."""
    topic_list = "\n".join(
        f'{index + 1}. {topic["name"]}'
        for index, topic in enumerate(topics)
    )

    # Build the skip list section if there are previously rejected posts
    skip_section = ""
    if skipped_urls:
        url_list = "\n".join(f"  - {url}" for url in skipped_urls)
        skip_section = f"""
POSTS TO SKIP (already rejected — you MUST find a DIFFERENT post):
{url_list}
Do NOT collect any post whose URL matches or contains any of the URLs above. Find a completely different post!
"""

    return f"""You are a LinkedIn researcher finding real customer conversations.
    
CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE EXACT STEPS IN ORDER:
1. Use the LinkedIn search bar to search for the topic term.
2. CHECK if the results are already filtered to "Posts". If they are NOT, click the "Posts" filter.
3. Scroll down exactly ONCE to load more posts.
4. Expand ALL hidden comments and replies, then use the `evaluate` tool to return the LinkedIn URLs from the results without changing the page visually. Run this JavaScript:
   `(() => {{ document.querySelectorAll('button').forEach(b => {{ const t = b.innerText?.toLowerCase() || ""; if(t.includes("comment") || t.includes("replies") || t.includes("reply") || t.includes("load more")) b.click(); }}); return [...new Set([...document.querySelectorAll('main a[href*="linkedin.com"]')].map(a => a.href).filter(href => href && !href.includes("hashtag")))]; }})()`
5. Wait 2 seconds for the comments to load.
6. Use the `extract` tool to pull all the post data from the page.
   - Use the URL list returned by the `evaluate` step, together with the page links, to fill `postUrl` and `authorUrl` accurately.
   - Extract EVERY visible comment (username, user_url, and comment text) into the `interactions` array!
7. IMMEDIATELY call `return_extracted_json` with the extracted data.
   - Do NOT judge if the posts match the topic. If you extract ANY posts, you succeeded!

Search LinkedIn for each of the following topics:

{skip_section}
TOPICS TO SEARCH (Keywords only):
{topic_list}

WHEN FINISHED: 
You MUST call the `return_extracted_json` tool with the extracted data. DO NOT USE THE DEFAULT DONE TOOL. DO NOT WRITE TO MARKDOWN FILES. Just call `return_extracted_json`!
"""

async def main():
    if len(sys.argv) < 2:
        print("Usage: python run_linkedin_search.py <topics_json_file> [min_comments]", file=sys.stderr)
        sys.exit(1)

    _log(f"Reading topics from {sys.argv[1]}")
    topics = read_topics_from_file(sys.argv[1])
    
    # Read the minimum comments threshold (default 5)
    min_comments = int(sys.argv[2]) if len(sys.argv) >= 3 else 5
    
    # Read previously rejected post URLs from env (set by TypeScript on retries)
    skipped_urls_raw = os.environ.get("SKIPPED_POST_URLS", "[]")
    skipped_urls = json.loads(skipped_urls_raw)
    
    # 🚨 LIMIT FOR TESTING SO IT DOESN'T TAKE 30 MINS 🚨
    if len(topics) > 1:
        _log(f"Testing limit active: reducing {len(topics)} topics to the first topic")
    topics = topics[:1]
    
    _log(f"Searching LinkedIn for {len(topics)} topic(s) (minimum {min_comments} comments)")
    if skipped_urls:
        _log(f"Skipping {len(skipped_urls)} previously rejected post(s)")

    _log("Preparing Chrome")
    launch_chrome_with_remote_debugging()
    
    # ── Pre-flight: make sure the user is logged into LinkedIn ──
    await ensure_linkedin_login()

    intelliModel_model          = create_intelliModel_llm()
    cdp_browser_session = connect_to_running_chrome()
    search_task         = build_linkedin_search_task(topics, min_comments, skipped_urls)
    _log("Starting browser-use LinkedIn search agent (maximum 10 steps)")

    agent = Agent(
        task=search_task,
        llm=intelliModel_model,
        browser_session=cdp_browser_session,
        controller=controller,
        use_vision=False,
        # The custom finish action is authoritative; the optional post-run judge
        # can re-enter browser/captcha handling after the task already succeeded.
        use_judge=False,
        max_steps=10,
    )

    try:
        raw_agent_output = await agent.run()
    except Exception as agent_error:
        _log(f"browser-use agent failed: {type(agent_error).__name__}: {agent_error}")
        raise
    finally:
        _log("Stopping browser-use session after extraction")
        try:
            await cdp_browser_session.stop()
        except Exception as session_error:
            _log(f"Browser-use session cleanup failed: {type(session_error).__name__}: {session_error}")
    _log(f"browser-use agent finished ({type(raw_agent_output).__name__})")

if __name__ == "__main__":
    asyncio.run(main())
