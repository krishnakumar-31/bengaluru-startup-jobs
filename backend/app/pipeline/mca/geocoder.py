import json
import logging
import re
import time
import urllib.parse
import urllib.request
from typing import Dict, Optional, Tuple
from app.pipeline.config import (
    BENGALURU_LAT_MAX,
    BENGALURU_LAT_MIN,
    BENGALURU_LNG_MAX,
    BENGALURU_LNG_MIN,
)

logger = logging.getLogger(__name__)

# Comprehensive Bengaluru PIN Code Centroid Database
# Standard PIN codes across Greater Bengaluru (BBMP, Bangalore Urban, Electronics City, Whitefield)
BENGALURU_PINCODE_CENTROIDS: Dict[str, Tuple[float, float, str]] = {
    "560001": (12.9784, 77.6015, "MG Road / Central Business District"),
    "560002": (12.9647, 77.5760, "Chickpet / City Market"),
    "560003": (13.0031, 77.5643, "Malleshwaram"),
    "560004": (12.9421, 77.5753, "Basavanagudi"),
    "560005": (12.9912, 77.6134, "Frazer Town / Pulikeshi Nagar"),
    "560008": (12.9817, 77.6285, "Ulsoor / Halasuru"),
    "560010": (12.9898, 77.5542, "Rajajinagar"),
    "560011": (12.9299, 77.5833, "Jayanagar"),
    "560016": (13.0076, 77.6698, "Ramamurthy Nagar"),
    "560017": (12.9559, 77.6632, "Vimanapura / HAL"),
    "560018": (12.9575, 77.5512, "Chamrajpet"),
    "560019": (12.9416, 77.5617, "Hanumanthnagar"),
    "560020": (12.9918, 77.5772, "Seshadripuram"),
    "560021": (12.9956, 77.5654, "Srirampuram"),
    "560022": (13.0238, 77.5529, "Yeshwanthpur"),
    "560024": (13.0359, 77.5970, "Hebbal"),
    "560025": (12.9698, 77.6074, "Museum Road / Richmond Town"),
    "560026": (12.9538, 77.5385, "Kaval Byrasandra / Deepanjali Nagar"),
    "560027": (12.9612, 77.5961, "Shanti Nagar"),
    "560029": (12.9344, 77.6101, "Tavarekere / Adugodi"),
    "560030": (12.9392, 77.6052, "Adugodi / Dairy Circle"),
    "560032": (13.0245, 77.5912, "RT Nagar"),
    "560034": (12.9345, 77.6258, "Koramangala 4th Block"),
    "560036": (13.0039, 77.6912, "KR Puram"),
    "560037": (12.9591, 77.6974, "Marathahalli / Kundalahalli / AECS"),
    "560038": (12.9719, 77.6412, "Indiranagar"),
    "560040": (12.9716, 77.5350, "Vijayanagar"),
    "560041": (12.9234, 77.5912, "Jayanagar 9th Block"),
    "560042": (12.9867, 77.6212, "Halasuru Bazar"),
    "560043": (13.0163, 77.6582, "Kalyan Nagar / HRBR Layout / Banaswadi"),
    "560047": (12.9621, 77.6134, "Austin Town / Neelasandra"),
    "560048": (12.9922, 77.6974, "Mahadevapura / Hoodi"),
    "560049": (13.0212, 77.7123, "Virgonagar / Battarahalli"),
    "560050": (12.9387, 77.5512, "Ashoknagar / Banashankari"),
    "560051": (12.9876, 77.6012, "Shivajinagar"),
    "560052": (12.9854, 77.5876, "Vasanth Nagar"),
    "560053": (12.9712, 77.5789, "Chikpete / Balepete"),
    "560054": (13.0298, 77.5456, "Gokula Extension / Mathikere"),
    "560055": (13.0028, 77.5562, "Industrial Suburb / Rajajinagar"),
    "560056": (12.9612, 77.5012, "Bangalore University / Jnana Bharati"),
    "560058": (13.0285, 77.5195, "Peenya 2nd Stage / Industrial Area"),
    "560060": (12.9123, 77.4912, "Kengeri Satellite Town"),
    "560061": (12.9023, 77.5412, "Subramanyapura / Uttarahalli"),
    "560062": (12.8841, 77.5562, "Doddakallasandra / Konanakunte"),
    "560064": (13.1007, 77.5963, "Yelahanka New Town"),
    "560066": (12.9698, 77.7499, "Whitefield"),
    "560067": (13.0012, 77.7612, "Kadugodi / Whitefield"),
    "560068": (12.9063, 77.6186, "Bommanahalli / Madiwala / BG Road"),
    "560070": (12.9255, 77.5468, "Banashankari 2nd Stage"),
    "560071": (12.9621, 77.6412, "Domlur"),
    "560072": (12.9812, 77.5123, "Nagarbhavi"),
    "560073": (13.0512, 77.4912, "Bagalakunte / Nagasandra"),
    "560074": (12.9176, 77.4837, "Kengeri"),
    "560075": (12.9734, 77.6612, "CV Raman Nagar / Kaggadasapura"),
    "560076": (12.8913, 77.5976, "Bannerghatta Road / Bilekahalli / Hulimavu"),
    "560077": (13.0358, 77.6324, "HBR Layout / Nagawara"),
    "560078": (12.9081, 77.5959, "JP Nagar 1st-6th Phase"),
    "560079": (12.9876, 77.5312, "Basaveshwaranagar"),
    "560083": (12.8456, 77.5912, "Bannerghatta / Gottigere"),
    "560084": (13.0012, 77.6212, "Frazer Town East"),
    "560085": (12.9312, 77.5412, "Kathriguppe / Banashankari 3rd Stage"),
    "560086": (13.0116, 77.5441, "Mahalakshmipuram / West of Chord Road"),
    "560087": (12.9412, 77.7123, "Varthur"),
    "560090": (13.0612, 77.5212, "Chikkabanavara"),
    "560091": (12.9912, 77.4812, "Viswaneedam / Magadi Road"),
    "560092": (13.0612, 77.5812, "Sahakar Nagar"),
    "560093": (12.9812, 77.6612, "GM Palya / Byrasandra"),
    "560094": (13.0412, 77.5712, "Sanjayanagar"),
    "560095": (12.9352, 77.6245, "Koramangala 8th Block / ST Bed"),
    "560096": (13.0142, 77.5318, "Nandini Layout"),
    "560097": (13.0712, 77.5312, "Vidyaranyapura"),
    "560098": (12.9112, 77.5112, "Rajarajeshwari Nagar"),
    "560099": (12.8212, 77.6812, "Bommasandra Industrial Area"),
    "560100": (12.8452, 77.6602, "Electronic City Phase 1"),
    "560102": (12.9121, 77.6446, "HSR Layout Sector 1-7"),
    "560103": (12.9260, 77.6762, "Bellandur / Outer Ring Road / Devarabisanahalli"),
    "560104": (13.0112, 77.5112, "Peenya 1st Stage"),
    "560105": (12.8212, 77.6512, "Electronic City Phase 2"),
}

# Major Bengaluru Startup Clusters Centroids
BENGALURU_LOCALITY_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "koramangala": (12.9352, 77.6245),
    "hsr layout": (12.9121, 77.6446),
    "indiranagar": (12.9719, 77.6412),
    "bellandur": (12.9260, 77.6762),
    "whitefield": (12.9698, 77.7499),
    "electronic city": (12.8452, 77.6602),
    "jp nagar": (12.9081, 77.5959),
    "jayanagar": (12.9299, 77.5833),
    "malleshwaram": (13.0031, 77.5643),
    "rajajinagar": (12.9898, 77.5542),
    "marathahalli": (12.9591, 77.6974),
    "outer ring road": (12.9260, 77.6762),
    "manyata tech park": (13.0489, 77.6200),
    "hebbal": (13.0359, 77.5970),
    "yelahanka": (13.1007, 77.5963),
    "kalyan nagar": (13.0163, 77.6582),
    "hrbr layout": (13.0163, 77.6582),
    "hbr layout": (13.0358, 77.6324),
    "peenya": (13.0285, 77.5195),
    "yeshwanthpur": (13.0238, 77.5529),
    "vijayanagar": (12.9716, 77.5350),
    "kengeri": (12.9176, 77.4837),
    "bannerghatta road": (12.8913, 77.5976),
    "lavelle road": (12.9712, 77.5976),
    "domlur": (12.9621, 77.6412),
    "cv raman nagar": (12.9734, 77.6612),
    "mahadevapura": (12.9922, 77.6974),
    "btm layout": (12.9166, 77.6101),
    "basavanagudi": (12.9421, 77.5753),
    "sadashivanagar": (13.0068, 77.5812),
    "richmond town": (12.9647, 77.6074),
    "mg road": (12.9784, 77.6015),
    "central business district": (12.9784, 77.6015),
    "nandini layout": (13.0142, 77.5318),
    "mahalakshmipuram": (13.0116, 77.5441),
}


class BengaluruGeocoder:
    """Production geocoder for Bengaluru tech startups.

    Combines:
    1. In-memory and persistent resolution cache
    2. Nominatim OpenStreetMap queries (rate-limited to 1 req/sec)
    3. High-precision postal code and locality centroid fallback directory
    4. Strict Greater Bengaluru bounding box coordinate validation
    """

    def __init__(self, cache_file: Optional[str] = None, use_online: bool = True):
        self.cache_file = cache_file
        self.use_online = use_online
        self.cache: Dict[str, Tuple[float, float, str, str]] = {}
        self.last_online_request_time: float = 0.0

        if cache_file:
            self._load_cache()

    def _load_cache(self) -> None:
        if not self.cache_file:
            return
        try:
            with open(self.cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for k, v in data.items():
                    self.cache[k] = (v[0], v[1], v[2], v[3])
        except (FileNotFoundError, json.JSONDecodeError):
            self.cache = {}

    def _save_cache(self) -> None:
        if not self.cache_file:
            return
        try:
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to persist geocode cache: {e}")

    def is_within_bounds(self, lat: float, lng: float) -> bool:
        """Validate if coordinate falls strictly within Greater Bengaluru urban bounds."""
        return (
            BENGALURU_LAT_MIN <= lat <= BENGALURU_LAT_MAX
            and BENGALURU_LNG_MIN <= lng <= BENGALURU_LNG_MAX
        )

    def geocode(
        self,
        locality: Optional[str] = None,
        postal_code: Optional[str] = None,
        address: Optional[str] = None,
    ) -> Tuple[float, float, str, str]:
        """Geocode an address into latitude, longitude, resolution source, and confidence score.

        Returns:
            (latitude, longitude, source_method, confidence_level)
        """
        clean_pin = re.sub(r"[^\d]", "", str(postal_code or "")).strip()[:6]
        norm_locality = (locality or "").strip().lower()

        cache_key = f"{norm_locality}|{clean_pin}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        # 1. Attempt Online Nominatim Geocoding if enabled and locality/pincode provided
        if self.use_online and (norm_locality or clean_pin):
            try:
                coords = self._query_nominatim(norm_locality, clean_pin)
                if coords:
                    lat, lng = coords
                    if self.is_within_bounds(lat, lng):
                        res = (lat, lng, "nominatim_osm", "high")
                        self.cache[cache_key] = res
                        self._save_cache()
                        return res
            except Exception as e:
                logger.debug(f"Nominatim lookup skipped or failed: {e}")

        # 2. Match Locality Directory
        for known_loc, coords in BENGALURU_LOCALITY_CENTROIDS.items():
            if known_loc in norm_locality or (norm_locality and norm_locality in known_loc):
                lat, lng = coords
                res = (lat, lng, "locality_centroid", "high")
                self.cache[cache_key] = res
                self._save_cache()
                return res

        # 3. Match PIN Code Centroid Database
        if clean_pin in BENGALURU_PINCODE_CENTROIDS:
            lat, lng, _ = BENGALURU_PINCODE_CENTROIDS[clean_pin]
            res = (lat, lng, "pincode_centroid", "medium")
            self.cache[cache_key] = res
            self._save_cache()
            return res

        # 4. Fallback Default to Central Bengaluru (MG Road / Vidhana Soudha)
        default_lat, default_lng = (12.9784, 77.6015)
        res = (default_lat, default_lng, "bengaluru_default_centroid", "low")
        self.cache[cache_key] = res
        self._save_cache()
        return res

    def _query_nominatim(self, locality: str, pincode: str) -> Optional[Tuple[float, float]]:
        """Query Nominatim with rate limiting (1.1s delay) and custom User-Agent."""
        # Enforce rate limit
        elapsed = time.time() - self.last_online_request_time
        if elapsed < 1.1:
            time.sleep(1.1 - elapsed)

        query_parts = []
        if locality:
            query_parts.append(locality)
        if pincode and pincode.startswith("560"):
            query_parts.append(pincode)
        query_parts.append("Bengaluru, Karnataka, India")

        query_str = ", ".join(query_parts)
        params = urllib.parse.urlencode({
            "q": query_str,
            "format": "json",
            "limit": 1,
            "countrycodes": "in",
        })
        url = f"https://nominatim.openstreetmap.org/search?{params}"

        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "BengaluruStartupJobs-Pipeline/1.0 (contact@bengalurustartupjobs.in)",
                "Accept": "application/json",
            },
        )

        try:
            self.last_online_request_time = time.time()
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and isinstance(data, list) and len(data) > 0:
                    lat = float(data[0]["lat"])
                    lng = float(data[0]["lon"])
                    return lat, lng
        except Exception:
            return None

        return None
