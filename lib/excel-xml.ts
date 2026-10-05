export type ExcelCell = string | number | boolean | Date | null | undefined;

export type ExcelSheet = {
  name: string;
  headers: string[];
  rows: ExcelCell[][];
};

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cell(value: ExcelCell, header = false) {
  if (value instanceof Date) {
    return `<Cell ss:StyleID="${header ? "Header" : "Date"}"><Data ss:Type="DateTime">${value.toISOString()}</Data></Cell>`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell ss:StyleID="${header ? "Header" : "Number"}"><Data ss:Type="Number">${value}</Data></Cell>`;
  }

  if (typeof value === "boolean") {
    return `<Cell ss:StyleID="${header ? "Header" : "Default"}"><Data ss:Type="String">${value ? "نعم" : "لا"}</Data></Cell>`;
  }

  const text = value == null ? "" : String(value);
  return `<Cell ss:StyleID="${header ? "Header" : "Default"}"><Data ss:Type="String">${xmlEscape(text)}</Data></Cell>`;
}

function safeSheetName(name: string) {
  return name.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Sheet";
}

export function buildExcelXmlWorkbook(sheets: ExcelSheet[]) {
  const body = sheets
    .map((sheet) => {
      const headerRow = `<Row>${sheet.headers.map((value) => cell(value, true)).join("")}</Row>`;
      const rows = sheet.rows
        .map((row) => `<Row>${row.map((value) => cell(value)).join("")}</Row>`)
        .join("");

      return `<Worksheet ss:Name="${xmlEscape(safeSheetName(sheet.name))}">
        <Table>${headerRow}${rows}</Table>
        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
          <Selected/>
          <FreezePanes/>
          <FrozenNoSplit/>
          <SplitHorizontal>1</SplitHorizontal>
          <TopRowBottomPane>1</TopRowBottomPane>
          <ActivePane>2</ActivePane>
          <ProtectObjects>False</ProtectObjects>
          <ProtectScenarios>False</ProtectScenarios>
        </WorksheetOptions>
      </Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <Font ss:FontName="Arial" ss:Size="10"/>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0B2F49" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Number">
      <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="Date">
      <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <NumberFormat ss:Format="yyyy-mm-dd hh:mm"/>
    </Style>
  </Styles>
  ${body}
</Workbook>`;
}

export function excelResponse(workbook: string, filename: string) {
  const bytes = new TextEncoder().encode(`\uFEFF${workbook}`);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
      "Cache-Control": "no-store",
    },
  });
}
