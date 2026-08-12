// Higher Education template — the department, not the bench.
// Researched against Grist's higher-ed positioning (research & lab management, grant & budget
// tracking, campus operations, student/staff administration; self-hosting, row-level access
// control, audit logging, SSO) and two real docs: Class Enrollment — where Classes carries
// Max_Students with Count = len(Enrollments.lookupRecords(Status="Confirmed")) and
// Spots_Left = max(Max - Count, 0) or "Full", i.e. capacity as a live rollup — and the Grant
// Application Tracker, whose Status pipeline, Proposal_Deadline and requested-vs-granted amounts
// are the shape of research administration.
//
// Positioned apart from two neighbouring templates: Research Labs is the bench (samples, reagents,
// instruments) and Nonprofits is charitable funding. This is the department: course catalogue and
// enrolment capacity, research funding from sponsors like the NSF and ERC, faculty, and campus.
//
// FERPA: the source Students table carries insurance policy numbers, physician contacts, allergies
// and medical-form attachments. This page PUBLISHES, and US student records are legally protected,
// so students appear only as anonymised cohort rows — an id, programme, year, status and credits,
// with no names, contacts or health data. Faculty are public-facing and are named.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget,
  spacer, image, testimonials, calcEmbed, placeholderImage,
} from './_helpers.js';

const NAVY = '#1e3a8a';
const TEAL = '#0891b2';

export const TEMPLATE = {
  id: 'higher-education',
  name: 'Higher Education',
  tagline: 'Courses, enrolment, research funding and faculty',
  config: {
    version: 1,
    theme: { paletteId: 'corporate', fontId: 'serifmix', mode: 'auto' },
    dataTable: 'Courses',
    header: {
      logoData: null, title: 'Anupress University', slogan: 'Teaching and research, in the open',
      menu: [
        { label: 'Overview', tab: 'tab-overview' }, { label: 'Courses', tab: 'tab-courses' },
        { label: 'Students', tab: 'tab-students' }, { label: 'Research', tab: 'tab-research' },
        { label: 'Campus', tab: 'tab-campus' },
      ],
    },
    footer: { text: '© 2026 Anupress University.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Courses', tab: 'tab-courses' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Teaching and research, in the open 🎓', subtitle: 'Enrolment, course capacity, research funding and faculty — published from the records the departments already keep.' },
        blocks: [
          { id: 'he1', type: 'stat', span: 3, config: { table: 'Students', label: 'Students enrolled', column: 'IsEnrolled', agg: 'sum', icon: 'users', format: {} } },
          { id: 'he2', type: 'stat', span: 3, config: { table: 'Courses', label: 'Courses offered', column: 'Code', agg: 'count', icon: 'layout', format: {} } },
          { id: 'he3', type: 'stat', span: 3, config: { table: 'Grants', label: 'Research funding', column: 'AmountAwarded', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'he4', type: 'stat', span: 3, config: { table: 'Faculty', label: 'Faculty', column: 'Name', agg: 'count', icon: 'star', format: {} } },
          { id: 'he5', type: 'chart', span: 8, config: { table: 'Students', title: 'Enrolment by programme', chartType: 'bar', dims: ['Programme'], measures: ['IsEnrolled'], agg: 'sum', sortByValue: true } },
          { id: 'he6', type: 'breakdown', span: 4, config: { table: 'Students', title: 'By year of study', column: 'Year', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'he7', type: 'progress', span: 8, config: { title: 'Research funding against annual goal', mode: 'data', table: 'Grants', valueColumn: 'AmountAwarded', agg: 'sum', target: 2500000, prefix: '$', color: NAVY } },
          { id: 'he8', type: 'countdown', span: 4, config: { title: 'Term starts', targetDate: new Date(Date.now() + 27 * 86400000).toISOString(), expiredText: 'Term is under way — welcome back.', color: NAVY } },
          text('he9', 'How to read this page', 'Everything here is an aggregate. Students appear only as anonymised cohort records — an ID, programme, year and credits — never by name. Individual student records stay inside our Grist document behind access rules, which is how a published page and student privacy can coexist.'),
          accordion('he10', 'Frequently asked questions', [
            { q: 'How do I find out if a course has space?', a: 'The Courses page lists every section with its capacity, current enrolment and spots left — updated from the same table the registrar works in.' },
            { q: 'Who supervises research students?', a: 'Each programme lists an advisor drawn from the faculty directory on the Campus page. Principal investigators are named against every grant on the Research page.' },
            { q: 'Is student data published here?', a: 'No. Student rows are anonymised to an ID and cohort attributes. Names, contact details and any health or accommodation records stay private under Grist access rules, in line with FERPA.' },
          ]),
        ],
      },
      {
        id: 'tab-courses', title: 'Courses',
        hero: { title: 'Course catalogue', subtitle: 'What runs this year, who teaches it, and where there is still room.' },
        blocks: [
          { id: 'he11', type: 'stat', span: 3, config: { table: 'Courses', label: 'Places offered', column: 'Capacity', agg: 'sum', icon: 'database', format: { compact: true } } },
          { id: 'he12', type: 'stat', span: 3, config: { table: 'Courses', label: 'Places taken', column: 'Enrolled', agg: 'sum', icon: 'users', format: { compact: true } } },
          { id: 'he13', type: 'stat', span: 3, config: { table: 'Courses', label: 'Spots left', column: 'SpotsLeft', agg: 'sum', icon: 'target', format: {} } },
          { id: 'he14', type: 'stat', span: 3, config: { table: 'Courses', label: 'Sections full', column: 'IsFull', agg: 'sum', icon: 'shield', format: {} } },
          { id: 'he15', type: 'chart', span: 12, config: { table: 'Courses', title: 'Capacity vs enrolment by course', chartType: 'column', dims: ['Code'], measures: ['Capacity', 'Enrolled'], agg: 'sum' } },
          { id: 'he16', type: 'breakdown', span: 4, config: { table: 'Courses', title: 'Courses by department', column: 'Department', limit: 8 } },
          { id: 'he17', type: 'chart', span: 8, config: { table: 'Courses', title: 'Average fill rate by department', chartType: 'bar', dims: ['Department'], measures: ['PercentFull'], agg: 'avg', sortByValue: true } },
          {
            id: 'he18', type: 'livetable', span: 12,
            config: {
              title: 'Catalogue', table: 'Courses',
              columns: ['Code', 'Title', 'Department', 'Term', 'Instructor', 'Enrolled', 'SpotsLeft'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G16', color: '#d3f9d8' }],
            },
          },
          text('he19', '', '<b>Spots left</b> is highlighted — the one column a student actually scans for. It is a rollup of confirmed enrolments against capacity, exactly as Grist\'s own enrolment template computes it, so it can never drift from the register.'),
        ],
      },
      {
        id: 'tab-students', title: 'Students',
        hero: { title: 'The student body', subtitle: 'Cohorts, progression and retention — reported without identifying anyone.' },
        blocks: [
          { id: 'he20', type: 'breakdown', span: 4, config: { table: 'Students', title: 'By status', column: 'Status', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'he21', type: 'breakdown', span: 4, config: { table: 'Students', title: 'By department', column: 'Department', limit: 8 } },
          { id: 'he22', type: 'breakdown', span: 4, config: { table: 'Students', title: 'By year', column: 'Year', limit: 6 } },
          { id: 'he23', type: 'chart', span: 8, config: { table: 'Students', title: 'Credits earned by programme', chartType: 'bar', dims: ['Programme'], measures: ['CreditsEarned'], agg: 'avg', sortByValue: true } },
          { id: 'he24', type: 'progress', span: 4, config: { title: 'Students currently enrolled', mode: 'data', table: 'Students', valueColumn: 'IsEnrolled', agg: 'sum', target: 60, suffix: 'students', color: TEAL } },
          {
            id: 'he25', type: 'livetable', span: 12,
            config: {
              title: 'Cohort records (anonymised)', table: 'Students',
              columns: ['StudentID', 'Programme', 'Year', 'Status', 'CreditsEarned', 'Advisor'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'D1:D60', color: '#e7f5ff' }],
            },
          },
          text('he26', 'Why there are no names here', 'This table is deliberately anonymised. Grist\'s own enrolment template stores insurance carriers, physician contacts, allergies and medical forms alongside each student — exactly the material that must never reach a public page. Keep those columns behind row-level access rules and publish the cohort view instead: the reporting still works, and the record stays protected.'),
          accordion('he27', 'Advising & progression', [
            { q: 'How are advisors assigned?', a: 'By department, at intake. Every cohort record carries its advisor so caseloads can be balanced without opening individual files.' },
            { q: 'What counts as “on leave”?', a: 'A student with an approved interruption who retains their place. They are excluded from the enrolled count but stay in the cohort for retention reporting.' },
            { q: 'How is retention measured?', a: 'Enrolled and graduated records against the full cohort. Because the table is anonymised, the same figures can be shared publicly and with accreditors.' },
          ]),
        ],
      },
      {
        id: 'tab-research', title: 'Research',
        hero: { title: 'Research funding', subtitle: 'What we have applied for, what has been awarded, and what is due next.' },
        blocks: [
          { id: 'he28', type: 'stat', span: 3, config: { table: 'Grants', label: 'Proposals', column: 'Title', agg: 'count', icon: 'layout', format: {} } },
          { id: 'he29', type: 'stat', span: 3, config: { table: 'Grants', label: 'Requested', column: 'AmountRequested', agg: 'sum', icon: 'trending', format: { compact: true, currency: '$' } } },
          { id: 'he30', type: 'stat', span: 3, config: { table: 'Grants', label: 'Awarded', column: 'AmountAwarded', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'he31', type: 'stat', span: 3, config: { table: 'Grants', label: 'Grants funded', column: 'Funded', agg: 'sum', icon: 'check', format: {} } },
          {
            id: 'he32', type: 'calendar', span: 12,
            config: { title: 'Proposal deadlines', table: 'Grants', dateColumn: 'ProposalDeadline', titleColumn: 'Title', detailColumns: ['Sponsor', 'PrincipalInvestigator', 'AmountRequested', 'Status'], colorBy: 'Status', draggable: true },
          },
          text('he33', '', 'Drag a proposal to a new day to move its deadline — on the published page that writes straight back to your Grants table. Research offices lose more funding to missed submission windows than to rejected science.'),
          spacer('he33s', 10),
          { id: 'he34', type: 'breakdown', span: 4, config: { table: 'Grants', title: 'By stage', column: 'Status', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'he35', type: 'chart', span: 8, config: { table: 'Grants', title: 'Requested vs awarded by department', chartType: 'column', dims: ['Department'], measures: ['AmountRequested', 'AmountAwarded'], agg: 'sum' } },
          { id: 'he36', type: 'chart', span: 12, config: { table: 'Grants', title: 'Awarded funding by sponsor', chartType: 'bar', dims: ['Sponsor'], measures: ['AmountAwarded'], agg: 'sum', sortByValue: true } },
          {
            id: 'he37', type: 'livetable', span: 12,
            config: {
              title: 'Grant register', table: 'Grants',
              columns: ['Title', 'PrincipalInvestigator', 'Sponsor', 'Department', 'Status', 'ProposalDeadline', 'AmountRequested'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F14', color: '#ffe3e3' }],
            },
          },
        ],
      },
      {
        id: 'tab-campus', title: 'Campus',
        hero: { title: 'Departments & faculty', subtitle: 'Who teaches where, and what each department is working on.' },
        blocks: [
          { id: 'he38', type: 'map', span: 12, config: { table: 'Departments', title: 'Departments across campus', subtitle: '%count departments mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Name', colorBy: 'Name', popupColumns: ['Building', 'Head', 'StudentCount'] } },
          {
            id: 'he39', type: 'livetable', span: 12,
            config: {
              title: 'Departments', table: 'Departments',
              columns: ['Name', 'Building', 'Head', 'StudentCount', 'FacultyCount', 'CourseCount', 'ResearchFunding'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G6', color: '#d3f9d8' }],
            },
          },
          { id: 'he40', type: 'chart', span: 6, config: { table: 'Departments', title: 'Students by department', chartType: 'bar', dims: ['Name'], measures: ['StudentCount'], agg: 'sum', sortByValue: true } },
          { id: 'he41', type: 'chart', span: 6, config: { table: 'Faculty', title: 'Research funding by faculty member', chartType: 'bar', dims: ['Name'], measures: ['ResearchFunding'], agg: 'sum', sortByValue: true, limit: 10 } },
          {
            id: 'he42', type: 'livetable', span: 12,
            config: {
              title: 'Faculty directory', table: 'Faculty',
              columns: ['Name', 'Title', 'Department', 'Email', 'CoursesTaught', 'GrantsHeld'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F12', color: '#e7f5ff' }],
            },
          },
          text('he43', '', 'Faculty are listed by name and contact — unlike students, they are public-facing, and prospective researchers need to reach them. That asymmetry is the whole point of row-level access rules: one document, two very different publication policies.'),
          spacer('he43s', 10),
          iconBlock('he44', 'star', 'l', NAVY, '#ffffff', 'center', 3),
          iconBlock('he45', 'users', 'l', TEAL, '#ffffff', 'center', 3),
          iconBlock('he46', 'globe', 'l', NAVY, '#ffffff', 'center', 3),
          iconBlock('he47', 'shield', 'l', TEAL, '#ffffff', 'center', 3),
          counter('he48', 'Years of teaching', 0, 128, {}, 3),
          counter('he49', 'Alumni worldwide', 0, 42000, { suffix: '+' }, 3),
          counter('he50', 'Countries represented', 0, 74, {}, 3),
          counter('he51', 'Graduate employment', 0, 93, { suffix: '%' }, 3),
          { id: 'he52', type: 'timeline', span: 12, config: { title: 'Our history', items: [
            { date: '1898', title: 'Founded as a teachers\' college', description: 'Forty students, two lecture halls and a borrowed library.' },
            { date: '1954', title: 'First research grant', description: 'Federal funding arrived, and with it the first dedicated laboratories.' },
            { date: '1996', title: 'Graduate school established', description: 'Doctoral programmes across the sciences and humanities.' },
            { date: '2026', title: 'Open reporting', description: 'Enrolment, capacity and research funding published live from our own records — this page.' },
          ] } },
          { id: 'he53', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          image('he54', placeholderImage(NAVY, TEAL), 'Students outside the main library', 'The quad, first week of term', 6),
          testimonials('he55', 'From our community', [
            { name: 'Amara J., MSc Data Science', quote: 'I could see exactly which courses had space before registration opened — no guessing.', rating: 5, photoData: null },
            { name: 'Dr. Peter Abara, Business', quote: 'Our grant deadlines finally live somewhere the whole department can see.', rating: 5, photoData: null },
          ], 6),
          {
            id: 'he56', type: 'pricing', span: 12,
            config: {
              title: 'Tuition & fees', plans: [
                { name: 'Undergraduate', price: '$12,400', period: '/year', features: ['Full course load', 'Library and lab access', 'Advising and careers support'], highlighted: false, buttonLabel: 'Apply', buttonTarget: tabTarget('tab-courses') },
                { name: 'Postgraduate', price: '$16,900', period: '/year', features: ['Taught and research routes', 'Supervisor assigned at intake', 'Conference travel fund'], highlighted: true, buttonLabel: 'Apply', buttonTarget: tabTarget('tab-courses') },
                { name: 'Doctoral', price: 'Funded', period: '', features: ['Stipend and fee waiver', 'Teaching opportunities', 'Named principal investigator'], highlighted: false, buttonLabel: 'Talk to us', buttonTarget: urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/') },
              ],
            },
          },
          button('he57', 'Plan a visit', 'primary', 'left', urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/'), 4),
          spacer('he57s', 20),
          calcEmbed('he58', {
            title: 'Grant request builder', resultLabel: 'Total request',
            fields: [
              { key: 'direct', label: 'Direct costs', value: 250000 },
              { key: 'idc', label: 'Indirect rate (%)', value: 55 },
            ],
            expr: 'v.direct * (1 + v.idc / 100)', prefix: '$', decimals: 0,
            note: 'Indirect cost recovery is negotiated per institution and is easy to forget when budgeting a proposal.',
          }),
        ],
      },
    ],
  },
};
