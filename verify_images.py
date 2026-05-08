import asyncio
from playwright.async_api import async_playwright
import os

async def verify_images():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Go to the tour page
        await page.goto("http://localhost:8000/computer-history-tour")

        # Wait for the scene to initialize
        await page.wait_for_timeout(3000)

        # Trigger the info panel for the first pioneer
        await page.evaluate("window.showInfo(window.draggableObjects[0].userData)")
        await page.wait_for_timeout(2000)

        # Take a screenshot of the info panel
        await page.screenshot(path="verify_image_loading.png")

        # Check if any image failed to load
        images = await page.query_selector_all("img")
        for img in images:
            is_loaded = await page.evaluate("(img) => img.complete && img.naturalHeight !== 0", img)
            src = await img.get_attribute("src")
            print(f"Image {src} loaded: {is_loaded}")

        await browser.close()

if __name__ == "__main__":
    # Start server in background if not running
    import subprocess
    import time

    server = subprocess.Popen(["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"])
    time.sleep(5)

    try:
        asyncio.run(verify_images())
    finally:
        server.terminate()
