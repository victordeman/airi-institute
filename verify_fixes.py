import asyncio
from playwright.async_api import async_playwright
import os

async def verify_fixes():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await page.goto("http://localhost:8000/computer-history-tour")
            await asyncio.sleep(8)
            await page.screenshot(path="fix_3d_scene.png")

            await page.evaluate("""
                () => {
                    const pioneer = window.draggableObjects.find(obj => obj.userData.data && obj.userData.data.id === 'babbage');
                    if (pioneer) window.showInfo(pioneer.userData);
                }
            """)
            await asyncio.sleep(2)
            await page.screenshot(path="fix_info_panel.png")

            panel_text_color = await page.evaluate("""
                () => {
                    const el = document.querySelector('#ai-panel-content .description-text');
                    return el ? window.getComputedStyle(el).color : 'NOT FOUND';
                }
            """)
            print(f"Panel text color: {panel_text_color}")

            img_src = await page.evaluate("""
                () => {
                    const img = document.querySelector('#ai-panel-content img');
                    return img ? img.src : 'NOT FOUND';
                }
            """)
            print(f"Panel image source: {img_src}")

        except Exception as e:
            print(f"Error during verification: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_fixes())
