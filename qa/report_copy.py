import subprocess, time
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['npx','vite','preview','--config','qa/vite.qa.config.js','--port','4174','--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(3)
errs=[]; res=[]
def check(name, cond):
  res.append(('PASS' if cond else 'FAIL')+'  '+name); print(res[-1], flush=True)
URL='http://localhost:4174'
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    def page(role):
      ctx=b.new_context(viewport={'width':1366,'height':860}); pg=ctx.new_page()
      pg.on('pageerror', lambda e: errs.append(role+' '+str(e)))
      pg.on('console', lambda m: errs.append(role+' '+m.text) if m.type=='error' else None)
      pg.on('dialog', lambda d: d.accept())
      if role!='admin': pg.add_init_script(f'window.__QA_ROLE="{role}"')
      return ctx, pg
    for role in ['examiner','admin','team_lead']:
      ctx,pg=page(role)
      pg.goto(URL+'/reports'); pg.wait_for_timeout(900)
      pg.click('.rp-row:has-text("J. Fairfax")'); pg.wait_for_timeout(1000)
      body=pg.inner_text('body')
      check(f'{role}: colleague report opens from library', 'deleted' not in body and 'no longer' not in body and 'Lee wrote this' in pg.content())
      if role=='examiner':
        check('examiner: colleague report is read-only', 'Read-only' in body)
        check('examiner: no copy button on colleague report', 'Copy from a previous report' not in body)
      pg.screenshot(path=f'/home/claude/qa_rc_{role}_colleague.png', full_page=True)
      ctx.close()
    # Own exam, fresh report: type -> autosave creates draft -> copy still offered
    for role, exam in [('examiner','e8'), ('admin','e8')]:
      ctx,pg=page(role)
      pg.goto(URL+f'/reports/exam/{exam}'); pg.wait_for_timeout(1000)
      ea=pg.locator('button:has-text("Edit anyway"), button:has-text("Start it anyway")')
      if ea.count(): ea.first.click(); pg.wait_for_timeout(300)
      check(f'{role}: copy button on a new report', pg.locator('text=Copy from a previous report…').count()==1)
      pg.locator('textarea.rs-section-body:not([readonly])').first.fill('Started typing before remembering the old report.')
      pg.wait_for_timeout(4200)
      saved='All changes saved' in pg.inner_text('body')
      check(f'{role}: autosave created a draft', saved)
      check(f'{role}: copy button STILL offered after autosave (the bug)', pg.locator('text=Copy from a previous report…').count()==1)
      pg.click('text=Copy from a previous report…'); pg.wait_for_timeout(400)
      pg.fill('.re-panel input[type=search]','Boyd'); pg.wait_for_timeout(700)
      pg.screenshot(path=f'/home/claude/qa_rc_{role}_panel.png', full_page=True)
      pg.click('.re-panel .rp-row >> nth=0'); pg.wait_for_timeout(1200)
      vals=pg.evaluate("[...document.querySelectorAll('textarea')].map(t=>t.value).join('|')")
      check(f'{role}: old report text copied in', "Brad's finished text" in vals)
      hdr=pg.evaluate("[...document.querySelectorAll('input')].map(i=>i.value).join('|')")
      check(f'{role}: this exam\'s name kept', 'Dana Whitfield' in hdr)
      # History holds the pre-copy text
      check(f'{role}: History available after copy', pg.locator('text=History').count()>=1)
      pg.screenshot(path=f'/home/claude/qa_rc_{role}_copied.png', full_page=True)
      ctx.close()
    # Final report: copy hidden
    ctx,pg=page('examiner'); pg.goto(URL+'/reports/exam/e1'); pg.wait_for_timeout(1000)
    check('examiner: copy hidden on a FINAL report', pg.locator('text=Copy from a previous report…').count()==0)
    # Draft report already existing: copy offered
    pg.goto(URL+'/reports/exam/e2'); pg.wait_for_timeout(1000)
    check('examiner: copy offered on an existing DRAFT', pg.locator('text=Copy from a previous report…').count()==1)
    ctx.close(); b.close()
finally:
  srv.terminate()
print(*res, sep='\n'); print('ERRORS:', *errs, sep='\n') if errs else print('no console/page errors')
