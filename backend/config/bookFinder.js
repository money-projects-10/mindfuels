// Book Finder settings. Change choices here, not in the matching code.
//
// Class bands match the product data in the `tag3` column (the same five groups the catalogue uses).
// Each band lists the exact tag3 text it matches, so Playgroup/Nursery both land on "Early Foundation".
// Focus areas match the product `tag1` column (categories such as "Phonetics" or "Mathematics").

export const CLASS_BANDS = [
  {
    key: 'early',
    label: 'Playgroup & Nursery',
    ages: '2–4 years',
    tag3: 'Early Foundation (Pre Nursery & Nursery)'
  },
  {
    key: 'kg',
    label: 'LKG & UKG',
    ages: '4–6 years',
    tag3: 'Kindergarten Years (U.K.G & L.K.G)'
  },
  {
    key: 'primary1',
    label: 'Class 1 & 2',
    ages: '6–8 years',
    tag3: 'Lower Primary (Class 1 & 2)'
  },
  {
    key: 'primary2',
    label: 'Class 3 & 4',
    ages: '8–10 years',
    tag3: 'Upper Primary (Class 3 & 4)'
  },
  {
    key: 'middle',
    label: 'Class 5 & 6',
    ages: '10–12 years',
    tag3: 'Middle School (Class 5 & 6)'
  }
];

// "Everything" is handled in the code: an empty focus list means no focus filter.
export const FOCUS_AREAS = [
  {
    key: 'reading',
    label: 'Reading and phonics',
    tag1: ['Phonetics', 'English', 'Story Books']
  },
  {
    key: 'writing',
    label: 'Writing and cursive',
    tag1: ['Calligraphy & Cursive']
  },
  {
    key: 'maths',
    label: 'Maths and mental maths',
    tag1: ['Mathematics', 'Mental Ability & GK']
  },
  {
    key: 'activities',
    label: 'General knowledge and activities',
    tag1: ['All-Subject Activity Books', 'Science & Computer', 'Art & Creativity', 'All-in-One']
  },
  {
    key: 'moral',
    label: 'Moral stories',
    tag1: ['Story Books']
  },
  {
    key: 'rhymes',
    label: 'Rhymes and poems',
    tag1: ['Rhymes & Poems']
  }
];

export const MAX_RESULTS = 24;
export const MAX_NAME_LENGTH = 120;

export const findBand = (key) => CLASS_BANDS.find(b => b.key === key);
export const findFocus = (key) => FOCUS_AREAS.find(f => f.key === key);
