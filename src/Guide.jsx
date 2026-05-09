import { useState } from 'react'

/* ── Data ────────────────────────────────────── */

const CONVERSATION_DAYS = [
  {
    day: 'Tue', label: 'Tuesday', theme: 'Arrival — Warm & Curious',
    color: '#38bdf8',
    icon: '✈',
    situation: 'Hotel check-in, lobby, welcome drinks, pool area',
    openers: [
      'How was your flight in? Where were you coming from?',
      'First time in Boracay, or have you been here before?',
      'This venue is incredible — have you had a chance to explore yet?',
    ],
    followUps: [
      'Oh, [city] — how\'s the energy in your team lately?',
      'How long have you been with Ericsson?',
      'What area are you working on these days?',
      'What\'s been the most exciting thing happening in your part of the org?',
    ],
    avoid: ['Heavy technical discussions on day 1', 'Complaining about travel', 'Dominating conversation'],
    tip: 'Arrival day = relationship warmup. Observe, listen, be genuinely curious. You\'re planting seeds for Wednesday.',
  },
  {
    day: 'Wed', label: 'Wednesday', theme: 'Conference — Executive Presence',
    color: '#818cf8',
    icon: '🎯',
    situation: 'Main sessions, coffee breaks, Dine Around dinner',
    openers: [
      'Have you heard the speaker before? What\'s your read on them?',
      'Which session are you most looking forward to today?',
      'What landed for you from that last session?',
      'I found the part about [topic] really interesting — how does that show up in your work?',
    ],
    followUps: [
      'That maps to something we\'re working on with rAPP automation...',
      'We ran into something similar when driving AI adoption — what we found was...',
      'What transformation work is actually getting traction in your organization?',
    ],
    dinnerOpeners: [
      'How are you finding the resort? Have you tried the food here yet?',
      'Where are you sitting on the week so far — energized or already ready for the beach?',
      'What kind of work do you actually find energizing?',
      'If you could change one thing about how engineering teams work, what would it be?',
    ],
    tip: 'Target 60% listening / 40% speaking. When you do speak, be specific — one concrete example beats three vague points.',
  },
  {
    day: 'Thu', label: 'Thursday', theme: 'Activities — Real Relationships',
    color: '#34d399',
    icon: '🌊',
    situation: 'Water sports, beach, island excursions',
    openers: [
      'You doing the water sports today or taking the beach approach?',
      'This is exactly the kind of day that makes the conference worth it.',
      'I feel like these informal conversations are where real collaboration starts.',
    ],
    followUps: [
      'What innovation work is getting real traction vs still on a whiteboard?',
      'What surprised you most this year — good or bad?',
      'Where are you seeing the biggest AI impact operationally, not just in pitch decks?',
      'What are the biggest execution bottlenecks teams face right now?',
    ],
    linkinClose: [
      'That\'s something we should keep talking about — are you open to connecting on LinkedIn?',
      'I\'d love to continue this conversation back home.',
    ],
    tip: 'Thursday is the best networking day — people are relaxed, walls are down. Go deeper. Ask the real questions.',
  },
  {
    day: 'Fri', label: 'Friday', theme: 'Workshop + Award — Visibility Day',
    color: '#fbbf24',
    icon: '🏆',
    situation: 'Strategy workshops, award ceremony',
    workshopLines: [
      'Building on what [name] just said — in our context this shows up as...',
      'We tackled a similar challenge when driving AI adoption across the org. What I found...',
      'The "We Own It" theme maps to something we\'ve been building — proof of concepts before formal approval.',
    ],
    workshopQuestions: [
      'How do organizations balance moving fast with building genuine buy-in across geographies?',
      'What\'s the biggest cultural blocker teams hit when trying to sustain innovation momentum?',
      'Where do you see the sharpest difference between teams that say they embrace ownership versus ones that truly live it?',
    ],
    afterAward: [
      '"Thank you — this reflects the work of many talented people I\'ve been fortunate to collaborate with."',
      '"It means a lot. The work is honestly just getting started."',
      '"I appreciate it — I hope it opens more conversations like this one."',
    ],
    tip: 'Friday is your most visible day. Raise your hand in workshops — one specific real example is worth more than any theory.',
  },
  {
    day: 'Sat', label: 'Saturday', theme: 'Departure — Lock In Relationships',
    color: '#e879f9',
    icon: '🤝',
    situation: 'Final breakfast, farewells, transfers',
    openers: [
      'Before we scatter — what\'s the one thing you\'re taking back that\'ll actually change something?',
      'This has been great. I\'d love to stay connected — are you on LinkedIn?',
      'We should get a 30-minute call in the next few weeks while this energy is fresh.',
    ],
    connectionClose: [
      '"I\'ll send you a note when I connect — so it doesn\'t get lost in the noise."',
      '"I\'ll reference our conversation about [topic] when I reach out."',
      '"I really appreciated your perspective on [X]. That reframed something for me."',
    ],
    tip: 'You have a small window. Be intentional: 3 meaningful connections locked in is better than 20 LinkedIn adds.',
  },
]

const LANGUAGE_CATEGORIES = [
  {
    cat: 'Essentials', icon: '⭐', color: '#fbbf24',
    desc: 'Master these 10 before anything else',
    phrases: [
      { bisaya: 'Salamat', tagalog: 'Salamat', english: 'Thank you', note: 'Same in both languages!' },
      { bisaya: 'Maayong buntag', tagalog: 'Magandang umaga', english: 'Good morning' },
      { bisaya: 'Maayong hapon', tagalog: 'Magandang hapon', english: 'Good afternoon' },
      { bisaya: 'Maayong gabii', tagalog: 'Magandang gabi', english: 'Good evening' },
      { bisaya: 'Kumusta ka?', tagalog: 'Kumusta?', english: 'How are you?' },
      { bisaya: 'Maayo man', tagalog: 'Mabuti naman', english: 'I\'m fine / Good' },
      { bisaya: 'Lami kaayo!', tagalog: 'Masarap!', english: 'So delicious!', note: 'Use after first bite — huge smile guaranteed' },
      { bisaya: 'Palihog', tagalog: 'Pakiusap / paki-', english: 'Please', note: 'Add after any request' },
      { bisaya: 'Diin ang CR?', tagalog: 'Saan ang CR?', english: 'Where is the restroom?' },
      { bisaya: 'Pila man?', tagalog: 'Magkano?', english: 'How much?' },
    ],
  },
  {
    cat: 'Fun Expressions', icon: '😄', color: '#38bdf8',
    desc: 'These will earn you instant local respect',
    phrases: [
      { bisaya: 'Grabe!', tagalog: 'Grabe!', english: 'Wow! / Intense! / Amazing!', note: 'Works for everything surprising' },
      { bisaya: 'Bitaw!', tagalog: 'Talaga?', english: 'Exactly! / Right?', note: 'Use to agree enthusiastically' },
      { bisaya: 'Mao gyud!', tagalog: 'Totoo!', english: 'That\'s exactly it!', note: 'Strong agreement — use in discussion' },
      { bisaya: 'Sus!', tagalog: 'Nako!', english: 'Oh my! (mild)', note: 'Safe exclamation for surprise' },
      { bisaya: 'Naa ba?', tagalog: 'Talaga ba?', english: 'Really? / Is that so?', note: 'Shows you\'re listening and engaged' },
      { bisaya: 'Tagay!', tagalog: 'Tagay!', english: 'Cheers! 🥂', note: 'SAY LOUDLY with eye contact at dinner. Guaranteed crowd-pleaser.' },
      { bisaya: 'Kuyog ta!', tagalog: 'Sama tayo!', english: 'Let\'s go together!', note: 'Invite someone to join you' },
      { bisaya: 'Mabuhay!', tagalog: 'Mabuhay!', english: 'Long live! / Cheers! / Welcome!', note: 'National expression of joy — always warmly received' },
    ],
  },
  {
    cat: 'Food & Dining', icon: '🍽', color: '#34d399',
    desc: 'Order confidently and compliment like a local',
    phrases: [
      { bisaya: 'Lami!', tagalog: 'Masarap!', english: 'Delicious!' },
      { bisaya: 'Unsay espesyal?', tagalog: 'Ano ang espesyal?', english: 'What\'s the specialty?' },
      { bisaya: 'Dili maanghang, palihog', tagalog: 'Huwag masyadong maanghang', english: 'Not spicy please' },
      { bisaya: 'Tubig, palihog', tagalog: 'Tubig, pakiusap', english: 'Water, please' },
      { bisaya: 'Pabayad', tagalog: 'Pakuha ng bill', english: 'The bill please' },
      { bisaya: 'Isad pa, palihog', tagalog: 'Isa pa, pakiusap', english: 'One more please' },
      { bisaya: 'Maanghang', tagalog: 'Maanghang', english: 'Spicy', note: 'Same word both languages' },
      { bisaya: 'Unsa ni?', tagalog: 'Ano ito?', english: 'What is this?', note: 'Point and ask — locals love explaining food' },
    ],
  },
  {
    cat: 'Conference Phrases', icon: '💼', color: '#818cf8',
    desc: 'Impress Filipino colleagues with effort',
    phrases: [
      { bisaya: 'Nalipay ko nga nakatagbo nimo', tagalog: 'Natutuwa akong makilala kayo', english: 'I\'m happy to meet you' },
      { bisaya: 'Dako kaayo ang imong trabaho', tagalog: 'Magaling kayo', english: 'Your work is great / You are skilled' },
      { bisaya: 'Salamat kaayo sa tanan', tagalog: 'Salamat sa lahat', english: 'Thank you for everything' },
      { bisaya: 'Padayon ta!', tagalog: 'Padayon!', english: 'Onward! / Let\'s keep going!', note: 'Great for award moment or closing speech' },
      { bisaya: 'Gusto ko makiistorya nimo', tagalog: 'Gusto kitang kausapin', english: 'I\'d like to talk with you' },
      { bisaya: 'Ayos ra', tagalog: 'Ayos lang', english: 'It\'s all good / No problem', note: 'Useful response to apologies' },
    ],
  },
  {
    cat: 'Numbers & Prices', icon: '💰', color: '#e879f9',
    desc: 'Shop and bargain with confidence',
    phrases: [
      { bisaya: 'Usa (1), Duha (2), Tulo (3)', tagalog: 'Isa, Dalawa, Tatlo', english: '1, 2, 3' },
      { bisaya: 'Upat (4), Lima (5), Unom (6)', tagalog: 'Apat, Lima, Anim', english: '4, 5, 6' },
      { bisaya: 'Pito (7), Walo (8), Siyam (9)', tagalog: 'Pito, Walo, Siyam', english: '7, 8, 9' },
      { bisaya: 'Napulo (10)', tagalog: 'Sampu (10)', english: 'Ten' },
      { bisaya: 'Usa ka gatus (100)', tagalog: 'Isang daan (100)', english: 'One hundred (₱100 = ~$1.70)' },
      { bisaya: 'Usa ka libo (1,000)', tagalog: 'Isang libo (1,000)', english: 'One thousand (₱1,000 = ~$17)' },
      { bisaya: 'Mahal kaayo', tagalog: 'Mahal ito', english: 'That\'s too expensive', note: 'Use at markets — never at resort' },
      { bisaya: 'Pwede bang ma-discount?', tagalog: 'Pwede bang mababa pa?', english: 'Can I get a discount?' },
    ],
  },
  {
    cat: 'Cultural Values', icon: '🙏', color: '#fb923c',
    desc: 'Understand the invisible social rules',
    phrases: [
      { bisaya: 'Hiya', tagalog: 'Hiya', english: 'Sense of shame/face', note: 'Never embarrass someone publicly. Address issues privately.' },
      { bisaya: 'Bayanihan', tagalog: 'Bayanihan', english: 'Community spirit', note: 'Helping each other without being asked — it\'s expected and natural.' },
      { bisaya: 'Utang na loob', tagalog: 'Utang na loob', english: 'Debt of gratitude', note: 'When someone helps you, express genuine appreciation. It matters deeply.' },
      { bisaya: 'Pakikisama', tagalog: 'Pakikisama', english: 'Going along with the group', note: 'When offered food or drinks, always take at least a small taste.' },
      { bisaya: 'Tampo', tagalog: 'Tampo', english: 'Quiet withdrawal when hurt', note: 'If someone goes quiet, check in: "Okay ka lang?" (Are you okay?)' },
      { bisaya: 'Mano po', tagalog: 'Mano po', english: 'Blessing from an elder', note: 'Younger presses elder\'s hand to forehead — sign of deep respect.' },
    ],
  },
]

const RAJU_TALKING_POINTS = [
  {
    topic: 'AI Transformation',
    icon: '🤖',
    color: '#38bdf8',
    text: '"We\'ve been driving practical AI adoption inside engineering workflows — not just tools, but actually changing how teams develop, test, and collaborate. The biggest win has been reducing cycle time on the things engineers find most tedious."',
  },
  {
    topic: 'rAPP / Telecom',
    icon: '📡',
    color: '#818cf8',
    text: '"I work at the intersection of RAN systems and AI — specifically around rAPP ecosystems and automated testing. The interesting challenge is bringing modern software engineering practices into telecom infrastructure where reliability is non-negotiable."',
  },
  {
    topic: 'Agentic AI',
    icon: '⚡',
    color: '#34d399',
    text: '"One of the most exciting things I\'m working on is agentic AI workflows — systems that can reason, plan, and act across steps autonomously. We\'re early, but the potential for engineering productivity is genuinely transformative."',
  },
  {
    topic: 'Ownership Culture',
    icon: '🏆',
    color: '#fbbf24',
    text: '"The thing that moves organizations fastest isn\'t having the right strategy — it\'s the right ownership culture. We build proof of concepts before waiting for formal approval. It creates momentum that\'s hard to argue with."',
  },
  {
    topic: '45-Sec Intro',
    icon: '👋',
    color: '#e879f9',
    text: '"I focus on accelerating AI adoption and engineering productivity within telecom systems. Recently I\'ve been driving practical AI transformation around agentic systems, rAPP testing automation, and AI-assisted development workflows. The goal: helping teams move faster while improving collaboration across engineering organizations."',
  },
]

/* ── Sub-components ──────────────────────────── */
function DayCard({ day }) {
  const [open, setOpen] = useState(false)
  const c = day.color

  return (
    <div style={{ ...g.card, borderLeft: `3px solid ${c}`, animation: 'cardEntrance 0.35s ease both' }}>
      <button style={g.cardHeader} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...g.dayPill, background: `${c}22`, color: c }}>{day.icon} {day.day}</div>
          <div>
            <div style={g.cardTitle}>{day.label}</div>
            <div style={{ ...g.cardSub, color: c + 'cc' }}>{day.theme}</div>
          </div>
        </div>
        <span style={{ ...g.chevron, color: c, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>▾</span>
      </button>

      {open && (
        <div style={g.cardBody}>
          <div style={g.situationTag}>📍 {day.situation}</div>

          <Section title="Open With" color={c}>
            {day.openers.map((o, i) => <Phrase key={i} text={o} />)}
          </Section>

          <Section title="Follow-Up Questions" color={c}>
            {day.followUps?.map((o, i) => <Phrase key={i} text={o} />)}
          </Section>

          {day.dinnerOpeners && (
            <Section title="Dinner Openers" color={c}>
              {day.dinnerOpeners.map((o, i) => <Phrase key={i} text={o} />)}
            </Section>
          )}

          {day.workshopLines && (
            <Section title="Workshop Participation" color={c}>
              {day.workshopLines.map((o, i) => <Phrase key={i} text={o} />)}
            </Section>
          )}

          {day.workshopQuestions && (
            <Section title="Questions to Ask" color={c}>
              {day.workshopQuestions.map((o, i) => <Phrase key={i} text={o} />)}
            </Section>
          )}

          {day.afterAward && (
            <Section title="After Award Recognition" color={c}>
              {day.afterAward.map((o, i) => <Phrase key={i} text={o} />)}
            </Section>
          )}

          {day.linkinClose && (
            <Section title="Close for LinkedIn" color={c}>
              {day.linkinClose.map((o, i) => <Phrase key={i} text={o} />)}
            </Section>
          )}

          {day.connectionClose && (
            <Section title="Connection Closer" color={c}>
              {day.connectionClose.map((o, i) => <Phrase key={i} text={o} />)}
            </Section>
          )}

          {day.avoid && (
            <Section title="Avoid" color="#ef4444">
              {day.avoid.map((o, i) => (
                <div key={i} style={{ ...g.phrase, borderColor: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>✗ {o}</div>
              ))}
            </Section>
          )}

          <div style={{ ...g.tipBox, borderColor: c + '30', background: c + '10' }}>
            <span style={{ color: c, fontWeight: 800 }}>💡 </span>
            <span style={{ color: '#94a3b8' }}>{day.tip}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function LangCard({ cat }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null)
  const c = cat.color

  const copy = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <div style={{ ...g.card, borderLeft: `3px solid ${c}`, animation: 'cardEntrance 0.35s ease both' }}>
      <button style={g.cardHeader} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...g.dayPill, background: `${c}22`, color: c, fontSize: 18 }}>{cat.icon}</div>
          <div>
            <div style={g.cardTitle}>{cat.cat}</div>
            <div style={{ ...g.cardSub }}>{cat.desc}</div>
          </div>
        </div>
        <span style={{ ...g.chevron, color: c, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>▾</span>
      </button>

      {open && (
        <div style={g.cardBody}>
          {cat.phrases.map((p, i) => (
            <button key={i} style={g.langRow} onClick={() => copy(p.bisaya, i)}>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ ...g.bisayaText, color: c }}>{p.bisaya}</div>
                {p.tagalog !== p.bisaya && <div style={g.tagalogText}>{p.tagalog}</div>}
                <div style={g.englishText}>{p.english}</div>
                {p.note && <div style={g.noteText}>ℹ {p.note}</div>}
              </div>
              <div style={{ ...g.copyDot, color: copied === i ? '#34d399' : '#334155' }}>
                {copied === i ? '✓' : '⎘'}
              </div>
            </button>
          ))}
          <div style={g.copyHint}>Tap any phrase to copy Bisaya text</div>
        </div>
      )}
    </div>
  )
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...g.sectionTitle, color }}>{title}</div>
      {children}
    </div>
  )
}

function Phrase({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <button style={g.phrase} onClick={copy}>
      <span style={{ flex: 1, textAlign: 'left' }}>{text}</span>
      <span style={{ color: copied ? '#34d399' : '#334155', fontSize: 12, flexShrink: 0, marginLeft: 6 }}>
        {copied ? '✓' : '⎘'}
      </span>
    </button>
  )
}

function TalkingPoint({ tp }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(tp.text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <button style={{ ...g.tpCard, borderColor: tp.color + '30' }} onClick={copy}>
      <div style={g.tpHeader}>
        <span style={{ ...g.tpIcon, background: tp.color + '20', color: tp.color }}>{tp.icon}</span>
        <span style={{ ...g.tpTopic, color: tp.color }}>{tp.topic}</span>
        <span style={{ color: copied ? '#34d399' : '#334155', fontSize: 12, marginLeft: 'auto' }}>
          {copied ? '✓ Copied' : '⎘'}
        </span>
      </div>
      <p style={g.tpText}>{tp.text}</p>
    </button>
  )
}

/* ── Main Guide component ────────────────────── */
export default function Guide() {
  const [view, setView] = useState('convos') // 'convos' | 'language' | 'talking'

  return (
    <div style={g.root}>
      <div style={g.header}>
        <div style={g.title}>📖 Conference Guide</div>
        <div style={g.subtitle}>Offline · no internet needed · tap phrases to copy</div>
      </div>

      {/* View switcher */}
      <div style={g.switcher}>
        {[
          { key: 'convos', label: '💬 Conversations' },
          { key: 'language', label: '🇵🇭 Language' },
          { key: 'talking', label: '🎤 Talking Points' },
        ].map(v => (
          <button key={v.key}
            style={{ ...g.switchBtn, ...(view === v.key ? g.switchBtnActive : {}) }}
            onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      <div style={g.scroll}>

        {view === 'convos' && (
          <>
            <div style={g.viewDesc}>Day-by-day openers, follow-ups, and what to avoid</div>
            {CONVERSATION_DAYS.map(day => <DayCard key={day.day} day={day} />)}
          </>
        )}

        {view === 'language' && (
          <>
            <div style={g.viewDesc}>Bisaya + Tagalog · tap any phrase to copy it</div>
            {LANGUAGE_CATEGORIES.map(cat => <LangCard key={cat.cat} cat={cat} />)}
          </>
        )}

        {view === 'talking' && (
          <>
            <div style={g.viewDesc}>30-second talking points ready to use · tap to copy</div>
            {RAJU_TALKING_POINTS.map(tp => <TalkingPoint key={tp.topic} tp={tp} />)}
          </>
        )}

        <div style={{ height: 28 }} />
      </div>
    </div>
  )
}

/* ── Styles ──────────────────────────────────── */
const g = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#05060f' },
  header: { padding: '12px 18px 8px', flexShrink: 0 },
  title: { fontSize: 20, fontWeight: 800, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 3 },
  switcher: {
    display: 'flex', gap: 6, padding: '6px 14px 10px',
    flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none',
  },
  switchBtn: {
    padding: '7px 14px', borderRadius: 20, whiteSpace: 'nowrap',
    background: 'rgba(15,20,40,0.8)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#64748b', fontSize: 12, fontWeight: 700,
    transition: 'all 0.2s ease',
  },
  switchBtnActive: {
    background: 'rgba(56,189,248,0.15)',
    border: '1px solid rgba(56,189,248,0.35)',
    color: '#38bdf8',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 14px', scrollbarWidth: 'none' },
  viewDesc: { fontSize: 12, color: '#475569', marginBottom: 12, paddingTop: 2 },

  // Cards
  card: {
    background: 'rgba(10,14,28,0.7)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, marginBottom: 10, overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', width: '100%', textAlign: 'left',
    background: 'transparent',
  },
  cardBody: { padding: '0 16px 16px' },
  cardTitle: { fontSize: 15, fontWeight: 800, color: '#f1f5f9' },
  cardSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  dayPill: {
    padding: '4px 10px', borderRadius: 10, fontSize: 13,
    fontWeight: 800, flexShrink: 0,
  },
  chevron: { fontSize: 18, lineHeight: 1 },
  situationTag: {
    fontSize: 11, color: '#475569', marginBottom: 14,
    padding: '6px 10px', borderRadius: 8,
    background: 'rgba(15,20,40,0.6)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  sectionTitle: {
    fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 8,
  },
  phrase: {
    display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
    padding: '10px 12px', borderRadius: 10, marginBottom: 6,
    background: 'rgba(15,20,40,0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#cbd5e1', fontSize: 13, lineHeight: 1.5,
    transition: 'background 0.15s',
  },
  tipBox: {
    padding: '10px 12px', borderRadius: 10,
    border: '1px solid', marginTop: 4,
    fontSize: 12, lineHeight: 1.6,
  },

  // Language
  langRow: {
    display: 'flex', alignItems: 'flex-start', width: '100%', textAlign: 'left',
    padding: '11px 12px', borderRadius: 10, marginBottom: 6,
    background: 'rgba(15,20,40,0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.15s',
  },
  bisayaText: { fontSize: 15, fontWeight: 800, marginBottom: 2 },
  tagalogText: { fontSize: 12, color: '#64748b', marginBottom: 1, fontStyle: 'italic' },
  englishText: { fontSize: 13, color: '#e2e8f0', marginBottom: 2 },
  noteText: { fontSize: 11, color: '#475569', lineHeight: 1.4, marginTop: 3 },
  copyDot: { fontSize: 16, marginLeft: 8, paddingTop: 2, flexShrink: 0 },
  copyHint: { fontSize: 10, color: '#334155', textAlign: 'center', marginTop: 6 },

  // Talking points
  tpCard: {
    width: '100%', textAlign: 'left',
    background: 'rgba(10,14,28,0.7)',
    border: '1.5px solid',
    borderRadius: 16, padding: '14px 16px', marginBottom: 10,
    transition: 'background 0.15s',
  },
  tpHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  tpIcon: {
    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  },
  tpTopic: { fontSize: 14, fontWeight: 800 },
  tpText: { fontSize: 13, color: '#94a3b8', lineHeight: 1.7, margin: 0, fontStyle: 'italic' },
}
