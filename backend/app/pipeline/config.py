import re
from typing import Set

# Bengaluru Municipal & Urban Metropolitan Geographic Bounding Box
# Encompasses BBMP, Electronic City, Whitefield, Yelahanka, Kengeri, and Sarjapur/ORR corridor.
BENGALURU_LAT_MIN = 12.70
BENGALURU_LAT_MAX = 13.25
BENGALURU_LNG_MIN = 77.35
BENGALURU_LNG_MAX = 77.85

# Bengaluru Postal Code format: Starts with 560 followed by 3 digits (e.g. 560034, 560103)
BENGALURU_PINCODE_PATTERN = re.compile(r"^560\d{3}$")

# Recognized Bengaluru Tech Hubs & Startup Localities
KNOWN_BENGALURU_LOCALITIES: Set[str] = {
    "koramangala",
    "hsr layout",
    "hsr",
    "indiranagar",
    "bellandur",
    "outer ring road",
    "outer ring road (orr)",
    "orr",
    "whitefield",
    "electronic city",
    "electronic city phase 1",
    "electronic city phase 2",
    "jp nagar",
    "jayanagar",
    "domlur",
    "mg road",
    "central business district",
    "cbd",
    "malleshwaram",
    "banashankari",
    "rajajinagar",
    "richmond town",
    "marathahalli",
    "hebbal",
    "yelahanka",
    "manyata tech park",
    "cv raman nagar",
    "kadubeesanahalli",
    "mahadevapura",
    "btm layout",
    "btm",
    "sadashivanagar",
    "basavanagudi",
    "ulsoor",
    "halasuru",
    "vasanth nagar",
    "frazer town",
    "pulikeshi nagar",
    "brookefield",
    "hoodi",
    "sarjapur road",
    "sarjapur",
    "devarabisanahalli",
    "adugodi",
    "ejipura",
    "tavarekere",
    "shanthi nagar",
    "lavelle road",
    "church street",
    "residency road",
    "cunningham road",
    "millers road",
    "bannerghatta road",
    "kalyan nagar",
    "kammanahalli",
    "rt nagar",
    "kr puram",
}

# Accepted City Names (normalized to Bengaluru)
VALID_CITY_NAMES: Set[str] = {
    "bengaluru",
    "bangalore",
    "bangalore urban",
    "bengaluru urban",
}

# Accepted State Names
VALID_STATE_NAMES: Set[str] = {
    "karnataka",
    "ka",
}

# Allowed Employment Types
ALLOWED_EMPLOYMENT_TYPES: Set[str] = {
    "full-time",
    "part-time",
    "contract",
    "internship",
}

# Standard Experience Levels
ALLOWED_EXPERIENCE_LEVELS: Set[str] = {
    "entry",
    "mid",
    "senior",
    "lead",
    "executive",
}

# Supported Currencies
ALLOWED_CURRENCIES: Set[str] = {
    "INR",
    "USD",
    "EUR",
    "GBP",
}
