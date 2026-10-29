// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  InvalidTallyExportError,
  parseTallyMasters,
} from '#/features/imports/tally-xml-parser.ts'

// Shape of Tally Prime "Export → Masters → XML", trimmed to the tags we read.
// Tally writes &#4; before reserved names, which is not legal XML 1.0.
const tallyExport = `<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY><IMPORTDATA><REQUESTDATA>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <GROUP NAME="Delhi Debtors" RESERVEDNAME="">
    <PARENT>Sundry Debtors</PARENT>
   </GROUP>
  </TALLYMESSAGE>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <LEDGER NAME="Asha Traders" RESERVEDNAME="">
    <PARENT>Sundry Debtors</PARENT>
    <LEDGSTREGDETAILS.LIST><GSTIN>24AAAAA0000A1Z5</GSTIN></LEDGSTREGDETAILS.LIST>
    <LEDMAILINGDETAILS.LIST><STATE>Gujarat</STATE></LEDMAILINGDETAILS.LIST>
   </LEDGER>
  </TALLYMESSAGE>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <LEDGER NAME="Bharat Stores" RESERVEDNAME="">
    <PARENT>Delhi Debtors</PARENT>
    <LEDSTATENAME>Delhi</LEDSTATENAME>
   </LEDGER>
  </TALLYMESSAGE>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <LEDGER NAME="Mill &amp; Co" RESERVEDNAME="">
    <PARENT>Sundry Creditors</PARENT>
    <PARTYGSTIN>33BBBBB0000B1Z5</PARTYGSTIN>
   </LEDGER>
  </TALLYMESSAGE>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <LEDGER NAME="Walk-in" RESERVEDNAME="">
    <PARENT>Sundry Debtors</PARENT>
   </LEDGER>
  </TALLYMESSAGE>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <LEDGER NAME="Rent" RESERVEDNAME="">
    <PARENT>Indirect Expenses</PARENT>
   </LEDGER>
  </TALLYMESSAGE>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <STOCKITEM NAME="Cotton Yarn" RESERVEDNAME="">
    <PARENT>&#4; Primary</PARENT>
    <BASEUNITS>Kg</BASEUNITS>
    <OPENINGBALANCE> 120 Kg</OPENINGBALANCE>
    <OPENINGVALUE>-9600.00</OPENINGVALUE>
    <OPENINGRATE>80.00/Kg</OPENINGRATE>
    <GSTDETAILS.LIST>
     <HSNCODE>52051200</HSNCODE>
     <STATEWISEDETAILS.LIST>
      <STATENAME>&#4; Any</STATENAME>
      <RATEDETAILS.LIST><GSTRATEDUTYHEAD>CGST</GSTRATEDUTYHEAD><GSTRATE>2.5</GSTRATE></RATEDETAILS.LIST>
      <RATEDETAILS.LIST><GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD><GSTRATE>5</GSTRATE></RATEDETAILS.LIST>
     </STATEWISEDETAILS.LIST>
    </GSTDETAILS.LIST>
   </STOCKITEM>
  </TALLYMESSAGE>
  <TALLYMESSAGE xmlns:UDF="TallyUDF">
   <STOCKITEM NAME="Packing Service" RESERVEDNAME="">
    <BASEUNITS>Nos</BASEUNITS>
   </STOCKITEM>
  </TALLYMESSAGE>
 </REQUESTDATA></IMPORTDATA></BODY>
</ENVELOPE>`

describe('parseTallyMasters', () => {
  const masters = parseTallyMasters(tallyExport, '27')

  test('imports debtor and creditor ledgers as parties, skipping other ledgers', () => {
    expect(masters.parties).toEqual([
      {
        name: 'Asha Traders',
        partyType: 'customer',
        gstin: '24AAAAA0000A1Z5',
        stateCode: '24',
      },
      {
        name: 'Bharat Stores',
        partyType: 'customer',
        gstin: null,
        stateCode: '07',
      },
      {
        name: 'Mill & Co',
        partyType: 'supplier',
        gstin: '33BBBBB0000B1Z5',
        stateCode: '33',
      },
      {
        name: 'Walk-in',
        partyType: 'customer',
        gstin: null,
        stateCode: '27',
      },
    ])
  })

  test('imports stock items with HSN and the IGST rate', () => {
    expect(masters.items).toEqual([
      {
        name: 'Cotton Yarn',
        hsn: '52051200',
        gstRate: '5.00',
        rate: '80.00',
        unit: 'Kg',
      },
      {
        name: 'Packing Service',
        hsn: '',
        gstRate: '0.00',
        rate: '0.00',
        unit: 'Nos',
      },
    ])
  })

  test('imports opening stock only for items that have it', () => {
    expect(masters.stock).toEqual([
      {
        itemName: 'Cotton Yarn',
        quantity: '120',
        unit: 'Kg',
        rate: '80.00',
        hsn: '52051200',
        gstRate: '5.00',
      },
    ])
  })

  test('works out the rate from the opening value when Tally gives none', () => {
    const { stock } = parseTallyMasters(
      `<ENVELOPE><STOCKITEM NAME="Thread"><BASEUNITS>Box</BASEUNITS>
        <OPENINGBALANCE>4 Box</OPENINGBALANCE><OPENINGVALUE>-250.00</OPENINGVALUE>
      </STOCKITEM></ENVELOPE>`,
      '27',
    )
    expect(stock).toEqual([
      expect.objectContaining({ quantity: '4', rate: '62.50' }),
    ])
  })

  test('rejects files that are not a Tally export', () => {
    expect(() => parseTallyMasters('name,gstin\nA,B', '27')).toThrow(
      InvalidTallyExportError,
    )
    expect(() => parseTallyMasters('<html><body/></html>', '27')).toThrow(
      InvalidTallyExportError,
    )
  })
})

// Real Tally Prime exports keep HSN, GST and GSTIN as dated revision lists,
// often set the GST rate on the stock group, and may contain raw control
// characters (not only &#4; references).
describe('parseTallyMasters with real export quirks', () => {
  const realExport = `<ENVELOPE>
   <STOCKGROUP NAME="Yarns"><PARENT>&#4; Primary</PARENT>
    <GSTDETAILS.LIST><STATEWISEDETAILS.LIST>
     <RATEDETAILS.LIST><GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD><GSTRATE>12</GSTRATE></RATEDETAILS.LIST>
    </STATEWISEDETAILS.LIST></GSTDETAILS.LIST>
   </STOCKGROUP>
   <STOCKGROUP NAME="Cotton Yarns"><PARENT>Yarns</PARENT></STOCKGROUP>
   <STOCKITEM NAME="Combed Yarn"><PARENT>Cotton Yarns</PARENT><BASEUNITS>Kg</BASEUNITS>
    <HSN>Cotton yarn description</HSN>
    <HSNDETAILS.LIST><APPLICABLEFROM>20170701</APPLICABLEFROM><HSNCODE>5205</HSNCODE></HSNDETAILS.LIST>
    <HSNDETAILS.LIST><APPLICABLEFROM>20220401</APPLICABLEFROM><HSNCODE>520512</HSNCODE></HSNDETAILS.LIST>
    <GSTDETAILS.LIST><TAXABILITY>Taxable</TAXABILITY></GSTDETAILS.LIST>
   </STOCKITEM>
   <STOCKITEM NAME="Dyed Yarn"><PARENT>Yarns</PARENT><BASEUNITS>Kg</BASEUNITS>
    <GSTDETAILS.LIST><APPLICABLEFROM>20170701</APPLICABLEFROM><STATEWISEDETAILS.LIST>
     <RATEDETAILS.LIST><GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD><GSTRATE>12</GSTRATE></RATEDETAILS.LIST>
    </STATEWISEDETAILS.LIST></GSTDETAILS.LIST>
    <GSTDETAILS.LIST><APPLICABLEFROM>20250922</APPLICABLEFROM><STATEWISEDETAILS.LIST>
     <RATEDETAILS.LIST><GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD><GSTRATE>5</GSTRATE></RATEDETAILS.LIST>
    </STATEWISEDETAILS.LIST></GSTDETAILS.LIST>
   </STOCKITEM>
   <STOCKITEM NAME="Loose Fibre\u0004"><BASEUNITS>Kg</BASEUNITS>
    <GSTDETAILS.LIST><TAXABILITY>Taxable</TAXABILITY></GSTDETAILS.LIST>
   </STOCKITEM>
   <LEDGER NAME="Moved Customer"><PARENT>Sundry Debtors</PARENT>
    <LEDGSTREGDETAILS.LIST><APPLICABLEFROM>20170701</APPLICABLEFROM><GSTIN>24AAAAA0000A1Z5</GSTIN></LEDGSTREGDETAILS.LIST>
    <LEDGSTREGDETAILS.LIST><APPLICABLEFROM>20240401</APPLICABLEFROM><GSTIN>29AAAAA0000A1Z5</GSTIN></LEDGSTREGDETAILS.LIST>
   </LEDGER>
  </ENVELOPE>`
  const masters = parseTallyMasters(realExport, '27')
  const item = (name: string) => masters.items.find((row) => row.name === name)

  test('uses the latest HSN, not the description tag', () => {
    expect(item('Combed Yarn')?.hsn).toBe('520512')
  })

  test('takes the GST rate from the stock group when the item has none', () => {
    expect(item('Combed Yarn')?.gstRate).toBe('12.00')
  })

  test('uses the latest GST rate revision', () => {
    expect(item('Dyed Yarn')?.gstRate).toBe('5.00')
  })

  test('leaves the rate blank for a taxable item with no rate anywhere, so dry-run flags it', () => {
    expect(item('Loose Fibre')?.gstRate).toBe('')
  })

  test('uses the latest GSTIN and its state', () => {
    expect(masters.parties).toEqual([
      expect.objectContaining({ gstin: '29AAAAA0000A1Z5', stateCode: '29' }),
    ])
  })
})
