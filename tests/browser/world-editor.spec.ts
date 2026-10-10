import {test,expect} from '@playwright/test';

test('catalogue, placement, local persistence, gameplay preview and JSON export',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/worlds/editor');
  await expect(page.getByRole('heading',{name:/World Builder/})).toBeVisible({timeout:60000});
  await expect(page.getByText('991 MODELS + 7 TOOLS')).toBeVisible();
  await expect(page.getByText('LOCAL DRAFT / AUTOSAVED')).toBeVisible();

  const search=page.getByRole('textbox',{name:'Search 3D assets'});
  await search.fill('wall');
  await expect(page.locator('.ctrl-editor-asset').first()).toBeVisible();
  await page.locator('.ctrl-editor-asset').first().click();
  await expect(page.getByText(/Click the ground in the 3D view to place/)).toBeVisible();
  const canvas=page.locator('.ctrl-editor-stage canvas').first();
  await expect(canvas).toBeVisible({timeout:30000});
  await canvas.click({position:{x:(await canvas.boundingBox())!.width/2,y:(await canvas.boundingBox())!.height/2}});
  await expect(page.locator('.ctrl-editor-bottom')).toContainText('1 / 120 OBJECTS');
  await expect(page.getByRole('combobox',{name:'Object behavior tag'})).toBeVisible();
  await page.getByRole('combobox',{name:'Object behavior tag'}).selectOption('toggle-light');

  await page.getByRole('button',{name:'Play test'}).click();
  await expect(page.getByText('PLAY TEST / LOCAL SIMULATION')).toBeVisible();
  await page.getByRole('button',{name:'Exit test'}).click();

  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ctrl:world-editor-v1')||'{}').objects?.length)).toBe(1);
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export'}).click()]);
  expect(download.suggestedFilename()).toBe('ctrl-world-draft.json');
  await page.reload();
  await expect(page.locator('.ctrl-editor-bottom')).toContainText('1 / 120 OBJECTS');
  await expect(page.getByText('991 MODELS + 7 TOOLS')).toBeVisible();
  expect(errors).toEqual([]);
});

test('rejects unsafe imported asset URLs while preserving existing draft',async({page})=>{
  await page.goto('/worlds/editor');
  await expect(page.getByText('LOCAL DRAFT / AUTOSAVED')).toBeVisible({timeout:60000});
  await page.locator('input[type="file"]').setInputFiles({
    name:'unsafe.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({version:1,objects:[{
      id:'unknown-1',assetId:'https://evil.example/object.glb',position:[0,0,0],
      rotationY:0,scale:1,behavior:'none'
    }]}))
  });
  await expect(page.getByRole('alert')).toContainText('approved catalogue');
  await expect(page.locator('.ctrl-editor-bottom')).toContainText('0 / 120 OBJECTS');
});
