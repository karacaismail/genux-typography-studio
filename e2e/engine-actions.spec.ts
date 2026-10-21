import {test,expect} from '@playwright/test';

async function exported(page:import('@playwright/test').Page){
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'JSON indir',exact:true}).click();
 const stream=await(await pending).createReadStream();let text='';for await(const chunk of stream!)text+=chunk.toString();return JSON.parse(text);
}
test('human mobile choice creates separate motor decisions and source changes refresh them without visiting',async({page})=>{
 await page.goto('/?workspace=workflow&ctx=html&device=m320&role=h1');
 await page.getByLabel('Yazı boyutu',{exact:true}).fill('40');
 await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
 await expect(page.getByRole('region',{name:'H2 karar formu',exact:true})).toBeVisible();
 const snapshot=await exported(page);
 expect(Object.keys(snapshot.workflow.reviews)).toHaveLength(1);
 expect(snapshot.workflow.engine.entries['html:mobile:360:h1'].state).toBe('auto');
 expect(snapshot.workflow.profiles['html:mobile:360:h1'].size).toBeGreaterThanOrEqual(40);
 await page.getByRole('navigation',{name:'Bu kümedeki elementler',exact:true}).getByRole('button',{name:'H1',exact:true}).click();
 await page.getByLabel('Yazı boyutu',{exact:true}).fill('44');
 await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
 const updated=await exported(page);
 expect(updated.workflow.profiles['html:mobile:360:h1'].size).toBeGreaterThan(snapshot.workflow.profiles['html:mobile:360:h1'].size);
 expect(Object.keys(updated.workflow.reviews)).toHaveLength(1);
 await page.getByRole('radio',{name:'360 px',exact:true}).click();
 await expect(page.getByRole('radiogroup',{name:'Önizleme teması',exact:true}).locator('..').getByText('Motor kararı',{exact:true})).toBeVisible();
});
test('bulk weak evidence is queued and a valid explicit human choice resolves that queue entry',async({page})=>{
 await page.setViewportSize({width:320,height:850});await page.goto('/?workspace=workflow&ctx=html&device=m320&role=h1');
 await page.getByRole('button',{name:'Bu kümeye uygula',exact:true}).click();
 let snapshot=await exported(page);expect(snapshot.workflow.engine.entries['html:mobile:320:h1'].state).toBe('conflict');expect(Object.keys(snapshot.workflow.reviews)).toHaveLength(0);
 await page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true}).click();
 snapshot=await exported(page);expect(snapshot.workflow.reviews['html:mobile:320:h1']).toBeDefined();
 expect(snapshot.workflow.engine.entries['html:mobile:320:h1'].state).toBe('manual');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
});
test('selected ratio is saved, unsafe size is blocked and real browser word measurement is visible',async({page})=>{
 await page.goto('/?workspace=workflow&ctx=html&device=m320&role=h1');
 await page.getByLabel('Yazı boyutu',{exact:true}).fill('120');
 await expect(page.getByRole('button',{name:'Kararı kaydet ve devam et',exact:true})).toBeDisabled();
 await expect(page.getByText(/Tarayıcı kelime ölçümü:/)).toBeVisible();
 await page.getByLabel('Yazı boyutu',{exact:true}).fill('32');
 await page.getByRole('button',{name:'Kural politikası',exact:true}).click();
 await page.getByLabel('Minimum başlık oranı',{exact:true}).fill('1.333');
 const snapshot=await exported(page);expect(snapshot.workflow.policies.html.headingRatio).toBe(1.333);
 expect(snapshot.version).toBe(2);
});
test('desktop 2560 decision projects to the matching free-editor viewport',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('genux-type-lab-v2',JSON.stringify({format:'genux-typography-decisions',version:2,scope:'changed',contexts:{},ui:{tourDone:true}})));
 await page.setViewportSize({width:1680,height:1000});
 await page.goto('/?workspace=workflow&ctx=html&device=monitor2560&role=h1');
 await page.getByLabel('Yazı boyutu',{exact:true}).fill('64');
 await page.getByRole('button',{name:'Serbest editör',exact:true}).click();
 await expect(page.locator('[data-canvas-root]')).toBeVisible();
 expect(new URL(page.url()).searchParams.get('device')).toBe('d2560');
 await expect(page.locator('.pv-page [data-role=h1]').first()).toHaveCSS('font-size','64px');
 await page.getByRole('button',{name:'Karar akışına dön',exact:true}).click();
 await expect(page.getByRole('radio',{name:'2560 px',exact:true})).toHaveAttribute('aria-checked','true');
});
