// ---- Company (from SAPPS letterhead) ----
export const COMPANY = {
  name: 'Smith & Associates Pre-Employment and Polygraph Services',
  addressLines: ['10875 Main Street, Suite 111', 'Fairfax, VA 22030'],
  phones: '(703) 618-2400  ~  (571) 242-7795',
}

// ---- Examiner roster (internal to SAPPS) ----
// Reference data. Examiners appear in the booking dropdown once they sign in
// (profile auto-created as 'examiner') and are marked active.
export const EXAMINERS = [
  { name: 'Robert Smith', email: 'rjsmithpolygraph@gmail.com' },
  { name: 'Cris Smith', email: 'crissmithpolygraph@gmail.com' },
  { name: 'Marc Mitchell', email: 'marcbmitchell@gmail.com' },
  { name: 'Nate Perkins', email: 'nate.perkins@polyassessment.com' },
  { name: 'Brad Hughes', email: 'bdhhwt@gmail.com' },
  { name: 'Kat Manning', email: 'polygraphprofessionalservices@gmail.com' },
  { name: 'Myron "Al" Moore', email: 'amoorepoly@yahoo.com' }, // displays as "Al Moore" in-app
]

// ---- Booking org dropdown (grouped) ----
// Names corrected to match the client contact sheet (Loudoun Fire & Rescue,
// Loudoun County Sheriff's Office, Gavin de Becker, Clinical Forensics
// Services, Fairfax County Public Safety Communications*, Prince William 911). New orgs added.
// * FCPSC is the Fairfax County Dept. of Public Safety Communications (911) —
//   confirmed by SAPPS's 10/12 agency list (it had briefly read "Fire & Rescue").
export const ORGANIZATIONS = {
  Districts: [
    'Richmond', 'Charlottesville', 'Arlington', 'Winchester', 'Staunton',
    'Lynchburg', 'Roanoke', 'Abingdon', 'Roanoke Headquarters', 'Bedford',
    'Martinsville', 'Chesterfield', 'Radford', 'Fairfax', 'Henrico',
    'Manassas', 'Alexandria', 'Rocky Mount', 'Fincastle', 'Tazewell',
    'Newport News',
  ],
  'Private Clients & Organizations': [
    'Center for Clinical and Forensic Services',
    'Clinical Forensics Services',
    'Frank Psychology & Forensics, LLC (Dr. Susan Frank)',
    'Trauma And Hope',
    'Gavin de Becker',
    'Loudoun County Fire & Rescue',
    "Loudoun County Sheriff's Office",
    'Alexandria Dept. of Emergency Communication',
    'Alexandria Fire Department',
    'Arlington County Fire & Rescue',
    'Arlington County Public Safety Communication & Emergency Management',
    'Arlington Police Department',
    'Prince William County Fire & Rescue',
    'Prince William 911',
    'Prince William Adult Detention Center',
    'Prince William Office of Criminal Justice Services',
    'Town of Louisa Police Department',
    'Manassas Park Fire & Rescue',
    'Purcellville Police Department',
    'Leesburg Police Department',
    'Fairfax County Department of Public Safety Communications',
    'Fairfax City Police Department',
    'Fairfax City Fire Department',
    "Fairfax County Sheriff's Office",
    // One Fauquier entry: Fire & Rescue, Schools, etc. all bill to the county (per Cris, 9/29).
    'Fauquier County Government',
  ],
  // Added 10/15 per Cris. Only Brad, Rob and Cris run these (see
  // ORG_DIRECTORY.examiners); the Exam Amount varies per exam.
  Federal: [
    'United States Probation Office',
  ],
  'State & Treatment Programs': [
    'Sex Offender Treatment Program',
    'Sex Offender Programs & Monitoring Unit',
    'Virginia Center for Behavioral Rehabilitation',
  ],
}

// ---- Exam types with SAPPS's official invoicing abbreviations ----
export const TEST_TYPES = [
  { value: 'Pre-Employment', abbr: 'PE' },
  { value: 'Maintenance', abbr: 'MAIN' },
  { value: 'Monitoring', abbr: 'MONT' },
  { value: 'Sexual History', abbr: 'SH' },
  { value: 'Sexual History Retest', abbr: 'SH-R' },
  { value: 'Specific Issue', abbr: 'SI' },
  { value: 'Instant Offense', abbr: 'IO' },
  { value: 'Probation No Show', abbr: 'P-NS' },
  { value: 'Pre-Employment No Show', abbr: 'PE-NS' },
]

// Billing defaults auto-filled when these types are selected at completion
// (all fields stay editable by Tier 2+). Probation no-shows bill $0.00 — the
// examiner collects the no-show fee directly. Pre-employment no-shows bill
// the agency a flat $100 Exam Amount. Every other type starts at the $225
// default Exam Amount (DEFAULT_EXAM_AMOUNT in lib/amounts.js).
export const TEST_TYPE_BILLING_DEFAULTS = {
  'Probation No Show': { exam_amount: '0', copay_amount: '0', amount_due_examiner: '0', amount_due_sapps: '0' },
  'Pre-Employment No Show': { exam_amount: '100', copay_amount: '0', amount_due_examiner: '0', amount_due_sapps: '0' },
}

// Probation no-shows produce no written report — exempt from the report
// requirement and the week-submit gate.
export const NO_REPORT_TYPES = ['Probation No Show']

// Pre-employment no-shows (10/23/2026, per Cris): the agencies now want a
// written No-Show Report, so these use the "Pre-Employment No Show Report"
// template and count toward the report requirement like any other exam.
// Exams dated before the go-live date stay optional, so no-shows already
// on the calendar don't suddenly block a week.
export const NO_SHOW_REPORT_TYPES = ['Pre-Employment No Show']
export const NO_SHOW_REPORT_REQUIRED_FROM = '2026-10-23'

/** Does this exam need a written report before its week goes to payroll? */
export const reportRequired = (exam) => {
  if (!exam || NO_REPORT_TYPES.includes(exam.exam_type)) return false
  if (NO_SHOW_REPORT_TYPES.includes(exam.exam_type)) return (exam.exam_date || '') >= NO_SHOW_REPORT_REQUIRED_FROM
  return true
}
export const TEST_TYPE_ABBR = Object.fromEntries(TEST_TYPES.map((t) => [t.value, t.abbr]))

// Test types that share one report template (mirrors report_templates.test_types).
// Switching within a group keeps the same report sections.
const TEMPLATE_GROUP = {
  Maintenance: 'maint', Monitoring: 'maint',
  'Sexual History': 'sh', 'Sexual History Retest': 'sh',
}
export const sameReportTemplate = (a, b) => a === b || (TEMPLATE_GROUP[a] && TEMPLATE_GROUP[a] === TEMPLATE_GROUP[b])

// ---- Org directory: invoice code + Bill-To address + billing emails ----
// `billTo`  = printed in the Bill To block, upper left of the invoice
//             (first line = agency name, then street lines). Also pre-fills
//             the Agency Address on reports.
// `emails`  = invoice recipients ("Bill To" on SAPPS's agency list).
// `servicing: false` = account the sheet marks as not currently active.
//
// 10/12/2026 — addresses + billing emails updated from SAPPS's Agency List.
// Emails were MERGED: new addresses added, existing ones kept, except where
// the old entry was a typo of a new one (finance@ccfs.net, "loundoun",
// "manasses"). Obvious typos on the list were corrected (noted inline).
// PO numbers from the list are seeded into org_pos by RUN_ME_20261012.sql.
export const ORG_DIRECTORY = {
  Richmond: { code: 'D1' },
  Charlottesville: {
    code: 'D9',
    billTo: ['Charlottesville Probation & Parole (D9)', '750 Harris St., Suite 202', 'Charlottesville, VA 22903'],
    emails: ['jill.madison@vadoc.virginia.gov', 'district09@vadoc.virginia.gov'],
  },
  Arlington: { code: 'D10' },
  Winchester: {
    code: 'D11',
    billTo: ['Winchester Probation & Parole (D11)', '100 Premier Pl., Suite 100', 'Winchester, VA 22602'],
    emails: ['Kristen.haight@vadoc.virginia.gov'],
  },
  Staunton: { code: 'D12' },
  Lynchburg: { code: 'D13' },
  Roanoke: {
    code: 'D15',
    billTo: ['Roanoke Probation & Parole (D15)', '305 Electric Rd.', 'Roanoke, VA 24153'],
    emails: ['brandi.britton@vadoc.virginia.gov', 'shawn.trimble@vadoc.virginia.gov'],
  },
  Abingdon: {
    code: 'D17',
    billTo: ['Abingdon Probation & Parole (D17)', '26478 Hillman Highway', 'Abingdon, VA 24210'],
    emails: ['Olivia.McDonald@vadoc.virginia.gov', 'marsha.wade@vadoc.virginia.gov'],
  },
  'Roanoke Headquarters': { code: 'SOPC-D15' },
  Bedford: {
    code: 'D20',
    // List had zip "2452" — Bedford is 24523.
    billTo: ['Bedford Probation & Parole (D20)', '842 Ole Turnpike Dr.', 'Bedford, VA 24523'],
    emails: ['crystal.adkins@vadoc.virginia.gov', 'district20@vadoc.virginia.gov'],
  },
  Martinsville: { code: 'D22' },
  Chesterfield: { code: 'D27' },
  Radford: {
    code: 'D28',
    billTo: ['Radford Probation & Parole (D28)', '2003 West Main St.', 'Radford, VA 24141'],
    emails: [
      'juan.castillo@vadoc.virginia.gov',
      'travis.cassell@vadoc.virginia.gov',
      'rachael.mullins@vadoc.virginia.gov',
      'simon.jones@vadoc.virginia.gov',
      'casey.bryant@vadoc.virginia.gov',
    ],
  },
  Fairfax: {
    code: 'D29',
    billTo: ['Fairfax Probation & Parole (D29)', '10680 Main St., 3rd Floor', 'Fairfax, VA 22030'],
    emails: [
      'Joseph.samluk@vadoc.virginia.gov',
      'lauren.evans@vadoc.virginia.gov',
      'Kathie.smith@vadoc.virginia.gov',
      'district29@vadoc.virginia.gov',
      'Zubin.byramjee@vadoc.virginia.gov',
    ],
  },
  Henrico: { code: 'D32' },
  Manassas: {
    code: 'D35',
    billTo: ['Manassas Probation & Parole (D35)', '9309 Center St., Suite 204', 'Manassas, VA 20110'],
    emails: [
      'Caitlin.marsh@vadoc.virginia.gov',
      'rr-D35SoBudget@vadoc.virginia.gov',
      'Samson.Presley@vadoc.virginia.gov',
      'Brittany.evans@vadoc.virginia.gov',
    ],
  },
  Alexandria: {
    code: 'D36',
    billTo: ['Alexandria Probation & Parole (D36)', '4740 Eisenhower Ave.', 'Alexandria, VA 22304'],
    emails: [
      'Rebecca.harrison@vadoc.virginia.gov',
      'Caitlin.sweeney@vadoc.virginia.gov',
      'Jillian.mackling@vadoc.virginia.gov',
      'William.cassani@vadoc.virginia.gov',
      'Deborah.jones@vadoc.virginia.gov',
      'Greta.Trotter@vadoc.virginia.gov',
    ],
  },
  'Rocky Mount': {
    code: 'D37',
    billTo: ['Rocky Mount Probation & Parole (D37)', '155 Grassy Hill Road', 'Rocky Mount, VA 24151'],
    emails: [
      'Tiffany.schara@vadoc.virginia.gov',
      'Andrew.martin@vadoc.virginia.gov',
      'Kaitlyn.potter@vadoc.virginia.gov',
      'Avita.crawford@vadoc.virginia.gov',
    ],
  },
  Fincastle: {
    code: 'D40',
    // P.O. Box kept from the earlier Bill-To (the new list omits it).
    billTo: ['Fincastle Probation & Parole (D40)', '20 South Roanoke St.', 'P.O. Box 588', 'Fincastle, VA 24090'],
    emails: ['m.brown@vadoc.virginia.gov', 'carlie.cutright@vadoc.virginia.gov'],
  },
  Tazewell: { code: 'D43' },
  'Newport News': {
    code: 'D19',
    billTo: ['Newport News Probation & Parole (D19)', '250 Warwick Blvd.', 'Newport News, VA 23607'],
    emails: ['Carmen.Rodriguez@vadoc.virginia.gov', 'Maxine.lee@vadoc.virginia.gov'],
  },

  'Center for Clinical and Forensic Services': {
    code: 'CCFS',
    billTo: ['Center for Clinical & Forensic Services', '10505 Judicial Dr., Suite 100', 'Fairfax, VA 22030'],
    // finance@ccfs.net (old typo) replaced by finance@ccfsinc.net.
    emails: ['finance@ccfsinc.net', 'celenagates@ccfsinc.net', 'operations@ccfsinc.net'],
  },
  'Clinical Forensics Services': {
    code: 'CFS',
    billTo: ['Clinical Forensics Services', '1300 Harbor Center Dr., Suite 302', 'Woodbridge, VA 22192'],
    emails: ['drhardenburg@cfsvirginia.com'],
  },
  'Frank Psychology & Forensics, LLC (Dr. Susan Frank)': { code: 'FP&F' },
  'Trauma And Hope': {
    code: 'TAH',
    billTo: ['Trauma & Hope', '9028 Prince William St., Unit E', 'Manassas, VA 20110'],
    emails: ['dpatel@traumaandhope.com'],
  },
  'Gavin de Becker': {
    code: 'GDBA',
    servicing: false,
    emails: ['GDBA_innvoicecapture@concursolutions.com', 'shassanbrown@gdba.com'],
  },
  'Loudoun County Fire & Rescue': {
    code: 'LCFR',
    // List says "Loudoun City" — it's the county.
    billTo: ['Loudoun County Fire & Rescue', '801 Sycolin Road SE', 'P.O. Box 7100', 'Leesburg, VA 20177'],
    emails: [
      'Timothy.Taheri@loudoun.gov',
      'Michael.reilly@loudoun.gov',
      'DEPT-FRSERV-LCFR-INVOICES@loudoun.gov', // "loundoun" typo fixed — list confirms loudoun.gov
    ],
  },
  "Loudoun County Sheriff's Office": {
    code: 'LCSO',
    servicing: false,
    emails: ['Colin.whittington@loudoun.gov', 'emir.bekric@loudoun.gov'],
  },
  'Alexandria Dept. of Emergency Communication': {
    code: 'ADEC',
    billTo: ['Alexandria Dept. of Emergency Communication (911)', '300 Wheeler Ave.', 'Alexandria, VA 22304'],
    // Tiffany.Joy is listed under Alexandria Fire on the new sheet; kept here
    // too (merge). Remove her if she shouldn't get 911 invoices.
    emails: ['JoAnn.Maldonado@alexandriava.gov', 'Tiffany.Joy@alexandriava.gov'],
  },
  'Alexandria Fire Department': {
    code: 'AFD', // PROVISIONAL code — confirm
    billTo: ['Alexandria Fire Department', '900 Second St.', 'Alexandria, VA 22314'],
    emails: ['Tiffany.Joy@alexandriava.gov'],
  },
  'Arlington County Fire & Rescue': {
    code: 'ACFR', // PROVISIONAL code — not on the contact sheet; confirm against contracts
    billTo: ['Arlington County Fire Department', '2100 Clarendon Blvd., Suite 400', 'Arlington, VA 22201'],
    emails: ['firefinanceteam@arlingtonva.us', 'Mhinds@arlingtonva.us', 'Jhill@arlingtonva.us'],
  },
  // Renamed 10/12 (was "Arlington County Department of Public Relations",
  // originally "Arlington 911"). PO 2702541 seeded in org_pos.
  'Arlington County Public Safety Communication & Emergency Management': {
    code: 'A911', // PROVISIONAL code; confirm
    billTo: [
      'Arlington County Public Safety Communication & Emergency Management (911)',
      '1400 N. Uhle Street, Suite 300',
      'Arlington, VA 22201',
    ],
    emails: ['Tmartin1@arlingtonva.us'],
  },
  'Arlington Police Department': {
    code: 'APD', // PROVISIONAL — added 8/15 per Cris; confirm code + billing emails
  },
  'Prince William County Fire & Rescue': {
    code: 'PWCFR',
    billTo: ['Prince William County', 'Department of Fire and Rescue', '8494 KOA Circle', 'Manassas, VA 20110'],
    emails: ['RAdams2@pwcgov.org', 'firerescuejobs@pwcgov.org', 'kodell@pwcgov.org'],
  },
  'Prince William 911': {
    code: 'PW911', // PO 545165-27 seeded in org_pos
    billTo: [
      'Prince William County Government',
      'Department of Public Safety Communications (911)',
      '3 County Complex Court',
      'Prince William, VA 22192',
    ],
    emails: ['ecarver@pwcgov.org', 'DPSC-Purchasing@pwcgov.org', 'cgrand3@pwcgov.org'],
  },
  'Prince William Adult Detention Center': {
    code: 'PWAD', // PO 544810-27 seeded in org_pos
    billTo: ['Prince William-Manassas Adult Detention Center', '9321 Mosby St.', 'Manassas, VA 20110'],
    emails: [
      'fcortes@pwcgov.org',
      'JMcallister1@pwcgov.org',
      'mbarnes2@pwcgov.org',
      'Adcaccountspayable@pwcgov.org',
      'Iflores2@pwcgov.org',
    ],
  },
  'Prince William Office of Criminal Justice Services': {
    code: 'PWOCJS', // PROVISIONAL code — confirm
    // List had zip "2011" (→ 20110) and "HCrowley@pwc.gov.org" (→ pwcgov.org).
    billTo: ['Prince William Office of Criminal Justice Services', '9540 Center St., Suite 301', 'Manassas, VA 20110'],
    emails: ['HCrowley@pwcgov.org', 'sirizarry@pwcgov.org'],
  },
  'Town of Louisa Police Department': { code: 'TLPD' },
  'Manassas Park Fire & Rescue': {
    code: 'MPFR',
    billTo: ['Manassas Park Fire & Rescue', '9080 Manassas Dr.', 'Manassas Park, VA 20111'],
    // "manassesparkva.gov" typo fixed on a.jones and s.wollschlager.
    emails: ['a.jones@manassasparkva.gov', 'r.clark@manassasparkva.gov', 's.wollschlager@manassasparkva.gov'],
  },
  'Purcellville Police Department': {
    code: 'PPD',
    billTo: ['Purcellville Police Department', '125 Hirst Rd., Suite 7A', 'Purcellville, VA 20132'],
    emails: ['bdufek@purcellvilleva.gov', 'smoskowitz@purcellvilleva.gov'],
  },
  'Leesburg Police Department': {
    code: 'LPD',
    billTo: ['Leesburg Police Department', '65 Plaza St. NE', 'Leesburg, VA 20176'],
    emails: ['KORELLANA@leesburgva.gov', 'mcodori@leesburgva.gov', 'mtaylor1@leesburgva.gov', 'Jschumer@leesburgva.gov'],
  },
  // Renamed 10/12 (was "Fairfax County Fire & Rescue" — the code FCPSC always
  // meant Public Safety Communications; the agency list confirms the 911 center).
  'Fairfax County Department of Public Safety Communications': {
    code: 'FCPSC',
    billTo: ['Fairfax County Department of Public Safety Communications (911)', '4890 Alliance Drive', 'Fairfax, VA 22030'],
    emails: ['Sydney.drumm@fairfaxcounty.gov', 'Kirsten.chandler@fairfaxcounty.gov'],
  },
  'Fairfax City Police Department': {
    code: 'FCPD', // PO 20270087 seeded in org_pos
    billTo: ['Fairfax City Police Department', '3730 Blenheim Blvd.', 'Fairfax, VA 22030'],
    emails: [
      'Michael.Rizzo@fairfaxva.gov',
      'Kimberly.rizzo@fairfaxva.gov',
      'Adriana.carmona@fairfaxva.gov',
      'matthew.lasowitz@fairfaxva.gov',
      'accountspayable@fairfaxva.gov',
      'brad.carruthers@fairfaxva.gov',
    ],
  },
  'Fairfax City Fire Department': {
    code: 'FCFD',
    billTo: ['Fairfax City Fire Department', '4081 University Drive', 'Fairfax, VA 22030'],
    emails: ['Shawn.dunstan@fairfaxva.gov', 'maria.rice@fairfaxva.gov'],
  },
  "Fairfax County Sheriff's Office": {
    code: 'FCSO', // PO 8500631662 seeded in org_pos
    billTo: ["Fairfax County Sheriff's Office", '10459 Main St.', 'Fairfax, VA 22030'],
    emails: [
      'FXCOINVOICES@fairfaxcounty.gov',
      'Jeana.krasowski@fairfaxcounty.gov',
      'Maegan.diotalevi@fairfaxcounty.gov',
      'angela.mylech@fairfaxcounty.gov',
      'Gabriela.voina@fairfaxcounty.gov',
    ],
  },
  // Fauquier Fire & Rescue merged in 9/29 (all Fauquier exams bill to the county).
  'Fauquier County Government': {
    code: 'FCG',
    billTo: ['Fauquier County Government', '320 Hospital Dr., Suite 23', 'Warrenton, VA 20186'],
    emails: [
      'Autumn.Hawley@fauquiercounty.gov',
      'Cathy.Richard@fauquiercounty.gov',
      'natasha.lorenzen@fauquiercounty.gov',
      'Nathan.Helsley@fauquiercounty.gov',
      'kalvyn.smith@fauquiercounty.gov',
      'mary.wyckoff@fauquiercounty.gov',
      'Jocelyn.andrade@fauquiercounty.gov',
    ],
  },

  // Added 10/15/2026 per Cris. Cell (202) 870-8717 · Fax (202) 791-8458.
  // No billing email yet — add one here when SAPPS has it.
  // `examiners` = the only people the booking dropdown offers for this
  // agency. Exam Amount varies; Brad (Tier 2), Rob and Cris (Tier 3) can
  // all set it in the completion modal (default $225 until changed).
  'United States Probation Office': {
    code: 'USPO', // PROVISIONAL code — confirm
    billTo: ['United States Probation Office', '333 Constitution Ave. NW', 'Washington, DC 20001'],
    examiners: ['bdhhwt@gmail.com', 'rjsmithpolygraph@gmail.com', 'crissmithpolygraph@gmail.com'],
    variableAmount: true,
  },

  'Sex Offender Treatment Program': {
    code: 'SOPC',
    emails: [
      'Nicole.Peyton@vadoc.virginia.gov',
      'melanie.southard@vadoc.virginia.gov',
      'James.lynskey@vadoc.virginia.gov',
    ],
  },
  'Sex Offender Programs & Monitoring Unit': {
    code: 'SOPMU', // PO PC005245782 seeded in org_pos
    billTo: ['Sex Offender Programs & Monitoring Unit', '6900 Atmore Dr.', 'Richmond, VA 23225'],
    // Mark Hayward = SOPMU in Roanoke (bill + reports).
    emails: ['Nicole.peyton@vadoc.virginia.gov', 'Mark.Hayward@vadoc.virginia.gov'],
  },
  'Virginia Center for Behavioral Rehabilitation': {
    code: 'VCBR',
    billTo: ['Virginia Center for Behavioral Rehabilitation', '4901 Patrick Henry Highway', 'Burkeville, VA 23922'],
    // List also has "Vcbrap.@dbhds.virginia.gov" — malformed, left out until
    // SAPPS confirms the exact address. kasey's "bdhds" typo fixed to dbhds.
    emails: [
      'Kelly.Parker-Covington@dbhds.virginia.gov',
      'Larry.Turner@dbhds.virginia.gov',
      'kasey.k.bigelow@dbhds.virginia.gov',
    ],
  },
}

export const orgCode = (name) => ORG_DIRECTORY[name]?.code || 'ORG'
export const orgBillTo = (name) => ORG_DIRECTORY[name]?.billTo || [name]
/** Street address lines only (Bill-To minus the name line) — '' when unknown. */
export const orgAddressLines = (name) => {
  const b = ORG_DIRECTORY[name]?.billTo
  return b && b.length > 1 ? b.slice(1) : []
}
export const orgEmails = (name) => ORG_DIRECTORY[name]?.emails || []
/** Emails of the only examiners who take this agency's exams, or null (anyone). */
export const orgExaminers = (name) => ORG_DIRECTORY[name]?.examiners || null
/** Agencies whose Exam Amount changes exam to exam. */
export const orgHasVariableAmount = (name) => Boolean(ORG_DIRECTORY[name]?.variableAmount)
export const orgIsServicing = (name) => ORG_DIRECTORY[name]?.servicing !== false
