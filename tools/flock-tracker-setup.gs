// Earthwell Flock Health Tracker — Google Apps Script
// Paste into Extensions → Apps Script, then click Run

function setupFlockTracker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Remove default Sheet1 at the end
  const defaultSheet = ss.getSheetByName("Sheet1");

  createDailyLog(ss);
  createHealthEvents(ss);
  createTreatments(ss);
  createFlockRoster(ss);
  createDashboard(ss);

  if (defaultSheet) ss.deleteSheet(defaultSheet);

  ss.setActiveSheet(ss.getSheetByName("Dashboard"));
  SpreadsheetApp.getUi().alert("✅ Earthwell Flock Tracker is ready!");
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function headerStyle(sheet, range) {
  range.setBackground("#2d5a27")
       .setFontColor("#ffffff")
       .setFontWeight("bold")
       .setFontSize(10);
}

function freezeAndResize(sheet, rows, cols) {
  sheet.setFrozenRows(rows);
  sheet.setFrozenColumns(cols);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setHeight(28);
}

// ── 1. DAILY LOG ───────────────────────────────────────────────────────────

function createDailyLog(ss) {
  const sheet = ss.insertSheet("Daily Log");

  const headers = [
    "Date",
    "Eggs Laid",
    "Lay Rate %",
    "Feed Consumed (lbs)",
    "Feed Conversion Ratio",
    "Water OK?",
    "Coop Temp (°F)",
    "Humidity (%)",
    "Droppings",
    "Feather Condition",
    "Sick Birds Observed",
    "Mortality",
    "Notes"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  headerStyle(sheet, sheet.getRange(1, 1, 1, headers.length));

  // Column widths
  sheet.setColumnWidth(1, 100);  // Date
  sheet.setColumnWidth(2, 90);   // Eggs Laid
  sheet.setColumnWidth(3, 90);   // Lay Rate
  sheet.setColumnWidth(4, 150);  // Feed
  sheet.setColumnWidth(5, 160);  // FCR
  sheet.setColumnWidth(6, 90);   // Water
  sheet.setColumnWidth(7, 120);  // Temp
  sheet.setColumnWidth(8, 110);  // Humidity
  sheet.setColumnWidth(9, 120);  // Droppings
  sheet.setColumnWidth(10, 140); // Feathers
  sheet.setColumnWidth(11, 150); // Sick
  sheet.setColumnWidth(12, 90);  // Mortality
  sheet.setColumnWidth(13, 250); // Notes

  // Lay rate formula: =B2/Roster!B2*100  (pulls active hen count from Roster)
  // Pre-fill formulas for 365 rows
  for (let i = 2; i <= 367; i++) {
    sheet.getRange(i, 3).setFormula(
      `=IF(B${i}="","",ROUND(B${i}/Roster!$B$2*100,1))`
    );
    sheet.getRange(i, 5).setFormula(
      `=IF(AND(B${i}<>"",D${i}<>""),ROUND(D${i}/B${i},2),"")`
    );
  }

  // Dropdowns
  const droppingsRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Normal", "Loose", "Green", "Bloody", "Foamy", "Cecal (normal)"], true)
    .build();
  sheet.getRange(2, 9, 366, 1).setDataValidation(droppingsRule);

  const featherRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Good", "Molting", "Pecking damage", "Mites/lice suspected", "Poor"], true)
    .build();
  sheet.getRange(2, 10, 366, 1).setDataValidation(featherRule);

  const yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Yes", "No"], true)
    .build();
  sheet.getRange(2, 6, 366, 1).setDataValidation(yesNoRule);

  // Conditional formatting — flag low lay rate in red
  const layRateRange = sheet.getRange(2, 3, 366, 1);
  const lowLayRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(50)
    .setBackground("#fde8e8")
    .setFontColor("#a03030")
    .setRanges([layRateRange])
    .build();
  sheet.setConditionalFormatRules([lowLayRule]);

  // Conditional formatting — flag mortality > 0 in red
  const mortalityRange = sheet.getRange(2, 12, 366, 1);
  const mortalityRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground("#fde8e8")
    .setFontColor("#a03030")
    .setRanges([mortalityRange])
    .build();
  const rules = sheet.getConditionalFormatRules();
  rules.push(mortalityRule);
  sheet.setConditionalFormatRules(rules);

  freezeAndResize(sheet, 1, 1);
}

// ── 2. HEALTH EVENTS ───────────────────────────────────────────────────────

function createHealthEvents(ss) {
  const sheet = ss.insertSheet("Health Events");

  const headers = [
    "Date", "Bird ID / Description", "Event Type",
    "Symptoms / Details", "Action Taken", "Resolved?", "Follow-up Date"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  headerStyle(sheet, sheet.getRange(1, 1, 1, headers.length));

  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 250);
  sheet.setColumnWidth(5, 220);
  sheet.setColumnWidth(6, 90);
  sheet.setColumnWidth(7, 120);

  const eventTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      "Illness", "Injury", "Death", "Predator attack",
      "Respiratory", "Parasite", "Egg issue", "Behaviour change", "Other"
    ], true)
    .build();
  sheet.getRange(2, 3, 200, 1).setDataValidation(eventTypeRule);

  const resolvedRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Yes", "No", "Monitoring"], true)
    .build();
  sheet.getRange(2, 6, 200, 1).setDataValidation(resolvedRule);

  freezeAndResize(sheet, 1, 0);
}

// ── 3. TREATMENTS & MEDICATIONS ────────────────────────────────────────────

function createTreatments(ss) {
  const sheet = ss.insertSheet("Treatments");

  const headers = [
    "Date", "Treatment / Drug", "Dose", "Route",
    "Birds Treated", "Reason", "Withdrawal Period (days)",
    "Withdrawal End Date", "Administered By"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  headerStyle(sheet, sheet.getRange(1, 1, 1, headers.length));

  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 200);
  sheet.setColumnWidth(7, 180);
  sheet.setColumnWidth(8, 160);
  sheet.setColumnWidth(9, 140);

  // Auto-calculate withdrawal end date
  for (let i = 2; i <= 201; i++) {
    sheet.getRange(i, 8).setFormula(
      `=IF(AND(A${i}<>"",G${i}<>""),A${i}+G${i},"")`
    );
  }

  // Highlight withdrawal end dates that are in the future (eggs not safe yet)
  const withdrawalRange = sheet.getRange(2, 8, 200, 1);
  const withdrawalRule = SpreadsheetApp.newConditionalFormatRule()
    .whenDateAfter(SpreadsheetApp.RelativeDate.TODAY)
    .setBackground("#fff3cd")
    .setFontColor("#856404")
    .setRanges([withdrawalRange])
    .build();
  sheet.setConditionalFormatRules([withdrawalRule]);

  const routeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["In water", "In feed", "Injection", "Topical", "Oral"], true)
    .build();
  sheet.getRange(2, 4, 200, 1).setDataValidation(routeRule);

  freezeAndResize(sheet, 1, 0);
}

// ── 4. FLOCK ROSTER ────────────────────────────────────────────────────────

function createFlockRoster(ss) {
  const sheet = ss.insertSheet("Roster");

  // Summary cell used by Daily Log lay rate formula
  sheet.getRange("A1").setValue("Active Laying Hens:");
  sheet.getRange("A1").setFontWeight("bold");
  sheet.getRange("B1").setFormula(
    `=COUNTIFS(C3:C200,"Hen",E3:E200,"Active")+COUNTIFS(C3:C200,"Pullet",E3:E200,"Active")`
  );
  sheet.getRange("B1").setBackground("#e8f5e2").setFontWeight("bold");

  const headers = [
    "Bird ID", "Name / Description", "Type", "Breed",
    "Hatch Year", "Date Added", "Status", "Notes"
  ];
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  headerStyle(sheet, sheet.getRange(2, 1, 1, headers.length));

  sheet.setColumnWidth(1, 90);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 100);
  sheet.setColumnWidth(8, 220);

  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Hen", "Rooster", "Pullet", "Chick"], true)
    .build();
  sheet.getRange(3, 3, 200, 1).setDataValidation(typeRule);

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Active", "Deceased", "Sold", "Retired"], true)
    .build();
  sheet.getRange(3, 7, 200, 1).setDataValidation(statusRule);

  sheet.setFrozenRows(2);
}

// ── 5. DASHBOARD ───────────────────────────────────────────────────────────

function createDashboard(ss) {
  const sheet = ss.insertSheet("Dashboard", 0);
  sheet.setTabColor("#2d5a27");

  // Title
  sheet.getRange("A1").setValue("🌿 Earthwell Flock Health Dashboard");
  sheet.getRange("A1").setFontSize(16).setFontWeight("bold").setFontColor("#2d5a27");
  sheet.getRange("A2").setValue(`Updated: ${new Date().toLocaleDateString()}`);
  sheet.getRange("A2").setFontColor("#666666").setFontSize(10);

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 160);

  // Section: Flock Summary
  sheet.getRange("A4").setValue("FLOCK SUMMARY").setFontWeight("bold").setFontColor("#2d5a27");
  const summaryLabels = [
    ["Active laying hens",   `='Roster'!B1`],
    ["Total birds (active)", `=COUNTIF(Roster!G3:G200,"Active")`],
  ];
  summaryLabels.forEach(([label, formula], i) => {
    sheet.getRange(5 + i, 1).setValue(label).setFontColor("#444444");
    sheet.getRange(5 + i, 2).setFormula(formula).setFontWeight("bold");
  });

  // Section: Last 7 Days
  sheet.getRange("A8").setValue("LAST 7 DAYS").setFontWeight("bold").setFontColor("#2d5a27");
  const sevenDayLabels = [
    ["Total eggs laid",      `=IFERROR(SUMIF('Daily Log'!A2:A,'Daily Log'!A2:A,">="&TODAY()-7,'Daily Log'!B2:B),0)`],
    ["Avg lay rate %",       `=IFERROR(AVERAGEIF('Daily Log'!A2:A,">="&TODAY()-7,'Daily Log'!C2:C),0)`],
    ["Avg feed consumed",    `=IFERROR(AVERAGEIF('Daily Log'!A2:A,">="&TODAY()-7,'Daily Log'!D2:D),0)`],
    ["Mortality this week",  `=IFERROR(SUMIF('Daily Log'!A2:A,">="&TODAY()-7,'Daily Log'!L2:L),0)`],
    ["Health events logged", `=COUNTIF('Health Events'!A2:A,">="&TODAY()-7)`],
  ];
  sevenDayLabels.forEach(([label, formula], i) => {
    sheet.getRange(9 + i, 1).setValue(label).setFontColor("#444444");
    sheet.getRange(9 + i, 2).setFormula(formula).setFontWeight("bold");
  });

  // Section: Active Withdrawal Warnings
  sheet.getRange("A15").setValue("⚠ ACTIVE WITHDRAWAL PERIODS").setFontWeight("bold").setFontColor("#856404");
  sheet.getRange("A16").setFormula(
    `=IFERROR(IF(COUNTIF(Treatments!H2:H200,">"&TODAY())>0,COUNTIF(Treatments!H2:H200,">"&TODAY())&" treatment(s) — eggs not safe for sale","All clear ✓"),"All clear ✓")`
  );
  sheet.getRange("A16").setFontColor("#2d5a27");

  // Quick links
  sheet.getRange("A18").setValue("QUICK LINKS").setFontWeight("bold").setFontColor("#2d5a27");
  sheet.getRange("A19").setValue("→ Go to Daily Log").setFontColor("#4a8c3f");
  sheet.getRange("A20").setValue("→ Log a Health Event").setFontColor("#4a8c3f");
  sheet.getRange("A21").setValue("→ Log a Treatment").setFontColor("#4a8c3f");
  sheet.getRange("A22").setValue("→ View Flock Roster").setFontColor("#4a8c3f");

  // Hyperlinks to sheets
  [["Daily Log","A19"],["Health Events","A20"],["Treatments","A21"],["Roster","A22"]].forEach(
    ([sheetName, cell]) => {
      const url = `https://docs.google.com/spreadsheets/d/${ss.getId()}#gid=${ss.getSheetByName(sheetName).getSheetId()}`;
      sheet.getRange(cell).setValue(`→ ${sheetName}`);
      const richText = SpreadsheetApp.newRichTextValue()
        .setText(`→ ${sheetName}`)
        .setLinkUrl(url)
        .build();
      sheet.getRange(cell).setRichTextValue(richText);
    }
  );

  sheet.setFrozenRows(0);
}
