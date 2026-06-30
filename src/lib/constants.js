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
]

// ---- Booking org dropdown (grouped) ----
// Names corrected to match the client contact sheet (Loudoun Fire & Rescue,
// Loudoun County Sheriff's Office, Gavin de Becker, Clinical Forensics
// Services, Fairfax County Fire & Rescue*, Prince William 911). New orgs added.
// * FCPSC name flipped from "911 Communication" to "Fire & Rescue" per the
//   contact sheet — the one rename worth a sanity-check against your contracts.
export const ORGANIZATIONS = {
  Districts: [
    'Richmond', 'Charlottesville', 'Arlington', 'Winchester', 'Staunton',
    'Lynchburg', 'Roanoke', 'Abingdon', 'Roanoke Headquarters', 'Bedford',
    'Martinsville', 'Chesterfield', 'Radford', 'Fairfax', 'Henrico',
    'Manassas', 'Alexandria', 'Rocky Mount', 'Fincastle', 'Tazewell',
  ],
  'Private Clients & Organizations': [
    'Center for Clinical and Forensic Services',
    'Clinical Forensics Services',
    'Frank Psychology & Forensics, LLC (Dr. Susan Frank)',
    'Trauma And Hope',
    'Gavin de Becker',
    'Loudoun Fire & Rescue',
    "Loudoun County Sheriff's Office",
    'Alexandria Dept. of Emergency Communication',
    'Arlington County Fire & Rescue',
    'Prince William County Fire & Rescue',
    'Prince William 911',
    'Prince William Adult Detention Center',
    'Town of Louisa Police Department',
    'Manassas Park Fire & Rescue',
    'Purcellville Police Department',
    'Leesburg Police Department',
    'Fairfax County Fire & Rescue',
    'Fairfax City Police Department',
    'Fairfax City Fire Department',
    "Fairfax County Sheriff's Office",
    'Fauquier County Fire & Rescue',
    'Fauquier County Government',
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
]
export const TEST_TYPE_ABBR = Object.fromEntries(TEST_TYPES.map((t) => [t.value, t.abbr]))

// ---- Org directory: invoice code + (where known) Bill-To + billing emails ----
// `emails`  = invoice recipients (from the client contact sheet).
// `servicing: false` = account the sheet marks as not currently active.
export const ORG_DIRECTORY = {
  Richmond: { code: 'D1' },
  Charlottesville: {
    code: 'D9',
    emails: ['jill.madison@vadoc.virginia.gov', 'district09@vadoc.virginia.gov'],
  },
  Arlington: { code: 'D10' },
  Winchester: { code: 'D11', emails: ['Kristen.haight@vadoc.virginia.gov'] },
  Staunton: { code: 'D12' },
  Lynchburg: { code: 'D13' },
  Roanoke: {
    code: 'D15',
    emails: ['brandi.britton@vadoc.virginia.gov', 'shawn.trimble@vadoc.virginia.gov'],
  },
  Abingdon: { code: 'D17', emails: ['Olivia.McDonald@vadoc.virginia.gov'] },
  'Roanoke Headquarters': { code: 'SOPC-D15' },
  Bedford: {
    code: 'D20',
    emails: ['crystal.adkins@vadoc.virginia.gov', 'district20@vadoc.virginia.gov'],
  },
  Martinsville: { code: 'D22' },
  Chesterfield: { code: 'D27' },
  Radford: {
    code: 'D28',
    emails: [
      'juan.castillo@vadoc.virginia.gov',
      'travis.cassell@vadoc.virginia.gov',
      'rachael.mullins@vadoc.virginia.gov',
    ],
  },
  Fairfax: {
    code: 'D29',
    servicing: false,
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
    emails: ['Caitlin.marsh@vadoc.virginia.gov', 'rr-D35SoBudget@vadoc.virginia.gov'],
  },
  Alexandria: {
    code: 'D36',
    emails: [
      'Rebecca.harrison@vadoc.virginia.gov',
      'Caitlin.sweeney@vadoc.virginia.gov',
      'Jillian.mackling@vadoc.virginia.gov',
      'William.cassani@vadoc.virginia.gov',
    ],
  },
  'Rocky Mount': {
    code: 'D37',
    emails: [
      'Tiffany.schara@vadoc.virginia.gov',
      'Andrew.martin@vadoc.virginia.gov',
      'Kaitlyn.potter@vadoc.virginia.gov',
      'Avita.crawford@vadoc.virginia.gov',
    ],
  },
  Fincastle: {
    code: 'D40',
    billTo: ['Probation & Parole District 40', '20 South Roanoke Street', 'P.O. Box 588', 'Fincastle, VA 24090'],
    emails: ['m.brown@vadoc.virginia.gov', 'carlie.cutright@vadoc.virginia.gov'],
  },
  Tazewell: { code: 'D43' },

  'Center for Clinical and Forensic Services': {
    code: 'CCFS',
    emails: ['finance@ccfs.net', 'celenagates@ccfsinc.net', 'operations@ccfsinc.net'],
  },
  'Clinical Forensics Services': { code: 'CFS', emails: ['drhardenburg@cfsvirginia.com'] },
  'Frank Psychology & Forensics, LLC (Dr. Susan Frank)': { code: 'FP&F' },
  'Trauma And Hope': { code: 'TAH', emails: ['dpatel@traumaandhope.com'] },
  'Gavin de Becker': {
    code: 'GDBA',
    servicing: false,
    emails: ['GDBA_innvoicecapture@concursolutions.com', 'shassanbrown@gdba.com'],
  },
  'Loudoun Fire & Rescue': {
    code: 'LCFR',
    emails: [
      'Timothy.Taheri@loudoun.gov',
      'Michael.reilly@loudoun.gov',
      'DEPT-FRSERV-LCFR-INVOICES@loundoun.gov', // NOTE: "loundoun" — likely typo, verify
    ],
  },
  "Loudoun County Sheriff's Office": {
    code: 'LCSO',
    servicing: false,
    emails: ['Colin.whittington@loudoun.gov', 'emir.bekric@loudoun.gov'],
  },
  'Alexandria Dept. of Emergency Communication': {
    code: 'ADEC',
    emails: ['Tiffany.Joy@alexandriava.gov'],
  },
  'Arlington County Fire & Rescue': {
    code: 'ACFR', // PROVISIONAL code — not on the contact sheet; confirm against contracts
    emails: ['Mhinds@arlingtonva.us', 'Jhill@arlingtonva.us'],
  },
  'Prince William County Fire & Rescue': {
    code: 'PWCFR',
    billTo: ['Prince William County', 'Department of Fire and Rescue', '8494 Koa Circle', 'Manassas, VA 20110'],
    emails: ['RAdams2@pwcgov.org', 'firerescuejobs@pwcgov.org', 'kodell@pwcgov.org'],
  },
  'Prince William 911': { code: 'PW911', servicing: false, emails: ['ecarver@pwcgov.org'] },
  'Prince William Adult Detention Center': {
    code: 'PWAD',
    emails: ['fcortes@pwcgov.org', 'JMcallister1@pwcgov.org', 'mbarnes2@pwcgov.org'],
  },
  'Town of Louisa Police Department': { code: 'TLPD' },
  'Manassas Park Fire & Rescue': {
    code: 'MPFR',
    emails: [
      'a.jones@manassesparkva.gov', // NOTE: "manasses" — likely typo, verify
      'r.clark@manassasparkva.gov',
      's.wollschlager@manassesparkva.gov', // NOTE: "manasses" — likely typo, verify
    ],
  },
  'Purcellville Police Department': {
    code: 'PPD',
    servicing: false,
    emails: ['bdufek@purcellvilleva.gov', 'smoskowitz@purcellvilleva.gov'],
  },
  'Leesburg Police Department': {
    code: 'LPD',
    emails: ['KORELLANA@leesburgva.gov', 'mcodori@leesburgva.gov', 'mtaylor1@leesburgva.gov'],
  },
  'Fairfax County Fire & Rescue': {
    code: 'FCPSC',
    servicing: false,
    emails: ['Sydney.drumm@fairfaxcounty.gov', 'Kirsten.chandler@fairfaxcounty.gov'],
  },
  'Fairfax City Police Department': {
    code: 'FCPD',
    emails: [
      'Michael.Rizzo@fairfaxva.gov',
      'Kimberly.rizzo@fairfaxva.gov',
      'Adriana.carmona@fairfaxva.gov',
      'matthew.lasowitz@fairfaxva.gov',
      'accountspayable@fairfaxva.gov',
    ],
  },
  'Fairfax City Fire Department': { code: 'FCFD', emails: ['Shawn.dunstan@fairfaxva.gov'] },
  "Fairfax County Sheriff's Office": {
    code: 'FCSO',
    emails: [
      'Jeana.krasowski@fairfaxcounty.gov',
      'Maegan.diotalevi@fairfaxcounty.gov',
      'angela.mylech@fairfaxcounty.gov',
      'Gabriela.voina@fairfaxcounty.gov',
    ],
  },
  'Fauquier County Fire & Rescue': {
    code: 'FCFR',
    servicing: false,
    emails: [
      'Cathy.Richard@fauquiercounty.gov',
      'natasha.lorenzen@fauquiercounty.gov',
      'Nathan.Helsley@fauquiercounty.gov',
    ],
  },
  'Fauquier County Government': {
    code: 'FCG',
    servicing: false,
    emails: ['Autumn.Hawley@fauquiercounty.gov'],
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
    code: 'SOPMU',
    emails: ['Nicole.peyton@vadoc.virginia.gov'],
  },
  'Virginia Center for Behavioral Rehabilitation': {
    code: 'VCBR',
    emails: ['Kelly.Parker-Covington@dbhds.virginia.gov', 'Larry.Turner@dbhds.virginia.gov'],
  },
}

export const orgCode = (name) => ORG_DIRECTORY[name]?.code || 'ORG'
export const orgBillTo = (name) => ORG_DIRECTORY[name]?.billTo || [name]
export const orgEmails = (name) => ORG_DIRECTORY[name]?.emails || []
export const orgIsServicing = (name) => ORG_DIRECTORY[name]?.servicing !== false
