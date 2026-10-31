/**
 * HSN chapter structure from the Customs Tariff (First Schedule), which GST
 * uses for goods, plus chapter 99 (SAC) for services. Chapter titles are
 * shortened; rates are deliberately not stored here because they change by
 * notification — the finder links to CBIC for the current rate.
 */

export type HsnSection = { roman: string; title: string }

export type SacHeading = { code: string; title: string }

export type HsnChapter = {
  code: string
  slug: string
  title: string
  section: HsnSection
  keywords: ReadonlyArray<string>
  sacHeadings?: ReadonlyArray<SacHeading>
}

const SECTIONS: Record<string, HsnSection> = {
  I: { roman: 'I', title: 'Live animals; animal products' },
  II: { roman: 'II', title: 'Vegetable products' },
  III: { roman: 'III', title: 'Animal or vegetable fats and oils' },
  IV: { roman: 'IV', title: 'Prepared foodstuffs; beverages; tobacco' },
  V: { roman: 'V', title: 'Mineral products' },
  VI: { roman: 'VI', title: 'Products of the chemical and allied industries' },
  VII: { roman: 'VII', title: 'Plastics and rubber' },
  VIII: { roman: 'VIII', title: 'Hides, skins, leather, and travel goods' },
  IX: { roman: 'IX', title: 'Wood, cork, and basketware' },
  X: { roman: 'X', title: 'Pulp, paper, and paperboard' },
  XI: { roman: 'XI', title: 'Textiles and textile articles' },
  XII: { roman: 'XII', title: 'Footwear, headgear, and umbrellas' },
  XIII: { roman: 'XIII', title: 'Stone, ceramic, and glass' },
  XIV: { roman: 'XIV', title: 'Pearls, precious stones, and precious metals' },
  XV: { roman: 'XV', title: 'Base metals and articles of base metal' },
  XVI: { roman: 'XVI', title: 'Machinery and electrical equipment' },
  XVII: { roman: 'XVII', title: 'Vehicles, aircraft, and vessels' },
  XVIII: { roman: 'XVIII', title: 'Optical, medical, and precision instruments; clocks; musical instruments' },
  XIX: { roman: 'XIX', title: 'Arms and ammunition' },
  XX: { roman: 'XX', title: 'Miscellaneous manufactured articles' },
  XXI: { roman: 'XXI', title: "Works of art, collectors' pieces, and antiques" },
  XXII: { roman: 'XXII', title: 'Special classification provisions' },
  SAC: { roman: 'SAC', title: 'Services Accounting Codes' },
}

const SAC_HEADINGS: ReadonlyArray<SacHeading> = [
  { code: '9954', title: 'Construction services' },
  { code: '9961', title: 'Wholesale trade services' },
  { code: '9962', title: 'Retail trade services' },
  { code: '9963', title: 'Accommodation, food and beverage services' },
  { code: '9964', title: 'Passenger transport services' },
  { code: '9965', title: 'Goods transport services' },
  { code: '9966', title: 'Rental of transport vehicles with operators' },
  { code: '9967', title: 'Supporting services in transport' },
  { code: '9968', title: 'Postal and courier services' },
  { code: '9969', title: 'Electricity, gas, water and other distribution services' },
  { code: '9971', title: 'Financial and related services' },
  { code: '9972', title: 'Real estate services' },
  { code: '9973', title: 'Leasing or rental services without operator' },
  { code: '9981', title: 'Research and development services' },
  { code: '9982', title: 'Legal and accounting services' },
  { code: '9983', title: 'Other professional, technical and business services' },
  { code: '9984', title: 'Telecommunications, broadcasting and information supply services' },
  { code: '9985', title: 'Support services' },
  { code: '9986', title: 'Support services to agriculture, forestry, fishing, and mining' },
  { code: '9987', title: 'Maintenance, repair and installation (except construction) services' },
  { code: '9988', title: 'Manufacturing services on physical inputs owned by others (job work)' },
  { code: '9989', title: 'Other manufacturing services; publishing, printing and reproduction' },
  { code: '9991', title: 'Public administration and other services to the community' },
  { code: '9992', title: 'Education services' },
  { code: '9993', title: 'Human health and social care services' },
  { code: '9994', title: 'Sewage and waste collection, treatment and disposal' },
  { code: '9995', title: 'Services of membership organisations' },
  { code: '9996', title: 'Recreational, cultural and sporting services' },
  { code: '9997', title: 'Other services (laundry, beauty, and similar)' },
  { code: '9998', title: 'Domestic services' },
  { code: '9999', title: 'Services by extraterritorial organisations and bodies' },
]

type ChapterRow = [code: string, section: string, title: string, keywords: string]

const CHAPTER_ROWS: ReadonlyArray<ChapterRow> = [
  ['01', 'I', 'Live animals', 'cattle goat sheep poultry horse'],
  ['02', 'I', 'Meat and edible meat offal', 'chicken mutton meat'],
  ['03', 'I', 'Fish, crustaceans, molluscs and other aquatic invertebrates', 'fish prawn shrimp seafood'],
  ['04', 'I', "Dairy produce; birds' eggs; natural honey; edible animal products", 'milk curd paneer ghee butter cheese egg honey'],
  ['05', 'I', 'Products of animal origin not elsewhere specified', 'bones hair bristles'],
  ['06', 'II', 'Live trees and other plants; bulbs, roots; cut flowers', 'plants flowers nursery'],
  ['07', 'II', 'Edible vegetables and certain roots and tubers', 'vegetables potato onion tomato'],
  ['08', 'II', 'Edible fruit and nuts; peel of citrus fruit or melons', 'fruits mango banana cashew almond dry fruits'],
  ['09', 'II', 'Coffee, tea, maté and spices', 'tea coffee spices pepper turmeric chilli masala'],
  ['10', 'II', 'Cereals', 'rice wheat maize grain'],
  ['11', 'II', 'Products of the milling industry; malt; starches', 'atta flour maida suji besan'],
  ['12', 'II', 'Oil seeds and oleaginous fruits; industrial or medicinal plants; fodder', 'groundnut soybean mustard seeds'],
  ['13', 'II', 'Lac; gums, resins and other vegetable saps and extracts', 'lac gum resin'],
  ['14', 'II', 'Vegetable plaiting materials; vegetable products not elsewhere specified', 'bamboo cane'],
  ['15', 'III', 'Animal or vegetable fats and oils; prepared edible fats; waxes', 'edible oil mustard oil vanaspati'],
  ['16', 'IV', 'Preparations of meat, fish or crustaceans', 'sausage canned fish'],
  ['17', 'IV', 'Sugars and sugar confectionery', 'sugar jaggery gur candy toffee'],
  ['18', 'IV', 'Cocoa and cocoa preparations', 'chocolate cocoa'],
  ['19', 'IV', "Preparations of cereals, flour, starch or milk; bakers' wares", 'biscuits bread cake pasta noodles namkeen'],
  ['20', 'IV', 'Preparations of vegetables, fruit, nuts', 'jam pickle juice ketchup'],
  ['21', 'IV', 'Miscellaneous edible preparations', 'sauces soups ice cream'],
  ['22', 'IV', 'Beverages, spirits and vinegar', 'water soft drinks beverages'],
  ['23', 'IV', 'Residues and waste from the food industries; prepared animal fodder', 'cattle feed oil cake'],
  ['24', 'IV', 'Tobacco and manufactured tobacco substitutes', 'tobacco cigarettes'],
  ['25', 'V', 'Salt; sulphur; earths and stone; lime and cement', 'cement salt sand marble'],
  ['26', 'V', 'Ores, slag and ash', 'iron ore'],
  ['27', 'V', 'Mineral fuels, mineral oils and products of their distillation', 'coal petrol diesel lpg'],
  ['28', 'VI', 'Inorganic chemicals; compounds of precious and rare-earth metals', 'acid chemicals'],
  ['29', 'VI', 'Organic chemicals', 'chemicals alcohol'],
  ['30', 'VI', 'Pharmaceutical products', 'medicine tablets drugs pharma bandage'],
  ['31', 'VI', 'Fertilisers', 'urea fertiliser'],
  ['32', 'VI', 'Tanning or dyeing extracts; dyes, pigments, paints and varnishes; inks', 'paint varnish ink dye'],
  ['33', 'VI', 'Essential oils; perfumery, cosmetic or toilet preparations', 'cosmetics perfume shampoo toothpaste hair oil'],
  ['34', 'VI', 'Soap, washing and lubricating preparations, waxes, candles', 'soap detergent candle'],
  ['35', 'VI', 'Albuminoidal substances; modified starches; glues; enzymes', 'glue adhesive'],
  ['36', 'VI', 'Explosives; pyrotechnic products; matches', 'matches crackers fireworks'],
  ['37', 'VI', 'Photographic or cinematographic goods', 'photo film'],
  ['38', 'VI', 'Miscellaneous chemical products', 'insecticide disinfectant'],
  ['39', 'VII', 'Plastics and articles thereof', 'plastic pipes bottles bags'],
  ['40', 'VII', 'Rubber and articles thereof', 'tyres tubes rubber'],
  ['41', 'VIII', 'Raw hides and skins (other than furskins) and leather', 'leather hides'],
  ['42', 'VIII', 'Articles of leather; travel goods, handbags and similar containers', 'bags handbag wallet belt suitcase'],
  ['43', 'VIII', 'Furskins and artificial fur', 'fur'],
  ['44', 'IX', 'Wood and articles of wood; wood charcoal', 'wood plywood timber'],
  ['45', 'IX', 'Cork and articles of cork', 'cork'],
  ['46', 'IX', 'Manufactures of straw and other plaiting materials; basketware', 'basket'],
  ['47', 'X', 'Pulp of wood or other fibrous cellulosic material; recovered paper', 'pulp waste paper'],
  ['48', 'X', 'Paper and paperboard; articles of paper pulp, paper or paperboard', 'paper notebook carton box tissue'],
  ['49', 'X', 'Printed books, newspapers, pictures and other printed products', 'books newspaper printed'],
  ['50', 'XI', 'Silk', 'silk'],
  ['51', 'XI', 'Wool, fine or coarse animal hair; horsehair yarn and woven fabric', 'wool'],
  ['52', 'XI', 'Cotton', 'cotton yarn fabric'],
  ['53', 'XI', 'Other vegetable textile fibres; paper yarn', 'jute'],
  ['54', 'XI', 'Man-made filaments', 'polyester nylon'],
  ['55', 'XI', 'Man-made staple fibres', 'viscose rayon'],
  ['56', 'XI', 'Wadding, felt and nonwovens; special yarns; twine, cordage, ropes', 'rope nonwoven'],
  ['57', 'XI', 'Carpets and other textile floor coverings', 'carpet rug'],
  ['58', 'XI', 'Special woven fabrics; lace; tapestries; embroidery', 'lace embroidery'],
  ['59', 'XI', 'Impregnated, coated, covered or laminated textile fabrics', 'tarpaulin'],
  ['60', 'XI', 'Knitted or crocheted fabrics', 'knitted fabric'],
  ['61', 'XI', 'Articles of apparel and clothing accessories, knitted or crocheted', 't-shirt tshirt hosiery socks innerwear clothing garments'],
  ['62', 'XI', 'Articles of apparel and clothing accessories, not knitted or crocheted', 'shirt trousers saree suit clothing garments'],
  ['63', 'XI', 'Other made up textile articles; sets; worn clothing; rags', 'bedsheet towel curtain'],
  ['64', 'XII', 'Footwear, gaiters and the like', 'shoes chappal sandals footwear'],
  ['65', 'XII', 'Headgear and parts thereof', 'cap helmet hat'],
  ['66', 'XII', 'Umbrellas, sun umbrellas, walking sticks', 'umbrella'],
  ['67', 'XII', 'Prepared feathers and down; artificial flowers; articles of human hair', 'artificial flowers wig'],
  ['68', 'XIII', 'Articles of stone, plaster, cement, asbestos, mica', 'tiles stone granite'],
  ['69', 'XIII', 'Ceramic products', 'ceramic tiles sanitaryware'],
  ['70', 'XIII', 'Glass and glassware', 'glass mirror'],
  ['71', 'XIV', 'Pearls, precious stones, precious metals; imitation jewellery; coin', 'gold silver jewellery diamond'],
  ['72', 'XV', 'Iron and steel', 'steel iron tmt'],
  ['73', 'XV', 'Articles of iron or steel', 'steel utensils screws nails'],
  ['74', 'XV', 'Copper and articles thereof', 'copper'],
  ['75', 'XV', 'Nickel and articles thereof', 'nickel'],
  ['76', 'XV', 'Aluminium and articles thereof', 'aluminium'],
  ['77', 'XV', 'Reserved for possible future use', ''],
  ['78', 'XV', 'Lead and articles thereof', 'lead'],
  ['79', 'XV', 'Zinc and articles thereof', 'zinc'],
  ['80', 'XV', 'Tin and articles thereof', 'tin'],
  ['81', 'XV', 'Other base metals; cermets', 'tungsten'],
  ['82', 'XV', 'Tools, implements, cutlery, spoons and forks, of base metal', 'tools knife cutlery'],
  ['83', 'XV', 'Miscellaneous articles of base metal', 'locks'],
  ['84', 'XVI', 'Nuclear reactors, boilers, machinery and mechanical appliances', 'machinery computer laptop printer pump ac'],
  ['85', 'XVI', 'Electrical machinery and equipment; sound and television equipment', 'mobile phone electrical wire led tv battery'],
  ['86', 'XVII', 'Railway or tramway locomotives, rolling stock and track fixtures', 'railway'],
  ['87', 'XVII', 'Vehicles other than railway or tramway rolling stock, and parts', 'car motorcycle scooter bicycle auto parts'],
  ['88', 'XVII', 'Aircraft, spacecraft, and parts thereof', 'aircraft drone'],
  ['89', 'XVII', 'Ships, boats and floating structures', 'boat'],
  ['90', 'XVIII', 'Optical, photographic, measuring, medical or surgical instruments', 'spectacles medical instruments'],
  ['91', 'XVIII', 'Clocks and watches and parts thereof', 'watch clock'],
  ['92', 'XVIII', 'Musical instruments', 'musical instruments guitar'],
  ['93', 'XIX', 'Arms and ammunition', 'arms'],
  ['94', 'XX', 'Furniture; bedding, mattresses; lamps and lighting fittings', 'furniture mattress lamp'],
  ['95', 'XX', 'Toys, games and sports requisites', 'toys sports games'],
  ['96', 'XX', 'Miscellaneous manufactured articles', 'pen pencil brush diaper'],
  ['97', 'XXI', "Works of art, collectors' pieces and antiques", 'painting antiques'],
  ['98', 'XXII', "Project imports, laboratory chemicals, passengers' baggage", 'project imports baggage'],
  ['99', 'SAC', 'Services (SAC codes)', 'services restaurant hotel transport consulting repair rent software'],
]

export const HSN_CHAPTERS: ReadonlyArray<HsnChapter> = CHAPTER_ROWS.map(
  ([code, section, title, keywords]) => ({
    code,
    slug: `chapter-${code}`,
    title,
    section: SECTIONS[section] ?? { roman: section, title: '' },
    keywords: keywords ? keywords.split(' ') : [],
    ...(code === '99' ? { sacHeadings: SAC_HEADINGS } : {}),
  }),
)

export function getHsnChapter(slug: string): HsnChapter | undefined {
  return HSN_CHAPTERS.find((chapter) => chapter.slug === slug)
}

export function searchHsn(query: string): Array<HsnChapter> {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  const digits = normalized.replace(/\s+/g, '')
  if (/^\d{2,8}$/.test(digits)) {
    const chapter = HSN_CHAPTERS.find((candidate) => candidate.code === digits.slice(0, 2))
    return chapter ? [chapter] : []
  }

  const words = normalized.split(/\s+/)
  return HSN_CHAPTERS.filter((chapter) => {
    const haystack = [
      chapter.title.toLowerCase(),
      ...chapter.keywords,
      ...(chapter.sacHeadings ?? []).map((heading) => heading.title.toLowerCase()),
    ].join(' ')
    return words.every((word) => haystack.includes(word))
  })
}

/**
 * HSN digits needed on a tax invoice (Notification 78/2020-CT): six digits
 * above ₹5 crore AATO; up to ₹5 crore, four digits on B2B invoices and
 * optional on B2C.
 */
export function requiredHsnDigits(input: { aatoAbove5Crore: boolean; b2c: boolean }): 0 | 4 | 6 {
  if (input.aatoAbove5Crore) return 6
  return input.b2c ? 0 : 4
}
