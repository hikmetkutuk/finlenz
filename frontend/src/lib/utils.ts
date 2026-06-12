function currencySymbol(currency: string): string {
  if (currency === "TRY") return "₺";
  if (currency === "USD") return "$";
  return currency;
}

export function formatPrice(value: number, currency: string): string {
  const symbol = currencySymbol(currency);
  return `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

export function formatLargeNumber(
  value: number | undefined,
  currency: string,
): string {
  if (value == null) return "N/A";
  const symbol = currencySymbol(currency);
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)} Mr ${symbol}`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)} Mn ${symbol}`;
  return `${value.toLocaleString("tr-TR")} ${symbol}`;
}

export function formatPercent(value: number | undefined): string {
  if (value == null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}%${Math.abs(value).toFixed(1)}`;
}

export function formatMultiple(value: number | undefined): string {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}x`;
}

export function formatRatio(value: number | undefined): string {
  if (value == null) return "N/A";
  return value.toFixed(2);
}

const SECTOR_TR: Record<string, string> = {
  "Commercial Services": "Ticari Hizmetler",
  Communications: "İletişim",
  "Consumer Durables": "Dayanıklı Tüketim",
  "Consumer Non-Durables": "Dayanıksız Tüketim",
  "Consumer Services": "Tüketici Hizmetleri",
  "Distribution Services": "Dağıtım Hizmetleri",
  "Electronic Technology": "Elektronik Teknoloji",
  "Energy Minerals": "Enerji Hammaddeleri",
  Finance: "Finans",
  "Health Services": "Sağlık Hizmetleri",
  "Health Technology": "Sağlık Teknolojisi",
  "Industrial Services": "Endüstriyel Hizmetler",
  Miscellaneous: "Çeşitli",
  "Non-Energy Minerals": "Enerji Dışı Hammaddeler",
  "Process Industries": "İşleme Endüstrisi",
  "Producer Manufacturing": "Üretim",
  "Retail Trade": "Perakende",
  "Technology Services": "Teknoloji Hizmetleri",
  Transportation: "Ulaştırma",
  Utilities: "Kamu Hizmetleri",
};

export function translateSector(sector: string): string {
  return SECTOR_TR[sector] ?? sector;
}

const BANKING = "Bankacılık";

const INDUSTRY_TR: Record<string, string> = {
  // Finans
  "Regional Banks": BANKING,
  "Major Banks": BANKING,
  "Savings Banks": BANKING,
  "Investment Banks/Brokers": "Yatırım Bankacılığı",
  "Investment Managers": "Portföy Yönetimi",
  "Investment Trusts/Mutual Funds": "Yatırım Fonları",
  "Financial Conglomerates": "Finansal Holding",
  "Life/Health Insurance": "Hayat ve Sağlık Sigortası",
  "Property/Casualty Insurance": "Sigorta",
  "Multi-Line Insurance": "Sigorta",
  "Real Estate Investment Trusts": "GYO",
  "Real Estate Development": "Gayrimenkul Geliştirme",
  Homebuilding: "Konut Geliştirme",
  "Finance/Rental/Leasing": "Finansal Kiralama",

  // Tüketim
  "Beverages: Non-Alcoholic": "Alkolsüz İçecekler",
  "Beverages: Alcoholic": "Alkollü İçecekler",
  "Food: Major Diversified": "Gıda",
  "Food: Specialty/Candy": "Gıda ve Şekerleme",
  "Food: Meat/Fish/Dairy": "Et, Balık ve Süt Ürünleri",
  "Food Retail": "Gıda Perakende",
  "Food Distributors": "Gıda Dağıtımı",
  "Department Stores": "Mağazacılık",
  "Specialty Stores": "Özel Mağazacılık",
  "Electronics/Appliance Stores": "Elektronik Perakende",
  "Internet Retail": "E-Ticaret",
  "Apparel/Footwear Retail": "Giyim ve Ayakkabı",
  "Apparel/Footwear": "Giyim ve Ayakkabı",
  "Household/Personal Care": "Kişisel Bakım",
  "Consumer Sundries": "Tüketim Malları",
  "Other Consumer Specialties": "Tüketim Ürünleri",
  "Electronics/Appliances": "Beyaz Eşya ve Elektronik",
  "Motor Vehicles": "Otomotiv",
  "Auto Parts: OEM": "Otomotiv Ana Sanayi",
  "Automotive Aftermarket": "Otomotiv Yan Sanayi",
  "Recreational Products": "Hobi ve Spor",
  "Home Furnishings": "Mobilya",

  // Sanayi ve Üretim
  "Electrical Products": "Elektrik Ekipmanları",
  "Electronic Equipment/Instruments": "Elektronik Cihazlar",
  "Electronic Production Equipment": "Elektronik Üretim",
  "Electronics Distributors": "Elektronik Dağıtım",
  "Industrial Machinery": "Makine",
  "Industrial Conglomerates": "Sanayi Holding",
  "Industrial Specialties": "Sanayi Ürünleri",
  "Miscellaneous Manufacturing": "Çeşitli İmalat",
  "Metal Fabrication": "Metal İşleme",
  "Engineering & Construction": "İnşaat ve Mühendislik",
  "Trucks/Construction/Farm Machinery": "İş ve Tarım Makineleri",
  "Aerospace & Defense": "Havacılık ve Savunma",
  "Construction Materials": "İnşaat Malzemeleri",
  "Building Products": "Yapı Ürünleri",
  "Containers/Packaging": "Ambalaj",
  "Commercial Printing/Forms": "Baskı ve Matbaa",
  "Office Equipment/Supplies": "Ofis Ekipmanları",

  // Enerji ve Altyapı
  "Electric Utilities": "Elektrik Dağıtımı",
  "Alternative Power Generation": "Yenilenebilir Enerji",
  "Gas Distributors": "Doğalgaz Dağıtımı",
  "Oil Refining/Marketing": "Petrol Rafineri",
  "Integrated Oil": "Petrol ve Gaz",

  // Teknoloji
  "Packaged Software": "Yazılım",
  "Information Technology Services": "Bilgi Teknolojileri",
  "Data Processing Services": "Veri İşleme",
  "Computer Processing Hardware": "Bilgisayar Donanımı",
  "Computer Communications": "Bilgisayar Ağları",
  Semiconductors: "Yarı İletkenler",
  "Telecommunications Equipment": "Telekomünikasyon Ekipmanı Üretimi",
  "Major Telecommunications": "Telekomünikasyon",
  "Wireless Telecommunications": "Telekomünikasyon",

  // Ulaştırma
  Airlines: "Havayolları",
  "Air Freight/Couriers": "Kargo ve Lojistik",
  Trucking: "Karayolu Taşımacılığı",
  "Marine Shipping": "Deniz Taşımacılığı",
  Railroads: "Demiryolu",
  "Other Transportation": "Diğer Taşımacılık",

  // Sağlık
  "Hospital/Nursing Management": "Hastane",
  "Medical/Nursing Services": "Sağlık Hizmetleri",
  "Medical Distributors": "Medikal Dağıtım",
  "Medical Specialties": "Tıbbi Cihaz",
  Biotechnology: "Biyoteknoloji",
  "Pharmaceuticals: Major": "İlaç",

  // Hammadde ve Malzeme
  Steel: "Çelik",
  Aluminum: "Alüminyum",
  "Other Metals/Minerals": "Maden",
  "Precious Metals": "Kıymetli Madenler",
  "Agricultural Commodities/Milling": "Tarımsal Ürünler",
  "Chemicals: Major Diversified": "Kimya",
  "Chemicals: Specialty": "Özel Kimyasallar",
  "Chemicals: Agricultural": "Tarım Kimyasalları",
  "Pulp & Paper": "Kağıt",
  "Forest Products": "Orman Ürünleri",
  Textiles: "Tekstil",

  // Hizmetler
  "Media Conglomerates": "Medya",
  "Movies/Entertainment": "Eğlence",
  "Publishing: Books/Magazines": "Yayıncılık",
  "Publishing: Newspapers": "Gazetecilik",
  "Advertising/Marketing Services": "Reklam ve Pazarlama",
  "Hotels/Resorts/Cruise lines": "Otel ve Turizm",
  Restaurants: "Restoran",
  "Other Consumer Services": "Tüketici Hizmetleri",
  "Miscellaneous Commercial Services": "Ticari Hizmetler",
  "Wholesale Distributors": "Toptan Ticaret",
  Miscellaneous: "Çeşitli",
};

export function translateIndustry(industry: string): string {
  return INDUSTRY_TR[industry] ?? industry;
}
