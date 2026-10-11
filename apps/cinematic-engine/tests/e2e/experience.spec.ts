import {test,expect} from '@playwright/test';

test('initializes and lets the viewer skip boot',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('main')).toBeVisible();
 await expect(page.locator('[data-mode="AUTO_SHOWCASE"]')).toBeVisible();
 await page.getByRole('button',{name:/SKIP INTRO/i}).click();
 await expect(page.locator('[data-scene="PROCESSING"]')).toBeVisible();
});
test('switches between interactive scenes and demo outcomes',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/COMMAND CENTER/}).click();
 await expect(page.locator('[data-scene="COMMAND"]')).toBeVisible();
 await expect(page.locator('[data-mode="INTERACTIVE"]')).toBeVisible();
 await page.screenshot({path:'test-results/command-center-desktop.png',fullPage:true});
 await page.getByRole('button',{name:/TEST ERROR/}).click();
 await expect(page.locator('[data-scene="PROCESSING"]')).toBeVisible();
 await expect(page.locator('[data-phase="ERROR"]')).toBeVisible({timeout:20000});
});
test('supports pause, replay and speed control',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Pause animation/}).click();
 await expect(page.getByRole('button',{name:/Play animation/})).toBeVisible();
 await page.getByRole('button',{name:/Replay sequence/}).click();
 await expect(page.getByRole('button',{name:/Pause animation/})).toBeVisible();
 await page.getByLabel('Playback speed').selectOption('1.5');
 await expect(page.getByLabel('Playback speed')).toHaveValue('1.5');
});
test('provides mobile touch controls without horizontal page scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.getByRole('button',{name:/RUN DEMO/})).toBeVisible();
 await page.screenshot({path:'test-results/mobile-390.png',fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:/AI PROCESSING/}).click();
 await expect(page.locator('[data-scene="PROCESSING"]')).toBeVisible();
});
test('safe 2D mode remains interactive',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Display settings/}).click();
 await page.getByLabel('RENDER QUALITY').selectOption('SAFE_2D');
 await expect(page.getByLabel('Safe two-dimensional reactor')).toBeVisible();
 await page.getByRole('button',{name:/RUN DEMO/}).click();
 await expect(page.locator('[data-scene="PROCESSING"]')).toBeVisible();
});
