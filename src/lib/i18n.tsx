/**
 * DoseChain i18n — typed EN/HI dictionary with a tiny React context.
 * Parent screens and message templates read from here; no hard-coded English.
 */
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "hi";

const en = {
  appName: "DoseChain",
  clinicName: "Nanhe Kadam Child Clinic",
  clinicTagline: "Every dose, on time",
  clinicTaglineHi: "नन्हे कदम",
  langToggle: "हिंदी",
  // landing
  heroTitle: "Every dose, on time — for your little one's little steps",
  heroSub:
    "Book once at Nanhe Kadam Child Clinic, Vijay Nagar, Indore. We plan your child's entire vaccine series, remind you on WhatsApp, and re-plan safely when life happens.",
  bookVaccine: "Book a vaccine",
  dogBiteCta: "Dog bite? Come now",
  statRabies: "Only 57% of dog-bite patients in India finish the full rabies vaccine course.",
  statRabiesSource: "2025 meta-analysis of 30 Indian studies",
  statDoses: "Only 71.8% of Indian children get the second measles dose — it's the later doses that get missed.",
  statDosesSource: "NFHS-6, June 2026",
  howTitle: "How it works",
  howIntro: "Book once — we remind you before every single dose, in Hindi or English.",
  stickerHero: "Little steps, big protection!",
  how1Title: "Book once",
  how1Body: "Tell us your child's birth date and vaccines already given. We plan every visit up to age 6.",
  how2Title: "We remind you",
  how2Body: "WhatsApp reminders before every visit. Reply in Hindi or English — confirm, change, or tell us baby is unwell.",
  how3Title: "The doctor keeps it safe",
  how3Body: "Every change is drafted by the system and approved by Dr. Meera. Nothing shifts without her.",
  biteFirstAidTitle: "Dog or animal bite — do this now",
  biteFirstAid1: "Wash the wound thoroughly with soap and running water for about 15 minutes (WHO advice).",
  biteFirstAid2: "Come to the clinic now — day 0 of the rabies course cannot wait.",
  biteFirstAid3: "OPD: Mon–Sat 10:00 AM–1:00 PM & 5:30–8:30 PM (IST). Sunday 10:00–11:00 AM for bite cases.",
  navHow: "How it works",
  navBite: "Bite help",
  navVisit: "Visit us",
  trustIap: "IAP 2025 schedule",
  trustWho: "WHO bite protocol",
  trustLang: "हिंदी + English",
  heroMicro: "Free reminder service · No app to install · Works on any phone",
  statTitle: "Why we built this",
  visitTitle: "Visit the clinic",
  visitOpd: "Vaccination OPD",
  visitOpdHours: "Mon–Sat · 10:00 AM–1:00 PM & 5:30–8:30 PM IST",
  visitBite: "Bite emergencies",
  visitBiteHours: "Every day · walk in anytime during OPD, Sun 10:00–11:00 AM",
  visitAddress: "214, Silver Palm Plaza, Vijay Nagar, Indore",
  visitCall: "Call the clinic",
  biteUrgent: "Don't wait for an appointment",
  biteCtaCall: "Call now — we're expecting you",
  // booking
  bookTitle: "Book your child's vaccines",
  stepChild: "Your child",
  stepHistory: "Already given?",
  stepPlan: "Your child's journey",
  stepSlot: "Pick a time",
  stepParent: "Your details",
  childName: "Child's name",
  childDob: "Date of birth",
  childSex: "Sex",
  sexGirl: "Girl",
  sexBoy: "Boy",
  historyHint: "Tick the vaccines already given — including ones given at a government centre.",
  givenAtGovt: "Given at govt centre",
  next: "Next",
  back: "Back",
  dueNow: "Due now",
  dueOn: "Due",
  pickSlot: "Pick a date and time",
  parentName: "Your name",
  parentPhone: "WhatsApp number",
  parentLang: "Preferred language",
  confirmBooking: "Confirm booking",
  bookedTitle: "You're booked!",
  bookedBody: "We'll book each next visit for you automatically and remind you on WhatsApp.",
  viewTimeline: "See the full plan",
  // timeline
  statusGiven: "Given",
  statusBooked: "Booked",
  statusPlanned: "Planned",
  statusChanged: "Changed",
  statusOverdue: "Overdue",
  statusMissed: "Missed",
  // child page
  nextVisit: "Next visit",
  reschedule: "Reschedule",
  vaccineCard: "Vaccination card",
  // bite page
  biteCourseTitle: "Your rabies vaccine course",
  biteDay: "Day",
  biteProgress: "course complete",
  biteMissedInfo: "If you miss a dose, come to the next window — do not skip. The course is resumed, never restarted.",
  // whatsapp sim
  waHeader: "Nanhe Kadam Clinic",
  waSimulated: "WhatsApp (simulated)",
  waType: "Type a reply…",
  qrConfirm: "✅ Confirm",
  qrChangeTime: "🕑 Change time",
  qrUnwell: "🤒 Baby is unwell",
  // generic
  loading: "Loading…",
  retry: "Try again",
  notFound: "This link doesn't match any record. Please check the link from your message.",
  footerDisclaimer:
    "Schedules follow IAP-ACVIP 2023 and the National Guidelines on Rabies Prophylaxis (NCDC/MoHFW). This app does not give medical advice — the doctor confirms every plan.",
} as const;

export type Dict = { [K in keyof typeof en]: string };

const hi: Dict = {
  appName: "डोज़चेन",
  clinicName: "नन्हे कदम चाइल्ड क्लिनिक",
  clinicTagline: "हर टीका, सही समय पर",
  clinicTaglineHi: "नन्हे कदम",
  langToggle: "English",
  heroTitle: "हर टीका सही समय पर — आपके बच्चे के नन्हे कदमों के लिए",
  heroSub:
    "नन्हे कदम चाइल्ड क्लिनिक, विजय नगर, इंदौर में एक बार बुक करें। हम आपके बच्चे की पूरी टीका शृंखला की योजना बनाते हैं, WhatsApp पर याद दिलाते हैं, और ज़रूरत पड़ने पर सुरक्षित रूप से नई योजना बनाते हैं।",
  bookVaccine: "टीका बुक करें",
  dogBiteCta: "कुत्ते ने काटा? अभी आएँ",
  statRabies: "भारत में कुत्ते के काटने के बाद सिर्फ़ 57% मरीज़ रेबीज़ का पूरा टीका कोर्स पूरा करते हैं।",
  statRabiesSource: "30 भारतीय अध्ययनों का 2025 विश्लेषण",
  statDoses: "सिर्फ़ 71.8% भारतीय बच्चों को खसरे का दूसरा टीका मिलता है — बाद के टीके ही सबसे ज़्यादा छूटते हैं।",
  statDosesSource: "NFHS-6, जून 2026",
  howTitle: "यह कैसे काम करता है",
  mascotHow: "नमस्ते! मैं नन्हू हूँ — एक बार बुक करें, बाकी हर टीके की याद मैं दिलाऊँगा।",
  how1Title: "एक बार बुक करें",
  how1Body: "बच्चे की जन्म तारीख और पहले से लगे टीके बताएँ। हम 6 साल की उम्र तक की हर विज़िट की योजना बनाते हैं।",
  how2Title: "हम याद दिलाते हैं",
  how2Body: "हर विज़िट से पहले WhatsApp पर याददाश्त। हिंदी या अंग्रेज़ी में जवाब दें — पक्का करें, समय बदलें, या बताएँ कि बच्चा बीमार है।",
  how3Title: "डॉक्टर सुरक्षा संभालती हैं",
  how3Body: "हर बदलाव सिस्टम सिर्फ़ सुझाता है — डॉ. मीरा की मंज़ूरी के बिना कुछ नहीं बदलता।",
  biteFirstAidTitle: "कुत्ते या जानवर के काटने पर अभी यह करें",
  biteFirstAid1: "घाव को साबुन और बहते पानी से लगभग 15 मिनट अच्छी तरह धोएँ (WHO की सलाह)।",
  biteFirstAid2: "तुरंत क्लिनिक आएँ — रेबीज़ कोर्स का पहला दिन (दिन 0) टाला नहीं जा सकता।",
  biteFirstAid3: "OPD: सोम–शनि सुबह 10:00–दोपहर 1:00 और शाम 5:30–8:30 (IST)। रविवार सुबह 10:00–11:00 सिर्फ़ काटने के मरीज़ों के लिए।",
  navHow: "यह कैसे काम करता है",
  navBite: "काटने पर मदद",
  navVisit: "क्लिनिक आएँ",
  trustIap: "IAP 2025 शिड्यूल",
  trustWho: "WHO काटने का प्रोटोकॉल",
  trustLang: "हिंदी + English",
  heroMicro: "मुफ़्त याददाश्त सेवा · कोई ऐप इंस्टॉल नहीं · हर फ़ोन पर चलता है",
  statTitle: "हमने यह क्यों बनाया",
  visitTitle: "क्लिनिक पर आएँ",
  visitOpd: "टीकाकरण OPD",
  visitOpdHours: "सोम–शनि · सुबह 10:00–दोपहर 1:00 और शाम 5:30–8:30 IST",
  visitBite: "काटने की इमरजेंसी",
  visitBiteHours: "हर दिन · OPD के दौरान कभी भी आएँ, रविवार सुबह 10:00–11:00",
  visitAddress: "214, सिल्वर पाम प्लाज़ा, विजय नगर, इंदौर",
  visitCall: "क्लिनिक को कॉल करें",
  biteUrgent: "अपॉइंटमेंट का इंतज़ार न करें",
  biteCtaCall: "अभी कॉल करें — हम आपका इंतज़ार कर रहे हैं",
  bookTitle: "अपने बच्चे के टीके बुक करें",
  stepChild: "आपका बच्चा",
  stepHistory: "पहले से लगे टीके?",
  stepPlan: "बच्चे का सफ़र",
  stepSlot: "समय चुनें",
  stepParent: "आपकी जानकारी",
  childName: "बच्चे का नाम",
  childDob: "जन्म तारीख",
  childSex: "लिंग",
  sexGirl: "लड़की",
  sexBoy: "लड़का",
  historyHint: "जो टीके पहले लग चुके हैं उन्हें टिक करें — सरकारी केंद्र पर लगे टीके भी शामिल हैं।",
  givenAtGovt: "सरकारी केंद्र पर लगा",
  next: "आगे",
  back: "पीछे",
  dueNow: "अभी देना है",
  dueOn: "तारीख",
  pickSlot: "तारीख और समय चुनें",
  parentName: "आपका नाम",
  parentPhone: "WhatsApp नंबर",
  parentLang: "पसंदीदा भाषा",
  confirmBooking: "बुकिंग पक्की करें",
  bookedTitle: "बुकिंग हो गई!",
  bookedBody: "हम हर अगली विज़िट अपने आप बुक करेंगे और WhatsApp पर याद दिलाएँगे।",
  viewTimeline: "पूरी योजना देखें",
  statusGiven: "लग गया",
  statusBooked: "बुक्ड",
  statusPlanned: "योजना में",
  statusChanged: "बदला हुआ",
  statusOverdue: "देर हुई",
  statusMissed: "छूट गया",
  nextVisit: "अगली विज़िट",
  reschedule: "समय बदलें",
  vaccineCard: "टीका कार्ड",
  biteCourseTitle: "आपका रेबीज़ टीका कोर्स",
  biteDay: "दिन",
  biteProgress: "कोर्स पूरा",
  biteMissedInfo: "अगर कोई खुराक छूट जाए तो अगली विंडो में आ जाएँ — छोड़ें नहीं। कोर्स वहीं से जारी होता है, दोबारा शुरू नहीं।",
  waHeader: "नन्हे कदम क्लिनिक",
  waSimulated: "WhatsApp (नकली)",
  waType: "जवाब लिखें…",
  qrConfirm: "✅ पक्का करें",
  qrChangeTime: "🕑 समय बदलें",
  qrUnwell: "🤒 बच्चा बीमार है",
  loading: "लोड हो रहा है…",
  retry: "फिर कोशिश करें",
  notFound: "यह लिंक किसी रिकॉर्ड से नहीं मिलता। कृपया अपने मैसेज वाला लिंक जाँचें।",
  footerDisclaimer:
    "टीका कार्यक्रम IAP-ACVIP 2023 और रेबीज़ रोकथाम के राष्ट्रीय दिशानिर्देशों (NCDC/MoHFW) पर आधारित है। यह ऐप चिकित्सा सलाह नहीं देता — हर योजना की पुष्टि डॉक्टर करती हैं।",
};

const dicts: Record<Lang, Dict> = { en, hi };

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}>({ lang: "en", setLang: () => {}, t: en });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  return (
    <LangContext.Provider value={{ lang, setLang, t: dicts[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
