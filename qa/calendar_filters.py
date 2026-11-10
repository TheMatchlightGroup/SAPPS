# Pressure test for the 11/10 calendar additions: agency filter, examinee
# search, and the Suffolk district. Runs against the in-memory fake
# Supabase (qa/fakeSupabase.js). Build first:
#   npx vite build --config qa/vite.qa.config.js
# then: python3 qa/calendar_filters.py
import subprocess, time, sys, datetime
from playwright.sync_api import sync_playwright

URL = 'http://localhost:4174'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
srv = subprocess.Popen(['npx', 'vite', 'preview', '--config', 'qa/vite.qa.config.js', '--port', '4174', '--strictPort'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(3)
errs, fails, passes = [], [], []
today = datetime.date.today()
iso = lambda n: (today + datetime.timedelta(days=n)).isoformat()

def check(cond, msg):
    (passes if cond else fails).append(msg)
    print(('PASS ' if cond else 'FAIL ') + msg)

def new_page(ctx, role=None, tag=''):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(f'{tag} pageerror: {e}'))
    # Google Fonts can't load in the offline sandbox — not an app error.
    pg.on('console', lambda m: errs.append(f'{tag} console: {m.text}') if m.type == 'error' and 'ERR_TUNNEL_CONNECTION_FAILED' not in m.text else None)
    if role:
        pg.add_init_script(f'window.__QA_ROLE="{role}"')
    return pg

def agenda_rows(pg):
    return pg.eval_on_selector_all('.agenda-row', 'els => els.map(e => ({name: e.querySelector(".agenda-name").innerText, meta: e.querySelector(".agenda-meta").innerText, ex: e.querySelector(".agenda-examiner").innerText.trim(), priv: e.classList.contains("private")}))')

def close_modal(pg):
    if pg.locator('.modal-close').count():
        pg.locator('.modal-close').first.click(); pg.wait_for_timeout(200)

def search(pg, text):
    pg.fill('.exam-search-input', '')
    pg.fill('.exam-search-input', text)
    pg.wait_for_timeout(150)
    return pg.eval_on_selector_all('.es-row', 'els => els.map(e => ({name: e.querySelector(".es-name").innerText, date: e.querySelector(".es-date").innerText, past: e.classList.contains("past")}))')

try:
    with sync_playwright() as p:
        b = p.chromium.launch()

        # ================= OFFICE (payroll_admin) =================
        ctx = b.new_context(viewport={'width': 1366, 'height': 900})
        pg = new_page(ctx, tag='ADMIN')
        pg.goto(URL + '/'); pg.wait_for_timeout(900)

        # --- Agency dropdown contents ---
        opts = pg.eval_on_selector_all('select.cal-org option', 'els => els.map(e => e.value)')
        groups = pg.eval_on_selector_all('select.cal-org optgroup', 'els => els.map(e => e.label)')
        check('Suffolk' in opts and 'Newport News' in opts, 'agency dropdown lists Suffolk and Newport News')
        check(opts[0] == '', 'agency dropdown defaults to "All districts & agencies"')
        check('Districts' in groups and 'Federal' in groups, f'agency dropdown is grouped like booking ({groups})')
        check('Arlington 911' in opts and groups[-1].startswith('Other'), 'agency only on older exams shows under "Other"')
        check(len(opts) == len(set(opts)), 'no duplicate agencies in dropdown')
        label = pg.eval_on_selector('select.cal-org option[value="Winchester"]', 'e => e.textContent')
        check('(' in label, f'agency option shows exam count ({label})')

        # --- Baseline in agenda ---
        pg.click('.view-toggle >> text=Agenda'); pg.wait_for_timeout(200)
        all_rows = agenda_rows(pg)
        check(any(r['priv'] for r in all_rows), 'unfiltered agenda includes private exams')

        # --- Filter to Winchester ---
        pg.select_option('select.cal-org', 'Winchester'); pg.wait_for_timeout(200)
        rows = agenda_rows(pg)
        check(len(rows) > 0 and all(r['meta'].startswith('Winchester') for r in rows), f'Winchester filter: agenda shows only Winchester ({len(rows)} rows)')
        check(not any(r['priv'] for r in rows), 'agency filter hides private exams')
        expected = sum(1 for r in all_rows if r['meta'].startswith('Winchester ·'))
        check(len(rows) == expected, f'Winchester filter shows every Winchester exam ({len(rows)}/{expected})')
        banner = pg.inner_text('.cal-only')
        check('Showing only' in banner and 'Winchester' in banner, f'banner names the agency ({banner!r})')
        check('Winchester' in pg.inner_text('.cal-print-btn'), 'print button mentions the agency')
        check('Winchester' in pg.inner_text('.sched-print .sp-title'), 'printed list title names the agency')
        pg.screenshot(path=f'{OUT}/qa_cf_agenda_winchester.png', full_page=True)

        # --- Combined with examiner ---
        pg.select_option('select.cal-show:not(.cal-org)', label='Brad Hughes'); pg.wait_for_timeout(200)
        rows2 = agenda_rows(pg)
        check(all(r['meta'].startswith('Winchester') and 'Brad' in r['ex'] for r in rows2) and len(rows2) > 0, f'Brad + Winchester combine ({len(rows2)} rows)')
        banner = pg.inner_text('.cal-only')
        check('Brad Hughes' in banner and 'at' in banner and 'Winchester' in banner, f'combined banner ({banner!r})')
        check(pg.locator('.cal-only >> text=All examiners').count() == 1 and pg.locator('.cal-only >> text=All agencies').count() == 1, 'combined banner offers both clear buttons')
        check('Brad Hughes · Winchester' in pg.inner_text('.sched-print .sp-title'), 'printed title: "Brad Hughes · Winchester"')

        # --- Persistence across reload ---
        pg.reload(); pg.wait_for_timeout(900)
        check(pg.eval_on_selector('select.cal-org', 'e => e.value') == 'Winchester', 'agency filter remembered after reload')
        pg.click('.cal-only >> text=All agencies'); pg.wait_for_timeout(200)
        check(pg.eval_on_selector('select.cal-org', 'e => e.value') == '', '"All agencies" clears agency only')
        check('Brad Hughes' in pg.inner_text('.cal-only'), 'examiner filter stays after clearing agency')
        pg.click('.cal-only >> text=Show everyone'); pg.wait_for_timeout(200)
        check(pg.locator('.cal-only').count() == 0, 'banner gone with no filters')

        # --- Empty agency ---
        pg.click('.view-toggle >> text=Agenda'); pg.wait_for_timeout(150)
        pg.select_option('select.cal-org', 'Newport News'); pg.wait_for_timeout(200)
        check('No exams match this filter' in pg.inner_text('.cal-empty'), 'agency with no exams shows a clear empty message')
        pg.select_option('select.cal-org', ''); pg.wait_for_timeout(150)

        # --- Month grid + day drawer respect the agency filter ---
        pg.click('.view-toggle >> text=Month'); pg.wait_for_timeout(200)
        pg.select_option('select.cal-org', 'Arlington County Fire & Rescue'); pg.wait_for_timeout(200)
        names = pg.eval_on_selector_all('.month-grid .chip-name', 'els => els.map(e => e.innerText)')
        check(all(not n.startswith('Private') for n in names), 'month grid hides private chips under agency filter')
        check('K. Lane' not in names and 'P. Nguyen' not in names, 'month grid hides other agencies')
        cell = pg.locator(f'.day-cell[data-date="{iso(2)}"]')
        if cell.count():
            cell.click(position={'x': 8, 'y': 8}); pg.wait_for_timeout(300)
            drawer = pg.inner_text('.day-drawer')
            check('R. Diaz' not in drawer and 'A. Stone' in drawer, 'day drawer follows the agency filter')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        pg.select_option('select.cal-org', ''); pg.wait_for_timeout(150)

        # ================= SEARCH =================
        r = search(pg, 'b')
        check(pg.locator('.exam-search-panel').count() == 0, 'one letter does not open results')
        r = search(pg, 'boyd')
        nm = [x['name'] for x in r]
        check(nm.count('T. Boyd') == 2 and 'A. Boyden' in nm, f'"boyd" finds both T. Boyd exams and A. Boyden ({nm})')
        pasts = [x['past'] for x in r]
        check(pasts == sorted(pasts), 'upcoming results list before past ones')
        r = search(pg, 'boyd t')
        check([x['name'] for x in r] == ['T. Boyd', 'T. Boyd'], f'"boyd t" (any order) matches only T. Boyd ({[x["name"] for x in r]})')
        r = search(pg, 'BOYD')
        check(len(r) == 3, 'search ignores case')
        r = search(pg, 'oneil')
        check([x['name'] for x in r] == ["Liam O'Neil-Park"], "punctuation ignored: \"oneil\" finds O'Neil-Park")
        r = search(pg, 'neil park')
        check(len(r) == 1, 'hyphenated name found by its parts')
        r = search(pg, 'zzqx')
        check('No exams for' in pg.inner_text('.exam-search-panel'), 'no-match message')
        r = search(pg, 'whitfield')
        check(len(r) == 2 and not r[0]['past'] and r[1]['past'], 'Whitfield: upcoming Suffolk exam first, past one second')
        check(pg.locator('.es-divider').count() == 1, '"Earlier" divider between upcoming and past')
        pg.screenshot(path=f'{OUT}/qa_cf_search.png')

        # Esc closes the list, a second Esc clears
        search(pg, 'boyd')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(120)
        check(pg.locator('.exam-search-panel').count() == 0, 'Esc closes results')
        check(pg.eval_on_selector('.exam-search-input', 'e => e.value') == 'boyd', 'first Esc keeps the typed name')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(120)
        check(pg.eval_on_selector('.exam-search-input', 'e => e.value') == '', 'second Esc clears the search')

        # Click outside closes the list
        search(pg, 'boyd'); pg.mouse.click(5, 880); pg.wait_for_timeout(120)
        check(pg.locator('.exam-search-panel').count() == 0, 'clicking elsewhere closes results')

        # --- Pick an exam from a previous month while filters would hide it ---
        pg.select_option('select.cal-org', 'Winchester'); pg.wait_for_timeout(150)
        start_month = pg.inner_text('.month-label')
        search(pg, 'boyd t')
        pg.keyboard.press('ArrowDown'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
        target = datetime.date.fromisoformat(iso(-45))
        check(pg.inner_text('.month-label') == target.strftime('%B %Y'), f'Enter on 2nd result jumps to its month ({target.strftime("%B %Y")}, was {start_month})')
        modal_txt = pg.inner_text('.modal') if pg.locator('.modal').count() else ''
        check('T. Boyd' in modal_txt, 'picking a result opens that exam')
        check(pg.eval_on_selector('select.cal-org', 'e => e.value') == '', 'filter that would hide the exam is lifted')
        pg.screenshot(path=f'{OUT}/qa_cf_picked_modal.png')
        close_modal(pg)
        check(pg.locator(f'.day-cell.flash[data-date="{iso(-45)}"]').count() == 1, 'found day pulses on the grid')
        check(pg.locator('.chip.flash').count() == 1, 'found exam chip is outlined')
        pg.screenshot(path=f'{OUT}/qa_cf_flash.png')

        # --- Filter that does NOT hide the exam stays on ---
        pg.select_option('select.cal-org', 'Manassas'); pg.wait_for_timeout(150)
        search(pg, 'ruiz'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        check(pg.eval_on_selector('select.cal-org', 'e => e.value') == 'Manassas', 'filter kept when the found exam matches it')
        close_modal(pg)
        pg.select_option('select.cal-org', ''); pg.wait_for_timeout(150)

        # --- Overflowed chip (6th exam on a busy day) swaps into view ---
        search(pg, 'holt'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        close_modal(pg)
        vis = pg.eval_on_selector_all(f'.day-cell[data-date="{iso(2)}"] .chip-name', 'els => els.map(e => e.innerText)')
        check('F. Holt' in vis, f'found exam hidden behind "+N more" is shown on its day ({vis})')

        # --- Agenda: found row flagged ---
        pg.click('.view-toggle >> text=Agenda'); pg.wait_for_timeout(150)
        search(pg, 'nguyen'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        check(pg.locator('.agenda-row.flash').count() == 1, 'agenda highlights the found row')
        close_modal(pg)
        pg.click('.view-toggle >> text=Month'); pg.wait_for_timeout(150)

        # --- Booking modal lists Suffolk under Districts ---
        pg.click('text=+ New Booking'); pg.wait_for_timeout(300)
        districts = pg.eval_on_selector_all('.modal optgroup[label="Districts"] option', 'els => els.map(e => e.value)')
        check('Suffolk' in districts and 'Newport News' in districts, 'booking dropdown: Suffolk + Newport News under Districts')
        close_modal(pg)

        ctx.close()

        # ================= EXAMINER (Brad) =================
        ctx = b.new_context(viewport={'width': 1366, 'height': 900})
        pg = new_page(ctx, 'examiner', 'EXAMINER')
        pg.goto(URL + '/'); pg.wait_for_timeout(900)
        r = search(pg, 'diaz')
        check(len(r) == 0, "examiner can't find another examiner's exam (R. Diaz is Al's)")
        r = search(pg, 'boyd t')
        check(len(r) == 2, 'examiner finds their own exams across months')
        check(pg.locator('select.cal-org').count() == 1, 'examiner also gets the agency filter')
        opts = pg.eval_on_selector_all('select.cal-org option', 'els => els.map(e => e.textContent)')
        check(not any('Charlottesville (' in o for o in opts), "examiner's counts only reflect their own exams")
        pg.screenshot(path=f'{OUT}/qa_cf_examiner.png', full_page=True)
        ctx.close()

        # ================= TEAM LEAD =================
        ctx = b.new_context(viewport={'width': 1366, 'height': 900})
        pg = new_page(ctx, 'team_lead', 'LEAD')
        pg.goto(URL + '/'); pg.wait_for_timeout(900)
        check(pg.locator('.exam-search-input').count() == 1 and pg.locator('select.cal-org').count() == 1, 'team lead sees search + agency filter')
        ctx.close()

        # ================= PHONE =================
        ctx = b.new_context(**p.devices['iPhone 13'])
        pg = new_page(ctx, tag='PHONE')
        pg.goto(URL + '/'); pg.wait_for_timeout(900)
        sw = pg.evaluate('() => document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(sw <= 0, f'phone: no sideways scroll ({sw}px)')
        search(pg, 'whitfield')
        box = pg.locator('.exam-search-panel').bounding_box()
        check(box and box['x'] >= 0 and box['x'] + box['width'] <= 390 + 1, f'phone: results panel fits on screen ({box})')
        pg.screenshot(path=f'{OUT}/qa_cf_phone_search.png')
        pg.keyboard.press('Escape'); pg.keyboard.press('Escape')
        pg.select_option('select.cal-org', 'Suffolk'); pg.wait_for_timeout(200)
        sw = pg.evaluate('() => document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(sw <= 0, f'phone: no sideways scroll with a long agency banner ({sw}px)')
        pg.screenshot(path=f'{OUT}/qa_cf_phone_filter.png', full_page=True)
        ctx.close()
        b.close()
finally:
    srv.terminate()

print(f'\n{len(passes)} passed, {len(fails)} failed')
for f in fails: print('  FAIL:', f)
print('ERRORS:', *errs, sep='\n') if errs else print('no console/page errors')
sys.exit(1 if fails or errs else 0)
