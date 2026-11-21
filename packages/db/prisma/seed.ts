import crypto from "node:crypto";
import { Prisma, prisma } from "../src/index";
import { normalizeQrStyle } from "@qira/shared";

const DEMO_USER_ID = "demo-user";

function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pin, salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

async function main() {
  console.log("Seeding QIRA QRs Pro demo data for user:", DEMO_USER_ID);

  // 0. Demo User account (demo@qira.alkonpos.com / demo1234)
  await prisma.user.upsert({
    where: { email: "demo@qira.alkonpos.com" },
    update: {
      name: "Estudio QIRA Demo",
      passwordHash: hashPin("demo1234"),
    },
    create: {
      id: DEMO_USER_ID,
      email: "demo@qira.alkonpos.com",
      name: "Estudio QIRA Demo",
      passwordHash: hashPin("demo1234"),
    },
  });

  // 1. Dynamic URL QR with schedule + device + language rules and UTM params
  const urlQr = await prisma.qrCode.upsert({
    where: { slug: "qiraMenu" },
    update: {
      name: "Café QIRA — Smart Menu",
      userId: DEMO_USER_ID,
      destinationType: "url",
      defaultUrl: "https://qira.example.com/menu/general",
      fallbackUrl: "https://qira.example.com/closed",
      timezone: "America/Bogota",
      utmParams: {
        utm_source: "qr_table",
        utm_medium: "print",
        utm_campaign: "cafe_2026",
      },
      styleConfig: normalizeQrStyle({
        dotsOptions: {
          type: "extra-rounded",
          color: "#1e1b4b",
          gradient: {
            type: "linear",
            rotation: 45,
            colorStops: [
              { offset: 0, color: "#4f46e5" },
              { offset: 1, color: "#06b6d4" },
            ],
          },
        },
        cornersSquareOptions: { type: "extra-rounded", color: "#312e81" },
        cornersDotOptions: { type: "dot", color: "#06b6d4" },
        backgroundOptions: { color: "#ffffff" },
      }) as unknown as Prisma.InputJsonValue,
      status: "active",
    },
    create: {
      userId: DEMO_USER_ID,
      name: "Café QIRA — Smart Menu",
      slug: "qiraMenu",
      destinationType: "url",
      defaultUrl: "https://qira.example.com/menu/general",
      fallbackUrl: "https://qira.example.com/closed",
      timezone: "America/Bogota",
      utmParams: {
        utm_source: "qr_table",
        utm_medium: "print",
        utm_campaign: "cafe_2026",
      },
      styleConfig: normalizeQrStyle({
        dotsOptions: {
          type: "extra-rounded",
          color: "#1e1b4b",
          gradient: {
            type: "linear",
            rotation: 45,
            colorStops: [
              { offset: 0, color: "#4f46e5" },
              { offset: 1, color: "#06b6d4" },
            ],
          },
        },
        cornersSquareOptions: { type: "extra-rounded", color: "#312e81" },
        cornersDotOptions: { type: "dot", color: "#06b6d4" },
        backgroundOptions: { color: "#ffffff" },
      }) as unknown as Prisma.InputJsonValue,
      status: "active",
    },
  });

  await prisma.qrRoutingRule.deleteMany({ where: { qrId: urlQr.id } });
  await prisma.qrRoutingRule.createMany({
    data: [
      {
        qrId: urlQr.id,
        ruleType: "schedule",
        conditionData: { days: [1, 2, 3, 4, 5], start: "07:00", end: "11:30" },
        targetUrl: "https://qira.example.com/menu/breakfast",
        priority: 1,
      },
      {
        qrId: urlQr.id,
        ruleType: "device",
        conditionData: { os: ["iOS"] },
        targetUrl: "https://qira.example.com/app/ios",
        priority: 2,
      },
      {
        qrId: urlQr.id,
        ruleType: "language",
        conditionData: { languages: ["en"] },
        targetUrl: "https://qira.example.com/menu/en",
        priority: 3,
      },
    ],
  });

  // 2. vCard QR
  const vcardLanding = {
    kind: "vcard",
    vcard: {
      firstName: "Valentina",
      lastName: "Ríos",
      title: "Creative Director",
      company: "QIRA Studio",
      phone: "+573001234567",
      whatsapp: "+573001234567",
      email: "valentina@qira.example.com",
      website: "https://qira.example.com/",
      address: "Calle 85 #12-34, Bogotá, Colombia",
      note: "Dynamic QR & Print Studio Platform",
    },
  };

  const vcardQr = await prisma.qrCode.upsert({
    where: { slug: "valVcard" },
    update: {
      name: "Valentina Ríos — Digital vCard",
      userId: DEMO_USER_ID,
      destinationType: "vcard",
      defaultUrl: null,
      landingData: vcardLanding as unknown as Prisma.InputJsonValue,
      styleConfig: normalizeQrStyle({
        dotsOptions: { type: "classy-rounded", color: "#0f172a" },
        cornersSquareOptions: { type: "extra-rounded", color: "#0f172a" },
        cornersDotOptions: { type: "dot", color: "#6366f1" },
        backgroundOptions: { color: "#ffffff" },
      }) as unknown as Prisma.InputJsonValue,
      status: "active",
    },
    create: {
      userId: DEMO_USER_ID,
      name: "Valentina Ríos — Digital vCard",
      slug: "valVcard",
      destinationType: "vcard",
      defaultUrl: null,
      landingData: vcardLanding as unknown as Prisma.InputJsonValue,
      styleConfig: normalizeQrStyle({
        dotsOptions: { type: "classy-rounded", color: "#0f172a" },
        cornersSquareOptions: { type: "extra-rounded", color: "#0f172a" },
        cornersDotOptions: { type: "dot", color: "#6366f1" },
        backgroundOptions: { color: "#ffffff" },
      }) as unknown as Prisma.InputJsonValue,
      status: "active",
    },
  });

  // 3. Link Hub QR
  const hubLanding = {
    kind: "hub",
    hub: {
      title: "QIRA Roast & Co.",
      description: "Specialty Colombian coffee, reservations, and online store.",
      theme: {
        background: "#09090b",
        foreground: "#fafafa",
        accent: "#6366f1",
      },
      buttons: [
        { id: "btn-menu", label: "Digital Menu", url: "https://qira.example.com/menu", icon: "menu" },
        { id: "btn-wa", label: "Book via WhatsApp", url: "https://wa.me/573001234567", icon: "whatsapp" },
        { id: "btn-ig", label: "Follow on Instagram", url: "https://instagram.com/qirastudio", icon: "instagram" },
        { id: "btn-shop", label: "Order Coffee Beans", url: "https://qira.example.com/shop", icon: "shop" },
      ],
    },
  };

  const hubQr = await prisma.qrCode.upsert({
    where: { slug: "qiraHub" },
    update: {
      name: "QIRA Roast & Co. — Link Hub",
      userId: DEMO_USER_ID,
      destinationType: "hub",
      defaultUrl: null,
      landingData: hubLanding as unknown as Prisma.InputJsonValue,
      styleConfig: normalizeQrStyle({
        dotsOptions: { type: "dots", color: "#111827" },
        cornersSquareOptions: { type: "dot", color: "#4f46e5" },
        cornersDotOptions: { type: "dot", color: "#4f46e5" },
        backgroundOptions: { color: "#ffffff" },
      }) as unknown as Prisma.InputJsonValue,
      status: "active",
    },
    create: {
      userId: DEMO_USER_ID,
      name: "QIRA Roast & Co. — Link Hub",
      slug: "qiraHub",
      destinationType: "hub",
      defaultUrl: null,
      landingData: hubLanding as unknown as Prisma.InputJsonValue,
      styleConfig: normalizeQrStyle({
        dotsOptions: { type: "dots", color: "#111827" },
        cornersSquareOptions: { type: "dot", color: "#4f46e5" },
        cornersDotOptions: { type: "dot", color: "#4f46e5" },
        backgroundOptions: { color: "#ffffff" },
      }) as unknown as Prisma.InputJsonValue,
      status: "active",
    },
  });

  // 4. PIN-protected QR (PIN: 1234)
  const pinHash = hashPin("1234");
  const pinQr = await prisma.qrCode.upsert({
    where: { slug: "qiraVip" },
    update: {
      name: "VIP Press Kit (PIN: 1234)",
      userId: DEMO_USER_ID,
      destinationType: "url",
      defaultUrl: "https://qira.example.com/vip-press-kit",
      pinCode: pinHash,
      styleConfig: normalizeQrStyle({
        dotsOptions: { type: "rounded", color: "#18181b" },
        cornersSquareOptions: { type: "square", color: "#18181b" },
        cornersDotOptions: { type: "square", color: "#ef4444" },
        backgroundOptions: { color: "#ffffff" },
      }) as unknown as Prisma.InputJsonValue,
      status: "active",
    },
    create: {
      userId: DEMO_USER_ID,
      name: "VIP Press Kit (PIN: 1234)",
      slug: "qiraVip",
      destinationType: "url",
      defaultUrl: "https://qira.example.com/vip-press-kit",
      pinCode: pinHash,
      styleConfig: normalizeQrStyle({
        dotsOptions: { type: "rounded", color: "#18181b" },
        cornersSquareOptions: { type: "square", color: "#18181b" },
        cornersDotOptions: { type: "square", color: "#ef4444" },
        backgroundOptions: { color: "#ffffff" },
      }) as unknown as Prisma.InputJsonValue,
      status: "active",
    },
  });

  // 5. Sample CardDesign (9x5 cm business card with 3mm bleed)
  const DEMO_CARD_ID = "00000000-0000-4000-8000-000000000001";
  const frontCanvas = {
    background: { enabled: true, color: "#0f172a" },
    layers: [
      {
        id: "layer-title",
        type: "text",
        name: "Full Name",
        x: 60,
        y: 120,
        text: "Valentina Ríos",
        fontFamily: "Inter",
        fontSize: 48,
        fontWeight: "bold",
        fill: "#f8fafc",
        align: "left",
        locked: false,
      },
      {
        id: "layer-role",
        type: "text",
        name: "Role",
        x: 60,
        y: 190,
        text: "Creative Director · QIRA Studio",
        fontFamily: "Inter",
        fontSize: 26,
        fontWeight: "normal",
        fill: "#94a3b8",
        align: "left",
        locked: false,
      },
      {
        id: "layer-qr",
        type: "qr",
        name: "vCard QR",
        x: 720,
        y: 135,
        width: 280,
        height: 280,
        qrId: vcardQr.id,
        locked: false,
      },
    ],
  };

  await prisma.cardDesign.upsert({
    where: { id: DEMO_CARD_ID },
    update: {
      userId: DEMO_USER_ID,
      qrId: vcardQr.id,
      name: "Valentina Ríos — Business Card (9×5 cm)",
      widthCm: 9,
      heightCm: 5,
      bleedMm: 3,
      isDoubleSided: false,
      frontCanvasJson: frontCanvas as unknown as Prisma.InputJsonValue,
    },
    create: {
      id: DEMO_CARD_ID,
      userId: DEMO_USER_ID,
      qrId: vcardQr.id,
      name: "Valentina Ríos — Business Card (9×5 cm)",
      widthCm: 9,
      heightCm: 5,
      bleedMm: 3,
      isDoubleSided: false,
      frontCanvasJson: frontCanvas as unknown as Prisma.InputJsonValue,
    },
  });

  // 6. ~300 synthetic scans over the last 30 days (idempotent replacement for seeded QRs)
  const seededQrIds = [urlQr.id, vcardQr.id, hubQr.id, pinQr.id];
  await prisma.qrScan.deleteMany({ where: { qrId: { in: seededQrIds } } });

  const cities: Array<{ city: string; country: string }> = [
    { city: "Bogotá", country: "CO" },
    { city: "Medellín", country: "CO" },
    { city: "Cali", country: "CO" },
    { city: "Barranquilla", country: "CO" },
    { city: "Mexico City", country: "MX" },
    { city: "Madrid", country: "ES" },
    { city: "Miami", country: "US" },
    { city: "Buenos Aires", country: "AR" },
  ];
  const devices: Array<{ os: string; deviceType: string }> = [
    { os: "iOS", deviceType: "mobile" },
    { os: "iOS", deviceType: "mobile" },
    { os: "Android", deviceType: "mobile" },
    { os: "Android", deviceType: "mobile" },
    { os: "Desktop", deviceType: "desktop" },
    { os: "iOS", deviceType: "tablet" },
  ];
  const qrWeights = [
    { id: urlQr.id, url: "https://qira.example.com/menu/general" },
    { id: urlQr.id, url: "https://qira.example.com/menu/breakfast" },
    { id: vcardQr.id, url: "http://localhost:3000/p/valVcard" },
    { id: hubQr.id, url: "http://localhost:3000/p/qiraHub" },
    { id: pinQr.id, url: "https://qira.example.com/vip-press-kit" },
  ];

  const now = Date.now();
  const scanRows: Prisma.QrScanCreateManyInput[] = [];
  const totalScans = 300;

  for (let i = 0; i < totalScans; i++) {
    const daysAgo = i % 30;
    const hourOffset = (i * 7) % 24;
    const minuteOffset = (i * 13) % 60;
    const scannedAt = new Date(now - (daysAgo * 24 + hourOffset) * 3600_000 - minuteOffset * 60_000);

    const loc = cities[i % cities.length]!;
    const dev = devices[i % devices.length]!;
    const target = qrWeights[i % qrWeights.length]!;
    const visitorSlot = i % 190; // creates realistic repeat vs unique scan distribution
    const visitorHash = crypto
      .createHash("sha256")
      .update(`seed-visitor-${daysAgo}-${visitorSlot}`)
      .digest("hex");

    scanRows.push({
      qrId: target.id,
      scannedAt,
      visitorHash,
      country: loc.country,
      city: loc.city,
      os: dev.os,
      deviceType: dev.deviceType,
      resolvedUrl: target.url,
    });
  }

  await prisma.qrScan.createMany({ data: scanRows });
  console.log(`Seed complete: 4 QR codes, 1 CardDesign, and ${scanRows.length} synthetic scans.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
