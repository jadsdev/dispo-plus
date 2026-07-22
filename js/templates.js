const ERR = (msg) =>
  `<span style="color:var(--red);font-weight:600;">ERROR: ${msg}</span>`;

// ── MAX PENALTY ──────────────────────────────
function buildMaxPenaltyText({ status, offense, sentence, month, year, offenseCountry }) {
  if (!offense || !year) return "";

  const statusText = { Arrested: "was arrested", Detained: "was detained", Convicted: "was convicted" }[status] || "was involved";
  const activeCountry = offenseCountry || "Pakistan";
  const monthPrefix   = month ? `${month} ` : "";

  return (
    `Per CMS, the hit ${statusText} in ${monthPrefix}${year} for ${offense}. ` +
    `Given the severity of the crime in ${activeCountry} where the maximum sentence is ${sentence}, ` +
    `they are expected to serve a long time in prison. This is false positive.`
  );
}

// ── COMMON NAME ──────────────────────────────
function buildCommonNameText({ givenVal, middleVal, surnameVal, countryVal, countryKey }) {
  if (!givenVal || !countryVal) {
    return ERR("Common Name cannot be generated (missing Given Name and/or Country).");
  }

  const givenData   = findNameData(NameStatsByCountry, countryKey, givenVal);
  const middleData  = middleVal ? findNameData(NameStatsByCountry, countryKey, middleVal) : null;
  const surnameData = surnameVal ? findNameData(NameStatsByCountry, countryKey, surnameVal) : null;

  const missingParts = [];
  if (!givenData)                 missingParts.push(givenVal);
  if (middleVal && !middleData)   missingParts.push(middleVal);
  if (surnameVal && !surnameData) missingParts.push(surnameVal);

  if (missingParts.length) {
    return ERR(
      `${missingParts.join(", ")} not found in common name list for ${countryVal}. ` +
      `Common Name disposition cannot be applied.`
    );
  }

  const fullName = [givenVal, middleVal, surnameVal].filter(Boolean).join(" ");
  const parts = [
    `Common name match. As per CMS, the hit is ${fullName} with location in ${countryVal} and no other identifiers noted. ` +
    `As per KYC, our user is ${fullName} and country of stay is ${countryVal}. ` +
    `Noted name and location match between hit and user, however as per "TTL Onboarding Risk-Based Disposition Factors", `
  ];

  if (givenData)               parts.push(`${givenVal} has an incidence of ${givenData.incidence} and a ratio of ${givenData.frequency}.`);
  if (middleVal && middleData) parts.push(`${middleVal} has an incidence of ${middleData.incidence} and a ratio of ${middleData.frequency}.`);
  if (surnameVal && surnameData) parts.push(`${surnameVal} has an incidence of ${surnameData.incidence} and a ratio of ${surnameData.frequency}.`);

  parts.push(`Given the commonality of the name components, it is unlikely that user and hit are the same individual. Hence, this is a false positive.`);

  return parts.join(" ");
}

// ── JUVENILE ─────────────────────────────────
function buildJuvenileText({ isMinor }) {
  if (!isMinor) {
    return ERR("Juvenile Disposition cannot be applied. User is not a minor.");
  }
  return (
    `Juvenile Anonymity. The report relates to an offence committed when the subject was a minor (under 18). ` +
    `International child-protection standards generally restrict the disclosure of juveniles' identities in legal proceedings and media reporting. ` +
    `As such, the presence of identifying details makes it unlikely that the report refers to the client. ` +
    `Therefore, the match is assessed as a false positive.`
  );
}

// ── RESIDENCY MISMATCH ───────────────────────
function buildResidencyMismatchText({ userCountry, hitCountry, userCountryRaw, hitCountryRaw }) {
  if (!hitCountry || !userCountry) {
    return ERR("Residency Mismatch cannot be generated (missing Hit Info or User Country).");
  }
  if (hitCountry === userCountry) {
    return ERR(`No Residency Mismatch. User and hit share the same country (${userCountryRaw}).`);
  }
  return (
    `Residency Mismatch. Per CMS, hit is a ${hitCountryRaw} resident while the user is from ${userCountryRaw}. ` +
    `As the hit and user have different residency, this is a false positive.`
  );
}

// ── CITIZENSHIP MISMATCH ─────────────────────
function buildCitizenshipMismatchText({
  userCitizenship,
  hitCitizenship,
  hitCountry,
  idIssueDate,
  offenseMonth
}) {
  if (!userCitizenship || !hitCitizenship) {
    return ERR("Citizenship Mismatch cannot be generated (missing User or Hit Citizenship).");
  }

  if ((userCitizenship || "").trim().toLowerCase() === (hitCitizenship || "").trim().toLowerCase()) {
    return ERR(`No Citizenship Mismatch. User and hit share the same citizenship (${userCitizenship}).`);
  }

  const yearText = offenseMonth ? `based on the latest CMS update ${offenseMonth}` : "based on the latest CMS update";
  const issueText = idIssueDate
    ? `As the user was issued a CNIC on ${idIssueDate}, this supports that they were recognized as a PAKISTANI citizen prior to and at the time of issuance.`
    : "As the user was issued a CNIC, this supports that they were recognized as a PAKISTANI citizen prior to and at the time of issuance.";
  const hitCountryText = hitCountry || hitCitizenship || "the hit's country";

  return (
    `Citizenship Mismatch. Per CMS, the hit was identified as a citizen of ${hitCitizenship} ${yearText}. ` +
    `However, per KYC, user has Pakistan CNIC number, which is only issued to individuals recognized as Pakistani citizens by NADRA. ` +
    `Issuance of a CNIC requires verification of Pakistani citizenship status and is generally granted to individuals who are Pakistani citizen prior to and at the or descent. ` +
    `${issueText} As Pakistan does not recognized dual citizenship with ${hitCountryText}, this is a citizenship mismatch hence false positive.`
  );
}

// ── CITIZENSHIP (BIRTHDATE TO ISSUING DATE) ──────────
function buildCitizenshipBirthToIssuingText({
  userCitizenship,
  hitCitizenship,
  hitCountry,
  userJurisdiction,
  idIssueDate,
  offenseYear,
  userResidency
}) {
  if (!userCitizenship || !hitCitizenship) {
    return ERR("Citizenship (Birthdate to Issuing Date) cannot be generated (missing User or Hit Citizenship).");
  }
  if (!userJurisdiction || !idIssueDate) {
    return ERR("Citizenship (Birthdate to Issuing Date) cannot be generated (missing User Jurisdiction and/or ID Issuing Date).");
  }
  if ((userCitizenship || "").trim().toLowerCase() === (hitCitizenship || "").trim().toLowerCase()) {
    return ERR(`No Citizenship Mismatch. User and hit share the same citizenship (${userCitizenship}).`);
  }

  const yearText = offenseYear ? `as of ${offenseYear}` : "as of the latest CMS update";
  const residencyText = userResidency || userJurisdiction;
  const hitCountryText = hitCountry || hitCitizenship;

  return (
    `Citizenship Mismatch. Per CMS, hit is a citizen of ${hitCountryText} ${yearText} when the CMS report was last updated. ` +
    `Per KYC, user was born in ${userJurisdiction} therefore they are likely ${userCitizenship} from birth until they were issued the national ID in ${idIssueDate}. ` +
    `As ${residencyText} does not recognise dual citizenship, this is a citizenship mismatch hence false positive.`
  );
}

// ── CITIZENSHIP (ISSUING DATE TO EXPIRY DATE) ────────
function extractYear(dateStr) {
  const parts = String(dateStr || "").split("/");
  return parts.length === 3 ? parts[2] : "";
}

function buildCitizenshipIssuingToExpiryText({
  userCitizenship,
  hitCitizenship,
  hitCountry,
  idType,
  idIssueDate,
  idExpiryDate,
  offenseYear,
  userResidency
}) {
  if (!userCitizenship || !hitCitizenship) {
    return ERR("Citizenship (Issuing Date to Expiry Date) cannot be generated (missing User or Hit Citizenship).");
  }
  if (!idType || !idIssueDate || !idExpiryDate) {
    return ERR("Citizenship (Issuing Date to Expiry Date) cannot be generated (missing ID Type, ID Issuing Date, and/or ID Expiration Date).");
  }
  if ((userCitizenship || "").trim().toLowerCase() === (hitCitizenship || "").trim().toLowerCase()) {
    return ERR(`No Citizenship Mismatch. User and hit share the same citizenship (${userCitizenship}).`);
  }

  const yearText = offenseYear ? `as of ${offenseYear}` : "as of the latest CMS update";
  const residencyText = userResidency || userCitizenship;
  const hitCountryText = hitCountry || hitCitizenship;
  const issueYear  = extractYear(idIssueDate)  || idIssueDate;
  const expiryYear = extractYear(idExpiryDate) || idExpiryDate;

  return (
    `Citizenship Mismatch. Per CMS, hit is a citizen of ${hitCountryText} ${yearText} when the CMS report was last updated. ` +
    `Per KYC, user is a ${userCitizenship} citizen per the ${idType} valid from ${issueYear}-${expiryYear}. ` +
    `As ${residencyText} does not recognise dual citizenship, this is a citizenship mismatch hence false positive.`
  );
}

// ── CITIZENSHIP (ISSUING DATE TO CREATION DATE) ──────
function buildCitizenshipIssuingToCreationText({
  userCitizenship,
  hitCitizenship,
  hitCountry,
  idType,
  idIssueDate,
  offenseYear,
  kycYear
}) {
  if (!userCitizenship || !hitCitizenship) {
    return ERR("Citizenship (Issuing Date to Creation Date) cannot be generated (missing User or Hit Citizenship).");
  }
  if (!idType || !idIssueDate) {
    return ERR("Citizenship (Issuing Date to Creation Date) cannot be generated (missing ID Type and/or ID Issuing Date).");
  }
  if ((userCitizenship || "").trim().toLowerCase() === (hitCitizenship || "").trim().toLowerCase()) {
    return ERR(`No Citizenship Mismatch. User and hit share the same citizenship (${userCitizenship}).`);
  }

  const yearText = offenseYear ? `as of ${offenseYear}` : "as of the latest CMS update";
  const applicationYear = kycYear || new Date().getFullYear();
  const hitCountryText = hitCountry || hitCitizenship;

  return (
    `Citizenship Mismatch. Per CMS, hit is a citizen of ${hitCountryText} ${yearText} when the CMS report was last updated. ` +
    `Per KYC, user is a ${userCitizenship} citizen per the ${idType} issued in ${offenseYear || "the reported year"} used for KYC application in ${applicationYear}. ` +
    `As ${userCitizenship} does not recognise dual citizenship, this is a citizenship mismatch hence false positive.`
  );
}