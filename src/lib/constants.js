// Booking dropdowns. Organizations are split into two groups for the
// grouped <select>, but both write to the single exams.organization column.

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

// value = stored enum value; abbr = short label shown in compact UI.
export const TEST_TYPES = [
  { value: 'Pre-Employment', abbr: 'PE' },
  { value: 'Maintenance', abbr: 'MAINT' },
  { value: 'Monitoring', abbr: 'MON' },
  { value: 'Sexual History', abbr: 'SH' },
  { value: 'Sexual History Retest', abbr: 'SHR' },
  { value: 'Specific Issue', abbr: 'SI' },
  { value: 'Instant Offense', abbr: 'IO' },
]

export const TEST_TYPE_ABBR = Object.fromEntries(
  TEST_TYPES.map((t) => [t.value, t.abbr])
)
