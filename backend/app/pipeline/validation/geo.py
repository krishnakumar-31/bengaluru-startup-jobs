from typing import List, Optional, Tuple
from app.pipeline.config import (
    BENGALURU_LAT_MAX,
    BENGALURU_LAT_MIN,
    BENGALURU_LNG_MAX,
    BENGALURU_LNG_MIN,
    BENGALURU_PINCODE_PATTERN,
    KNOWN_BENGALURU_LOCALITIES,
    VALID_CITY_NAMES,
    VALID_STATE_NAMES,
)
from app.pipeline.models import ValidationIssue


def validate_bengaluru_coordinates(
    latitude: Optional[float], longitude: Optional[float], field_prefix: str = "office"
) -> Tuple[bool, List[ValidationIssue]]:
    """Validate that coordinates exist, are valid floating point numbers,

    and fall strictly within the Bengaluru urban/metropolitan bounding box.
    """
    issues: List[ValidationIssue] = []

    if latitude is None or longitude is None:
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.coordinates",
                message="Both latitude and longitude are required for verified Bengaluru startup offices.",
            )
        )
        return False, issues

    # Global range check
    if not (-90.0 <= latitude <= 90.0):
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.latitude",
                message=f"Latitude {latitude} is outside valid geographic range [-90.0, 90.0].",
            )
        )

    if not (-180.0 <= longitude <= 180.0):
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.longitude",
                message=f"Longitude {longitude} is outside valid geographic range [-180.0, 180.0].",
            )
        )

    if issues:
        return False, issues

    # Bengaluru bounding box check
    if not (BENGALURU_LAT_MIN <= latitude <= BENGALURU_LAT_MAX):
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.latitude",
                message=(
                    f"Latitude {latitude} falls outside the Bengaluru metropolitan boundary "
                    f"[{BENGALURU_LAT_MIN}, {BENGALURU_LAT_MAX}]."
                ),
            )
        )

    if not (BENGALURU_LNG_MIN <= longitude <= BENGALURU_LNG_MAX):
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.longitude",
                message=(
                    f"Longitude {longitude} falls outside the Bengaluru metropolitan boundary "
                    f"[{BENGALURU_LNG_MIN}, {BENGALURU_LNG_MAX}]."
                ),
            )
        )

    return len(issues) == 0, issues


def validate_bengaluru_postal_code(
    postal_code: Optional[str], field_prefix: str = "office"
) -> Tuple[bool, List[ValidationIssue]]:
    """Validate that the postal code conforms to standard Bengaluru PIN code format (560xxx)."""
    issues: List[ValidationIssue] = []
    if not postal_code or not str(postal_code).strip():
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.postal_code",
                message="Postal code is required for office location verification.",
            )
        )
        return False, issues

    cleaned_pincode = str(postal_code).strip()
    if not BENGALURU_PINCODE_PATTERN.match(cleaned_pincode):
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.postal_code",
                message=(
                    f"Invalid Bengaluru postal code '{cleaned_pincode}'. "
                    "Bengaluru PIN codes must be 6 digits starting with '560' (e.g., 560034)."
                ),
            )
        )
        return False, issues

    return True, []


def validate_bengaluru_locality(
    locality: Optional[str], field_prefix: str = "office"
) -> Tuple[bool, List[ValidationIssue], str]:
    """Validate that the locality is specified and matches or maps to a known Bengaluru hub or area."""
    issues: List[ValidationIssue] = []
    if not locality or not str(locality).strip():
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.locality",
                message="Office locality (e.g., Koramangala, Indiranagar, HSR Layout) is required.",
            )
        )
        return False, issues, ""

    cleaned = str(locality).strip()
    normalized = cleaned.lower()

    # Direct match or partial containment check with known localities
    matched = normalized in KNOWN_BENGALURU_LOCALITIES
    if not matched:
        # Check if any known locality is a substring of the input or vice versa
        for known in KNOWN_BENGALURU_LOCALITIES:
            if known in normalized or normalized in known:
                matched = True
                break

    if not matched:
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.locality",
                message=(
                    f"Locality '{cleaned}' could not be verified as a recognized Bengaluru startup cluster or hub."
                ),
                severity="warning",
            )
        )

    return len(issues) == 0, issues, cleaned


def validate_bengaluru_city_and_state(
    city: Optional[str], state: Optional[str], field_prefix: str = "office"
) -> Tuple[bool, List[ValidationIssue], str, str]:
    """Validate city (Bengaluru / Bangalore) and state (Karnataka)."""
    issues: List[ValidationIssue] = []

    norm_city = str(city or "").strip().lower()
    norm_state = str(state or "").strip().lower()

    if not norm_city or norm_city not in VALID_CITY_NAMES:
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.city",
                message=f"City must be Bengaluru / Bangalore (got '{city}').",
            )
        )

    if not norm_state or norm_state not in VALID_STATE_NAMES:
        issues.append(
            ValidationIssue(
                field=f"{field_prefix}.state",
                message=f"State must be Karnataka (got '{state}').",
            )
        )

    return len(issues) == 0, issues, "Bengaluru", "Karnataka"
