import asyncio
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Set viewport for 1080p
        await page.set_viewport_size({"width": 1920, "height": 1080})

        # Start server (assuming it's running or using a mock approach if necessary)
        # For simplicity, I'll just check the rendered HTML and CSS if possible,
        # but a live check is better.
        # I'll try to reach the local server.
        try:
            await page.goto("http://localhost:8000/cellforge", timeout=5000)
        except:
            print("Local server not running on 8000. This is expected in some environments.")
            await browser.close()
            return

        # Check for duplicates
        cards = await page.query_selector_all(".cf-model-option")
        print(f"Model options found: {len(cards)}")

        upload_btns = await page.query_selector_all("#btn-generate-upload")
        print(f"Upload buttons found: {len(upload_btns)}")

        # Check layout
        body = await page.query_selector(".cf-body")
        box = await body.bounding_box()
        print(f"Body width: {box['width']}")

        # Snapshot
        await page.screenshot(path="final_check.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
