import {test,expect} from '@playwright/test';

async function openBuilder(page:import('@playwright/test').Page){
  await page.goto('/worlds/editor');
  await expect(page.locator('.hb-app .hb-stage canvas')).toBeVisible({timeout:60000});
  await expect(page.getByRole('button',{name:'Worlds',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Enter guest workshop'}).click();
  await expect(page.getByRole('button',{name:'Enter my world draft'})).toBeVisible({timeout:60000});
  await page.getByRole('textbox',{name:'Name'}).fill('CTRL Browser Builder');
  await page.getByRole('button',{name:'Enter my world draft'}).click();
  await expect(page.getByRole('button',{name:'Build my world +'})).toBeVisible({timeout:20000});
  await page.getByRole('button',{name:'Build my world +'}).click();
  await expect(page.getByRole('toolbar',{name:'3D world tools'})).toBeVisible();
}
test('World Builder remains inside Astra Habitat with its shared canvas',async({page})=>{
  await openBuilder(page);
  await expect(page.locator('.hb-stage canvas')).toHaveCount(1);
  await expect(page.getByRole('heading',{name:'Choose. Place. Build.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Save & Play'})).toBeVisible();
  await page.screenshot({path:'test-results/habitat-integrated-builder.png',fullPage:true});
});
test('Place, edit, undo, redo and save a model through Habitat backend',async({page})=>{
  await openBuilder(page);
  await page.getByText('Search by name (optional)').click();
  const search=page.getByRole('textbox',{name:'Search world assets'});
  await search.fill('wall');
  const first=page.locator('.hb-advanced-assets button').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.getByRole('combobox',{name:'Placed objects'})).toContainText('wall',{ignoreCase:true});
  await page.getByRole('spinbutton',{name:'Object x'}).fill('4');
  await page.getByRole('spinbutton',{name:'Object x'}).blur();
  await expect(page.getByRole('spinbutton',{name:'Object x'})).toHaveValue('4');
  await page.getByRole('button',{name:'Duplicate'}).click();
  await expect(page.getByRole('combobox',{name:'Placed objects'}).locator('option')).toHaveCount(3);
  await page.getByRole('button',{name:'Undo'}).click();
  await expect(page.getByRole('combobox',{name:'Placed objects'}).locator('option')).toHaveCount(2);
  await page.getByRole('button',{name:'Redo'}).click();
  await expect(page.getByRole('combobox',{name:'Placed objects'}).locator('option')).toHaveCount(3);
  await page.getByRole('button',{name:'Save & Play'}).click();
  await expect(page.getByRole('button',{name:'Build my world +'})).toBeVisible({timeout:20000});
  await expect(page.getByText('2 objects')).toBeVisible();
  await page.getByRole('button',{name:'Build my world +'}).click();
  await expect(page.getByRole('combobox',{name:'Placed objects'}).locator('option')).toHaveCount(3);
});

test('Asset tiers show exactly five holder shelves and safe ETH-only preview',async({page})=>{
 await openBuilder(page);
 await page.getByRole('button',{name:/Signature.*>3M CTRL/}).click();
 await expect(page.locator('.hb-advanced-assets button')).toHaveCount(2);
 await expect(page.locator('.hb-advanced-assets .hb-asset-locked')).toHaveCount(2);
 await page.getByRole('button',{name:/ETH Exclusive/}).click();
 await expect(page.getByText(/Atelier/)).toBeVisible();
 await expect(page.getByText(/Estate/)).toBeVisible();
 await expect(page.getByText(/Masterpiece/)).toBeVisible();
 await expect(page.getByText(/no wallet payment, transaction or fake art listings/i)).toBeVisible();
 await expect(page.getByRole('button',{name:/Buy.*ETH/i})).toHaveCount(0);
});
