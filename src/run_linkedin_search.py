import os
import sys
import json
import asyncio

# Fix Windows console emoji encoding crash
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

from browser_use.llm.openai.chat import ChatOpenAI
from browser_use import Agent
from browser_use.browser.session import BrowserSession


# ─────────────────────────────────────────────────────────────────────────────
# LLM + BROWSER SETUP
# ─────────────────────────────────────────────────────────────────────────────

def create_intelliModel_llm() -> ChatOpenAI:
    """Creates the IntelliModel 2.5 model configured for the IntelliDesign API endpoint."""
    return ChatOpenAI(
        model="intelliModel-v2.5",
        api_key=os.environ.get("LLM_API_KEY", ""),
        base_url="https://api.xiaomiintelliModel.com/v1",
        temperature=0,
        add_schema_to_system_prompt=True,
        dont_force_structured_output=False,
        max_completion_tokens=8192,
    )


def launch_chrome_with_remote_debugging() -> None:
    """Launch Chrome with remote debugging enabled so browser-use can connect via CDP.
    If Chrome is already running on port 9222 this is a no-op (Popen will fail silently)."""
    import subprocess
    import time
    from browser_use.browser.chrome import find_chrome_executable

    chrome_executable_path = find_chrome_executable()
    chrome_profile_dir     = os.path.abspath("./chrome_profile")
    os.makedirs(chrome_profile_dir, exist_ok=True)

    chrome_launch_args = [
        chrome_executable_path,
        "--remote-debugging-port=9222",
        f"--user-data-dir={chrome_profile_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ]

    try:
        subprocess.Popen(chrome_launch_args)
        time.sleep(3)  # Give Chrome time to open the remote-debugging port
        print("[run_linkedin_search] Chrome launched on port 9222", file=sys.stderr)
    except Exception as chrome_launch_error:
        # Chrome may already be running — that is fine, just continue
        print(f"[run_linkedin_search] Chrome already running or launch skipped: {chrome_launch_error}", file=sys.stderr)


def connect_to_running_chrome() -> BrowserSession:
    """Connect to the Chrome instance via CDP at port 9222."""
    return BrowserSession(cdp_url="http://localhost:9222")


async def ensure_linkedin_login() -> None:
    """Check if the user is logged into LinkedIn. If not, wait for them to log in manually.
    
    Uses Playwright to connect to the same Chrome instance via CDP, navigates to
    LinkedIn, and checks the URL. If it contains 'login', 'checkpoint', or 'authwall',
    the script pauses and polls every 5 seconds until the user completes login.
    """
    from playwright.async_api import async_playwright
    import time

    print("\n🔐 Checking LinkedIn login status...", file=sys.stderr)

    playwright = await async_playwright().start()
    browser = await playwright.chromium.connect_over_cdp("http://localhost:9222")
    
    # Get the first browser context and page (or create one)
    context = browser.contexts[0] if browser.contexts else await browser.new_context()
    page = context.pages[0] if context.pages else await context.new_page()

    # Navigate to LinkedIn feed to check login
    await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(3000)  # Give LinkedIn time to redirect if not logged in

    current_url = page.url
    login_indicators = ["login", "checkpoint", "authwall", "uas/login", "signup"]
    
    is_logged_in = not any(indicator in current_url.lower() for indicator in login_indicators)

    if is_logged_in:
        print("✅ LinkedIn login detected — proceeding with search!", file=sys.stderr)
        await playwright.stop()
        return

    # ── User is NOT logged in — wait for them ──
    print("\n" + "=" * 60, file=sys.stderr)
    print("⚠️  You are NOT logged into LinkedIn!", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print("👉 A Chrome window has opened. Please log into LinkedIn.", file=sys.stderr)
    print("👉 Once you see your LinkedIn feed, the script will", file=sys.stderr)
    print("   automatically detect the login and continue.", file=sys.stderr)
    print("=" * 60 + "\n", file=sys.stderr)

    # Poll every 5 seconds until the user completes login
    max_wait_seconds = 300  # Wait up to 5 minutes
    elapsed = 0
    poll_interval = 5

    while elapsed < max_wait_seconds:
        await page.wait_for_timeout(poll_interval * 1000)
        elapsed += poll_interval

        current_url = page.url
        is_now_logged_in = not any(indicator in current_url.lower() for indicator in login_indicators)

        if is_now_logged_in:
            print("✅ LinkedIn login successful — proceeding with search!", file=sys.stderr)
            await playwright.stop()
            return

        minutes_remaining = (max_wait_seconds - elapsed) // 60
        seconds_remaining = (max_wait_seconds - elapsed) % 60
        print(f"⏳ Waiting for login... ({minutes_remaining}m {seconds_remaining}s remaining)", file=sys.stderr)

    # Timed out
    print("❌ Login timeout — no LinkedIn login detected after 5 minutes.", file=sys.stderr)
    print("   Please log in and run the script again.", file=sys.stderr)
    await playwright.stop()
    sys.exit(1)


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
    'Call this tool when you have extracted the post and interactions. You MUST pass the data in this exact JSON structure.',
    param_model=LinkedInExtraction
)
def finish_and_save_json(extraction: LinkedInExtraction):
    # Print the JSON to stdout for TypeScript to parse
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
4. Expand ALL hidden comments and replies, AND expose all hidden URLs as text. You MUST use the `evaluate` tool to run this exact JS code:
   `document.querySelectorAll('button').forEach(b => {{ const t = b.innerText?.toLowerCase() || ""; if(t.includes("comment") || t.includes("replies") || t.includes("reply") || t.includes("load more")) b.click(); }}); document.querySelectorAll('a').forEach(a => {{ if(a.href && a.href.includes("linkedin.com") && !a.href.includes("hashtag")) {{ const p = document.createElement("span"); p.innerText = " [URL: " + a.href + "] "; p.style.color = "red"; p.style.fontWeight = "bold"; a.parentNode.insertBefore(p, a.nextSibling); }} }});`
5. Wait 2 seconds for the comments to load.
6. Use the `extract` tool to pull all the post data from the page.
   - Because you ran the JS in step 4, the URLs are now visibly written on the screen as `[URL: https...]`! You have NO EXCUSE to miss the `postUrl` or `authorUrl`! Grab them directly from the red text!
   - Extract EVERY visible comment (username, user_url, and comment text) into the `interactions` array!
7. IMMEDIATELY call `finish_and_save_json` with the extracted data.
   - Do NOT judge if the posts match the topic. If you extract ANY posts, you succeeded!

Search LinkedIn for each of the following topics:

{skip_section}
TOPICS TO SEARCH (Keywords only):
{topic_list}

WHEN FINISHED: 
You MUST call the `finish_and_save_json` tool with the extracted data. DO NOT USE THE DEFAULT DONE TOOL. DO NOT WRITE TO MARKDOWN FILES. Just call `finish_and_save_json`!
"""

async def main():
    if len(sys.argv) < 2:
        print("Usage: python run_linkedin_search.py <topics_json_file> [min_comments]", file=sys.stderr)
        sys.exit(1)

    topics = read_topics_from_file(sys.argv[1])
    
    # Read the minimum comments threshold (default 5)
    min_comments = int(sys.argv[2]) if len(sys.argv) >= 3 else 5
    
    # Read previously rejected post URLs from env (set by TypeScript on retries)
    skipped_urls_raw = os.environ.get("SKIPPED_POST_URLS", "[]")
    skipped_urls = json.loads(skipped_urls_raw)
    
    # 🚨 LIMIT FOR TESTING SO IT DOESN'T TAKE 30 MINS 🚨
    topics = topics[:1] 
    
    print(f"[run_linkedin_search] Searching LinkedIn for {len(topics)} topics (min {min_comments} comments)...", file=sys.stderr)
    if skipped_urls:
        print(f"[run_linkedin_search] Skipping {len(skipped_urls)} previously rejected post(s)", file=sys.stderr)

    launch_chrome_with_remote_debugging()
    
    # ── Pre-flight: make sure the user is logged into LinkedIn ──
    await ensure_linkedin_login()
    
    intelliModel_model          = create_intelliModel_llm()
    cdp_browser_session = connect_to_running_chrome()
    search_task         = build_linkedin_search_task(topics, min_comments, skipped_urls)

    agent = Agent(
        task=search_task,
        llm=intelliModel_model,
        browser_session=cdp_browser_session,
        controller=controller,
        use_vision=False,
        max_steps=10,
    )

    raw_agent_output = await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
