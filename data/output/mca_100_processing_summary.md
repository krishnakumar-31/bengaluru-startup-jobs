# MCA 100-Record Batch Processing Summary

## Executive Metrics

- **Total Processed**: `100`
- **Valid Candidate Records**: `77`
- **Duplicate Records Detected**: `20`
- **Failed Validation Records**: `3`
- **Address-level Geocoding (Nominatim OSM)**: `19`
- **Locality / Centroid Geocoding**: `58`
- **Records Requiring Manual Verification**: `77`
- **Database Status**: `Untouched (0 database modifications; 8 verified startups intact)`
- **Processing Time**: `0.05s`

## Important Notice on Verification Status

> [!IMPORTANT]
> **Zero automatic verification**: No candidate company has been marked as a verified startup.
> All 77 valid candidate records are flagged with `is_verified: False` and `candidate_status: needs_manual_verification`.
> They represent unverified company entities extracted from MCA Master Data pending human administrative review.

## Validation Failure Breakdown

| # | CIN | Company Name | Reason |
|---|---|---|---|
| 1 | `U45201KA2022PTC165034` | TYCHEE GREEN PROJECTS PRIVATE LIMITED | Invalid or non-Bengaluru postal code: '562123.0' (requires 560xxx) |
| 2 | `U52209KA2022PTC165424` | BRECFLYN DISTRIBUTION SERVICES PRIVATE LIMITED | Invalid or non-Bengaluru postal code: '562114.0' (requires 560xxx) |
| 3 | `U31909KA2022PTC165092` | LISHIKA N PRIVATE LIMITED | Invalid or non-Bengaluru postal code: '562111.0' (requires 560xxx) |

## Duplicate Records Detected Against Existing 20 Batch

Total duplicates: 20

| # | CIN | Company Name | Locality | PIN |
|---|---|---|---|---|
| 1 | `U29100KA2022PTC165681` | SPARKLE HYDROSYSTEMS PRIVATE LIMITED | Peenya | 560058 |
| 2 | `U74999KA2022PTC165682` | KYRA CAREERS PRIVATE LIMITED | Yeshwanthpur | 560022 |
| 3 | `U72900KA2022PTC165683` | TECHMOKSHA TECHNOLOGIES PRIVATE LIMITED | Vijayanagar | 560040 |
| 4 | `U72200KA2022PTC165684` | SHAREDX TECHNOLOGIES PRIVATE LIMITED | Bannerghatta Road | 560068 |
| 5 | `U92490KA2022PTC165685` | VARALAKSHMI SPORTS PRIVATE LIMITED | Museum Road | 560025 |
| 6 | `U72900KA2022PTC165686` | ALPHAMUSE LABS PRIVATE LIMITED | Hsr Layout | 560102 |
| 7 | `U72900KA2022PTC164985` | WEALTHIFI E-PLATFORM PRIVATE LIMITED | HBR Layout | 560077 |
| 8 | `U74999KA2022PTC164986` | IKEBANA DATA SCIENCE AND RESEARCH PRIVATE LIMITED | JP Nagar 1st-6th Phase | 560078 |
| 9 | `U74999KA2022PTC164987` | ELV URBAN SECURITY FORCES PRIVATE LIMITED | AECS Layout | 560037 |
| 10 | `U74999KA2022PTC164989` | SUPERNAN CHILDCARE SOLUTIONS PRIVATE LIMITED | Malleshwaram | 560055 |
| 11 | `U74999KA2022PTC164991` | LANQUILL EDTECH PRIVATE LIMITED | Museum Road | 560025 |
| 12 | `U67110KA2022PTC164993` | HAPPI-CRED SOLUTIONS PRIVATE LIMITED | Jp Nagar | 560078 |
| 13 | `U85300KA2022PTC164995` | TOTALCURE HEALTH SERVICES PRIVATE LIMITED | Kalyan Nagar | 560043 |
| 14 | `U63030KA2022PTC164996` | SUYATRI COMMUNITY TOURISM PRIVATE LIMITED | Kengeri | 560074 |
| 15 | `U51909KA2022PTC164997` | AAGNA REDEFINE MERCHANDISING SOLUTIONS PRIVATE LIMITED | Mahalakshmipuram | 560086 |
| 16 | `U80902KA2022PTC164999` | AKADEME EDIFY TECH SOLUTIONS PRIVATE LIMITED | Kalyan Nagar | 560043 |
| 17 | `U29100KA2022PTC165000` | AUXO LIFTS PRIVATE LIMITED | Doddakallasandra | 560062 |
| 18 | `U72200KA2022PTC165001` | BLUTECH CONSULTING AND TECHNOLOGIES PRIVATE LIMITED | Yelahanka | 560064 |
| 19 | `U74999KA2022PTC165002` | ADMIRAL INDUSTRIES PRIVATE LIMITED | Bannerghatta Road | 560076 |
| 20 | `U51909KA2022PTC165003` | DVIDIPTA EXPORTS PRIVATE LIMITED | Nandini Layout | 560096 |

## Industry Distribution (Valid Candidates)

| Industry | Count |
|---|---|
| SaaS / Tech Services | 31 |
| EdTech & Consumer Services | 14 |
| E-Commerce & Retail | 5 |
| PropTech | 4 |
| Real Estate & Infrastructure | 3 |
| Hardware & Manufacturing | 3 |
| Manufacturing (Metals And Chemicals, And Products Thereof) | 3 |
| Logistics & Mobility | 3 |
| FinTech | 3 |
| Manufacturing (Paper And Paper Products, Publishing, Printingand Reproduction Of Recorded Media) | 2 |
| Manufacturing (Others) | 2 |
| Manufacturing (Food Stuffs) | 2 |
| Manufacturing (Wood Products) | 1 |
| Electricity, Gas And Water Companies | 1 |

## Locality Distribution (Valid Candidates)

| Locality | Count |
|---|---|
| Yelahanka | 5 |
| Koramangala | 4 |
| Bengaluru | 4 |
| Kalyan Nagar | 4 |
| Whitefield | 4 |
| Bommanahalli | 3 |
| Rajarajeshwari Nagar | 3 |
| MG Road | 3 |
| Yelahanka New Town | 2 |
| Rajajinagar | 2 |
| Indiranagar | 2 |
| HSR Layout Sector 1-7 | 2 |
| Museum Road | 2 |
| Peenya | 2 |
| JP Nagar 1st-6th Phase | 2 |
| Hsr Layout | 2 |
| Kengeri | 2 |
| Lavelle Road | 1 |
| Banashankari | 1 |
| Mahadevapura | 1 |
| Doddakallasandra | 1 |
| Chickpet | 1 |
| Jp Nagar | 1 |
| Viswaneedam | 1 |
| Rt Nagar | 1 |
| Hsr | 1 |
| RT Nagar | 1 |
| Gokula Extension | 1 |
| Jayanagar | 1 |
| Basaveshwaranagar | 1 |
| Kammanahalli | 1 |
| Electronic City Phase 1 | 1 |
| Nandini Layout | 1 |
| Sanjayanagar | 1 |
| GM Palya | 1 |
| Marathahalli | 1 |
| Hebbal | 1 |
| Vijayanagar | 1 |
| Vimanapura | 1 |
| Btm Layout | 1 |
| Varthur | 1 |
| AECS Layout | 1 |
| HBR Layout | 1 |
| Kathriguppe | 1 |
| Ramamurthy Nagar | 1 |
| Hanumanthnagar | 1 |
