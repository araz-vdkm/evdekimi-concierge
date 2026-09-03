import { saveRecord, getRecord } from './db';

export interface OneNightStayPackage {
  reservation: {
    id: string;
    confirmationCode: string;
    guestName: string;
    guestEmail: string;
    villa: string;
    complexName: string;
    unitName: string;
    checkInDate: string;
    checkOutDate: string;
    guests: string;
    status: string;
  };
  preCheckInReport: any;
  guestRegRecord: any;
  postCheckOutReport: any;
  minibarRecord: any;
  surveyRecord: any;
}

export const createOneNightStayReports = async (customStay?: Partial<OneNightStayPackage['reservation']>) => {
  const today = new Date();
  const formatDate = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const bookingId = customStay?.id || customStay?.confirmationCode || "RES-805";
  const guestName = customStay?.guestName || "Elena Rostova";
  const guestEmail = customStay?.guestEmail || "elena.rostova@example.com";
  const complexName = customStay?.complexName || "Dragon Stone Villas";
  const unitName = customStay?.unitName || "DragonStone V1";
  const checkInDate = customStay?.checkInDate || formatDate(0);
  const checkOutDate = customStay?.checkOutDate || formatDate(1); // 1 night stay

  const reservation = {
    id: bookingId,
    confirmationCode: bookingId,
    guestName,
    guestEmail,
    villa: complexName,
    complexName,
    unitName,
    checkInDate,
    checkOutDate,
    guests: "2 Adults",
    status: "Confirmed"
  };

  // 1. Pre-Check-In Report
  const preCheckInData = {
    id: bookingId,
    bookingId,
    confirmationCode: bookingId,
    complexName,
    unitName,
    villa: unitName,
    checkInDate,
    checkOutDate,
    guestName,
    submittedBy: "Roman Ignatenko (Concierge Lead)",
    inspectorName: "Roman Ignatenko (Concierge Lead)",
    submittedAt: new Date().toISOString(),
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text x="10" y="25" fill="#0f766e" font-family="sans-serif" font-weight="bold">R.Ignatenko</text></svg>',
    data: {
      exterior: {
        poolCleanliness: { status: 'checked', notes: 'Pool pH balanced, fresh water clarity verified', photos: [] },
        gardenLighting: { status: 'checked', notes: 'Pathway lamps operational', photos: [] }
      },
      livingRoom: {
        aircon: { status: 'checked', notes: 'Set at optimal 22°C', photos: [] },
        cleanliness: { status: 'checked', notes: 'Pristine setup with welcome fruits', photos: [] },
        wifiSpeed: { status: 'checked', notes: 'High-speed 150Mbps tested', photos: [] }
      },
      bedroom: {
        bedding: { status: 'checked', notes: 'Egyptian cotton linens crisp & fresh', photos: [] },
        safeBox: { status: 'checked', notes: 'Master reset verified', photos: [] }
      },
      bathroom: {
        amenities: { status: 'checked', notes: 'Full luxury botanical set replenished', photos: [] },
        hotWater: { status: 'checked', notes: 'Instant high-pressure hot water confirmed', photos: [] }
      },
      minibar: {
        stockLevel: { status: 'checked', notes: '100% full inventory stocked per standard', photos: [] }
      }
    },
    hasDefects: false,
    defectCount: 0,
    isQATest: true,
    isOneNightStayReport: true
  };

  // 2. Guest Registration Record & Profile
  const guestRegData = {
    id: bookingId,
    bookingId,
    confirmationCode: bookingId,
    fullName: guestName,
    passportNumber: "EP-89241029",
    nationality: "Switzerland",
    dob: "1992-06-18",
    purpose: "Holiday / 1-Night Anniversary Stay",
    upsell: "Floating Breakfast, Airport VIP Fast-Track",
    status: "Checked-In",
    checkInDate,
    checkOutDate,
    complexName,
    unitName,
    guestsCount: "2 Adults",
    contactNumber: "+41 79 123 4567",
    contactEmail: guestEmail,
    timestamp: new Date().toISOString(),
    answers: {
      celebration: "Wedding Anniversary",
      interests: "Private Dining, Yoga, Scuba Diving",
      dietary: "Gluten-Free, Fresh Juices",
      nextDestination: "Nusa Lembongan"
    },
    isQATest: true,
    isOneNightStayReport: true
  };

  // 3. Post-Check-Out Report & Minibar Ledger
  const minibarRecordId = `minibar_${bookingId}`;
  const minibarItems = [
    { name: "Bintang Beer (Can)", quantity: 2, price: 35000 },
    { name: "San Pellegrino (Sparkling)", quantity: 1, price: 45000 },
    { name: "Pringles Potato Crisps", quantity: 1, price: 35000 },
    { name: "Roasted Cashews", quantity: 1, price: 65000 }
  ];
  const totalMinibarBill = (2 * 35000) + (1 * 45000) + (1 * 35000) + (1 * 65000); // 215,000 IDR

  const postCheckOutData = {
    id: bookingId,
    bookingId,
    confirmationCode: bookingId,
    complexName,
    unitName,
    checkOutDate,
    guestName,
    submittedBy: "Roman Ignatenko (Concierge Lead)",
    minibarConsumed: minibarItems,
    totalMinibarAmount: totalMinibarBill,
    roomCondition: "Immaculate condition. No damages or missing items.",
    damageReported: false,
    submittedAt: new Date().toISOString(),
    isQATest: true,
    isOneNightStayReport: true
  };

  const minibarRecord = {
    id: minibarRecordId,
    bookingId,
    confirmationCode: bookingId,
    guestName,
    complexName,
    unitName,
    createdAt: new Date().toISOString(),
    createdBy: "Roman Ignatenko (Concierge Lead)",
    items: minibarItems,
    totalRevenue: totalMinibarBill,
    notes: `1-Night stay checkout minibar consumption for ${guestName}`,
    source: "post_checkout",
    isQATest: true,
    isOneNightStayReport: true
  };

  // 4. Survey Report & Dispatch
  const surveyData = {
    id: bookingId,
    bookingId,
    confirmationCode: bookingId,
    guestName,
    guestEmail,
    complexName,
    unitName,
    ratingOverall: 5,
    ratingCleanliness: 5,
    ratingStaff: 5,
    ratingComfort: 5,
    npsScore: 10,
    feedback: "Unbelievable 1-night luxury stay! The concierge service, villa staging, and amenities were top-tier.",
    submittedAt: new Date().toISOString(),
    recipient: guestEmail,
    sender: "concierge@evdekimi.com",
    subject: `How was your stay at ${complexName}? We'd love your feedback! 🌸 - EVDEkimi Concierge Team`,
    status: "Sent",
    isQATest: true,
    isOneNightStayReport: true
  };

  // Save to Firestore collections
  await saveRecord('pre_checkin', bookingId, preCheckInData);
  await saveRecord('guest_reg', bookingId, {
    bookingId,
    confirmationCode: bookingId,
    guestName,
    registeredAt: new Date().toISOString(),
    isQATest: true
  });
  await saveRecord('guests', bookingId, guestRegData);
  await saveRecord('post_checkout', bookingId, postCheckOutData);
  await saveRecord('minibar', minibarRecordId, minibarRecord);
  await saveRecord('survey', bookingId, surveyData);

  // Sync to localStorage keys so Operations Board immediately reflects completed status
  try {
    localStorage.setItem(`pre_checkin_${bookingId}`, JSON.stringify(preCheckInData));
    localStorage.setItem(`guest_reg_${bookingId}`, 'true');
    localStorage.setItem(`post_checkout_${bookingId}`, JSON.stringify(postCheckOutData));
    
    // Also save under name and unit keys
    const gNameClean = guestName.toLowerCase().trim();
    const uNameClean = unitName.toLowerCase().trim();
    localStorage.setItem(`pre_checkin_name_${gNameClean}`, 'true');
    localStorage.setItem(`guest_reg_name_${gNameClean}`, 'true');
    localStorage.setItem(`post_checkout_name_${gNameClean}`, 'true');
    localStorage.setItem(`pre_checkin_unit_${uNameClean}_${checkInDate}`, 'true');
    localStorage.setItem(`guest_reg_unit_${uNameClean}_${checkInDate}`, 'true');
    localStorage.setItem(`post_checkout_unit_${uNameClean}_${checkOutDate}`, 'true');

    // Update sent_surveys mapping
    const existingSurveys = JSON.parse(localStorage.getItem('sent_surveys') || '{}');
    existingSurveys[bookingId] = true;
    existingSurveys[guestEmail] = true;
    existingSurveys[gNameClean] = true;
    localStorage.setItem('sent_surveys', JSON.stringify(existingSurveys));

    // Ensure cached reservations include this 1-night stay
    try {
      const cached = JSON.parse(localStorage.getItem('concierge_cached_reservations') || '[]');
      if (Array.isArray(cached) && !cached.some((r: any) => r.id === bookingId || r.confirmationCode === bookingId)) {
        cached.unshift(reservation);
        localStorage.setItem('concierge_cached_reservations', JSON.stringify(cached));
      }
    } catch (e) {}

    // Dispatch sync events to refresh all components
    window.dispatchEvent(new Event('local-storage-synced'));
    window.dispatchEvent(new Event('refresh-data'));
  } catch (e) {
    console.warn("Storage sync warning:", e);
  }

  return {
    reservation,
    preCheckInReport: preCheckInData,
    guestRegRecord: guestRegData,
    postCheckOutReport: postCheckOutData,
    minibarRecord,
    surveyRecord: surveyData
  };
};
