// ---- Company (from SAPPS letterhead) ----
export const COMPANY = {
  name: 'Smith & Associates Pre-Employment and Polygraph Services',
  addressLines: ['10875 Main Street, Suite 111', 'Fairfax, VA 22030'],
  phones: '(703) 618-2400  ~  (571) 242-7795',
}

// ---- Booking org dropdown (grouped) ----
export const ORGANIZATIONS = {
  Districts: [
    'Richmond', 'Charlottesville', 'Arlington', 'Winchester', 'Staunton',
    'Lynchburg', 'Roanoke', 'Abingdon', 'Roanoke Headquarters', 'Bedford',
    'Martinsville', 'Chesterfield', 'Radford', 'Fairfax', 'Henrico',
    'Manassas', 'Alexandria', 'Rocky Mount', 'Fincastle', 'Tazewell',
  ],
  'Private Clients & Organizations': [
    'Center for Clinical and Forensic Services',
    'Counseling & Forensic Services',
    'Frank Psychology & Forensics, LLC (Dr. Susan Frank)',
    'Trauma And Hope',
    'GALVIN de Becker',
    'Fire Department',
    "Sheriff's Office",
    'Alexandria Dept. of Emergency Communication',
    'Prince William County Fire & Rescue',
    'Prince William County Public Safety',
    'Prince William Adult Detention Center',
    'Town of Louisa Police Department',
    'Manassas Park Fire & Rescue',
    'Purcellville Police Department',
    'Leesburg Police Department',
    'Fairfax County 911 Communication',
    'Fairfax City Police Department',
    'Fairfax City Fire Department',
    "Fairfax County Sheriff's Office",
    'Fauquier County Government',
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

// ---- Org directory: invoice code + (where known) Bill-To block ----
// Codes from SAPPS contracts list. Addresses are filled where we have them
// (from real invoices); the rest get added from the client directory.
export const ORG_DIRECTORY = {
  Richmond: { code: 'D1' },
  Charlottesville: { code: 'D9' },
  Arlington: { code: 'D10' },
  Winchester: { code: 'D11' },
  Staunton: { code: 'D12' },
  Lynchburg: { code: 'D13' },
  Roanoke: { code: 'D15' },
  Abingdon: { code: 'D17' },
  'Roanoke Headquarters': { code: 'SOPC-D15' },
  Bedford: { code: 'D20' },
  Martinsville: { code: 'D22' },
  Chesterfield: { code: 'D27' },
  Radford: { code: 'D28' },
  Fairfax: { code: 'D29' },
  Henrico: { code: 'D32' },
  Manassas: { code: 'D35' },
  Alexandria: { code: 'D36' },
  'Rocky Mount': { code: 'D37' },
  Fincastle: {
    code: 'D40',
    billTo: ['Probation & Parole District 40', '20 South Roanoke Street', 'P.O. Box 588', 'Fincastle, VA 24090'],
  },
  Tazewell: { code: 'D43' },
  'Center for Clinical and Forensic Services': { code: 'CCFS' },
  'Counseling & Forensic Services': { code: 'CFS' },
  'Frank Psychology & Forensics, LLC (Dr. Susan Frank)': { code: 'FP&F' },
  'Trauma And Hope': { code: 'TAH' },
  'GALVIN de Becker': { code: 'GDBA' },
  'Fire Department': { code: 'LCFR' },
  "Sheriff's Office": { code: 'LCSO' },
  'Alexandria Dept. of Emergency Communication': { code: 'ADEC' },
  'Prince William County Fire & Rescue': {
    code: 'PWCFR',
    billTo: ['Prince William County', 'Department of Fire and Rescue', '8494 Koa Circle', 'Manassas, VA 20110'],
  },
  'Prince William County Public Safety': { code: 'PW911' },
  'Prince William Adult Detention Center': { code: 'PWAD' },
  'Town of Louisa Police Department': { code: 'TLPD' },
  'Manassas Park Fire & Rescue': { code: 'MPFR' },
  'Purcellville Police Department': { code: 'PPD' },
  'Leesburg Police Department': { code: 'LPD' },
  'Fairfax County 911 Communication': { code: 'FCPSC' },
  'Fairfax City Police Department': { code: 'FCPD' },
  'Fairfax City Fire Department': { code: 'FCFD' },
  "Fairfax County Sheriff's Office": { code: 'FCSO' },
  'Fauquier County Government': { code: 'FCG' },
}

export const orgCode = (name) => ORG_DIRECTORY[name]?.code || 'ORG'
export const orgBillTo = (name) => ORG_DIRECTORY[name]?.billTo || [name]
