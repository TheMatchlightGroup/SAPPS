import subprocess, time, sys
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['npx','vite','preview','--config','qa/vite.qa.config.js','--port','4173','--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(3)
errs=[]
try:
  with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1366,'height':860}); pg=ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    def go(path, shot, wait=800):
        pg.goto('http://localhost:4173'+path); pg.wait_for_timeout(wait); pg.screenshot(path=f'/home/claude/qa_{shot}.png', full_page=True)
    # admin flows
    go('/today','today'); go('/','calendar'); go('/payroll','payroll'); go('/reports','reports')
    go('/invoicing','invoicing')
    pg.click('text=Manassas'); pg.wait_for_timeout(500); pg.screenshot(path='/home/claude/qa_invoice.png', full_page=True)
    pg.hover('.inv-meta'); pg.wait_for_timeout(200); pg.screenshot(path='/home/claude/qa_invoice_hover.png', full_page=True)
    pg.click('.inv-meta-pencil'); pg.wait_for_timeout(200)
    pg.fill('.inv-meta-edit input[type=text] >> nth=0','S26-D35-9A'); pg.fill('.inv-meta-edit input[type=date]','2026-09-15')
    pg.screenshot(path='/home/claude/qa_invoice_edit.png', full_page=True)
    pg.click('text=✓ Done'); pg.wait_for_timeout(300); pg.screenshot(path='/home/claude/qa_invoice_saved.png', full_page=True)
    # change password
    pg.click('text=Change password'); pg.wait_for_timeout(300); pg.screenshot(path='/home/claude/qa_pw.png')
    pg.fill('#cpw-1','short'); pg.click('text=Save new password'); pg.wait_for_timeout(200); pg.screenshot(path='/home/claude/qa_pw_err.png')
    pg.fill('#cpw-1','LongerPass1'); pg.fill('#cpw-2','LongerPass1'); pg.click('text=Save new password'); pg.wait_for_timeout(300); pg.screenshot(path='/home/claude/qa_pw_done.png')
    # examiner view with must_change banner
    pg2=ctx.new_page(); pg2.on('pageerror', lambda e: errs.append('EX '+str(e)))
    pg2.add_init_script('window.__QA_ROLE="examiner"')
    pg2.goto('http://localhost:4173/'); pg2.wait_for_timeout(800); pg2.screenshot(path='/home/claude/qa_examiner.png', full_page=True)
    pg2.click('text=T. Boyd'); pg2.wait_for_timeout(500); pg2.screenshot(path='/home/claude/qa_complete.png', full_page=True)
    b.close()
finally:
  srv.terminate()
print('ERRORS:', *errs, sep='\n') if errs else print('no console/page errors')
