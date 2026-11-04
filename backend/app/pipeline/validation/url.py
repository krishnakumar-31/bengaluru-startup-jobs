from typing import List, Optional, Tuple
from urllib.parse import urlparse
from app.pipeline.models import ValidationIssue


def validate_web_url(
    url: Optional[str],
    field_name: str,
    required: bool = True,
    allow_localhost: bool = False,
) -> Tuple[bool, List[ValidationIssue], Optional[str]]:
    """Validate that the given URL is a syntactically valid HTTP or HTTPS web address."""
    issues: List[ValidationIssue] = []

    if not url or not str(url).strip():
        if required:
            issues.append(
                ValidationIssue(
                    field=field_name,
                    message=f"{field_name} is required and cannot be empty.",
                )
            )
            return False, issues, None
        return True, [], None

    cleaned_url = str(url).strip()

    try:
        parsed = urlparse(cleaned_url)
    except Exception as e:
        issues.append(
            ValidationIssue(
                field=field_name,
                message=f"Failed to parse URL '{cleaned_url}': {str(e)}",
            )
        )
        return False, issues, None

    if parsed.scheme.lower() not in {"http", "https"}:
        issues.append(
            ValidationIssue(
                field=field_name,
                message=f"URL scheme must be http or https (got '{parsed.scheme}://').",
            )
        )

    if not parsed.netloc:
        issues.append(
            ValidationIssue(
                field=field_name,
                message=f"URL '{cleaned_url}' is missing a valid domain name or hostname.",
            )
        )

    # In production data collection, reject fake localhost/example URLs
    hostname = (parsed.hostname or "").lower()
    if not allow_localhost and hostname in {"localhost", "127.0.0.1", "0.0.0.0"}:
        issues.append(
            ValidationIssue(
                field=field_name,
                message=f"URL '{cleaned_url}' points to local loopback; valid public domain required.",
            )
        )

    if issues:
        return False, issues, None

    normalized_url = parsed.geturl()
    return True, [], normalized_url
