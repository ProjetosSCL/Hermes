import { AngelRegistration, initialAngelRegistrations } from "../data/angelRegistrationData";
import { AngelPerformanceSummary } from "../types/performance";
import { normalizeName } from "./workfinityParser";

/**
 * Converts Google Drive file URLs to direct thumbnail URLs
 */
export function driveToDirectUrl(url?: string): string {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
  }
  return url;
}

/**
 * Formats WhatsApp string to direct wa.me link
 */
export function getWhatsAppUrl(whatsapp?: string): string | null {
  if (!whatsapp) return null;
  const cleanPhone = whatsapp.replace(/\D/g, '');
  if (!cleanPhone) return null;
  return `https://wa.me/55${cleanPhone}`;
}

/**
 * Finds AngelRegistration by name or partial name match
 */
export function findAngelRegistration(
  angelName: string,
  registrations: AngelRegistration[] = initialAngelRegistrations
): AngelRegistration | undefined {
  if (!angelName) return undefined;
  const normTarget = normalizeName(angelName);

  // Exact or normalized match
  let found = registrations.find(
    (reg) => normalizeName(reg.nome) === normTarget || reg.nome.toLowerCase() === angelName.toLowerCase()
  );

  if (found) return found;

  // Substring or key parts match
  const parts = normTarget.split(" ").filter((p) => p.length > 2);
  if (parts.length > 0) {
    found = registrations.find((reg) => {
      const regNorm = normalizeName(reg.nome);
      return parts.every((p) => regNorm.includes(p));
    });
  }

  return found;
}

/**
 * Enriches AngelPerformanceSummary with registration details (fotoUrl, whatsapp, uniform sizes)
 */
export function enrichAngelSummary(
  summary: AngelPerformanceSummary,
  registrations: AngelRegistration[] = initialAngelRegistrations
): AngelPerformanceSummary {
  const reg = findAngelRegistration(summary.angelName, registrations);
  if (!reg) return summary;

  return {
    ...summary,
    whatsapp: summary.whatsapp || reg.whatsapp,
    jaqueta: summary.jaqueta || reg.jaqueta,
    calca: summary.calca || reg.calca,
    botas: summary.botas || reg.botas,
    capacete: summary.capacete || reg.capacete,
    fotoUrl: summary.fotoUrl || reg.fotoUrl,
    registrationId: reg.id,
  };
}

/**
 * Ensures all registered Green Angels from angelRegistrationData exist in AngelPerformanceSummary list
 */
export function buildEnrichedAngelSummaries(
  existingSummaries: AngelPerformanceSummary[],
  registrations: AngelRegistration[] = initialAngelRegistrations
): AngelPerformanceSummary[] {
  // First, enrich existing summaries
  const enriched = existingSummaries.map((s) => enrichAngelSummary(s, registrations));

  // Add missing angels from registration data with default stats
  registrations.forEach((reg) => {
    const exists = enriched.some(
      (s) => normalizeName(s.angelName) === normalizeName(reg.nome) || s.registrationId === reg.id
    );

    if (!exists) {
      // Map franchise key to city
      const franchiseCityMap: Record<string, string> = {
        "JOÃO CAMARA": "João Câmara/RN",
        "LIMOEIRO DO NORTE": "Limoeiro do Norte/CE",
        TRAIRI: "Trairi/CE",
        APODI: "Apodi/RN",
        PARACATU: "Paracatu/MG",
        MACAU: "Macau/RN",
        PATOS: "Patos/PB",
        PARELHAS: "Parelhas/RN",
      };

      const city = franchiseCityMap[reg.franquiaKey] || `${reg.franquia}`;
      const franchiseClean = reg.franquia.replace(/^[A-Z]{2}\s*-\s*/, '');

      enriched.push({
        angelId: reg.id,
        angelName: reg.nome,
        franchiseName: franchiseClean,
        city: city,
        jobTitle: "Green Angel",
        isReverseLogisticsResp: false,
        dailyOsCount: 10,
        weeklyOsCount: 45,
        monthlyOsCount: 160,
        yearlyOsCount: 1050,
        workedDaysCount: 19,
        realDailyAverage: 8.42,
        individualRebateShare: 3200.0,
        TMAStoneMet: true,
        TMATonMet: true,
        CicloMet: true,
        earnedPercentage: 0.03,
        predictedValue: 96.0,
        finalValue: 96.0,
        projectedClosingValue: 115.0,
        missingForMaxRemuneration: 0,
        whatsapp: reg.whatsapp,
        jaqueta: reg.jaqueta,
        calca: reg.calca,
        botas: reg.botas,
        capacete: reg.capacete,
        fotoUrl: reg.fotoUrl,
        registrationId: reg.id,
      });
    }
  });

  return enriched;
}
